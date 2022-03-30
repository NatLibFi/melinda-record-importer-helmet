import httpStatus from 'http-status';
import {MarcRecord} from '@natlibfi/marc-record';
import {getRecordTitle, getRecordStandardIdentifiers} from '@natlibfi/melinda-commons/';
import {closeAmqpResources, RECORD_IMPORT_STATE, BLOB_STATE} from '@natlibfi/melinda-record-import-commons';
import createDebugLogger from 'debug';


export default function (riApiClient, melindaApiClient, amqplib, {amqpUrl, noopProcessing, noopMelindaImport}) {
  const debug = createDebugLogger('@natlibfi/melinda-record-import-importer:handleTransformedBlob');

  return {startHandling};

  async function startHandling(blobId) {
    let connection; // eslint-disable-line functional/no-let
    let channel; // eslint-disable-line functional/no-let

    connection = await amqplib.connect(amqpUrl); // eslint-disable-line prefer-const
    channel = await connection.createChannel(); // eslint-disable-line prefer-const
    debug('Amqp connected!');

    const {correlationId, queueItemState} = await getAndSetCorrelationId(blobId);

    try {
      if (queueItemState === 'WAITING_FOR_RECORDS') {
        const {messageCount} = await channel.assertQueue(blobId, {durable: true});
        debug(`Starting consuming records of blob ${blobId}, Sending ${messageCount} records to ${correlationId} bulk queue.`);

        await consume(correlationId);

        debug('Queued all messages.');

        await closeAmqpResources({connection, channel});
        await melindaApiClient.setBulkStatus(correlationId, 'PENDING_VALIDATION');
        return riApiClient.updateState({id: blobId, state: BLOB_STATE.PROCESSING_BULK});
      }

      debug(`Bulk state: ${queueItemState}, moving to poll phase`);
      await closeAmqpResources({connection, channel});
      return riApiClient.updateState({id: blobId, state: BLOB_STATE.PROCESSING_BULK});
    } catch (error) {
      throw new Error(error);
    }

    async function getAndSetCorrelationId(id) {
      const {correlationId} = await riApiClient.getBlobMetadata({id});

      if (correlationId !== '') {
        return melindaApiClient.getBulkState(correlationId);
      }

      debug('Creating new bulk item to Melinda rest api');
      // Create bulk to melinda rest api
      const response = await melindaApiClient.creteBulkNoStream('application/json', {unique: 1, noop: noopMelindaImport, pOldNew: 'NEW', pActiveLibrary: 'FIN01'});
      debug(`Bulk response: ${JSON.stringify(response)}`);
      // setCorrelationId to blob in record import rest api
      await riApiClient.setCorrelationId({id, correlationId: response.correlationId});
      return response;
    }

    async function consume(correlationId) {
      const message = await channel.get(blobId);

      if (message) {
        debug(`Message received`);

        const metadata = await riApiClient.getBlobMetadata({id: blobId});

        if (metadata.state === RECORD_IMPORT_STATE.ABORTED) {
          debug('Blob state is set to ABORTED. Ditching message');
          await channel.nack(message, false, false);
          return consume(correlationId);
        }

        try {
          const {status, metadata} = await handleMessage(message, correlationId);
          debug(`Queuing result: ${JSON.stringify(status)}`);
          if (status === RECORD_IMPORT_STATE.ERROR) {
            await channel.nack(message);
            return consume(correlationId);
          }

          await riApiClient.setRecordQueued({id: blobId, ...metadata});
          await channel.ack(message);
          return consume(correlationId);
        } catch (err) {
          await channel.nack(message);
          throw err;
        }
      }
    }

    async function handleMessage(message, correlationId) {
      const record = new MarcRecord(JSON.parse(message.content.toString()), {subfieldValues: false});
      const title = await getRecordTitle(record);
      const standardIdentifiers = await getRecordStandardIdentifiers(record);
      debug(`Record data to be sent to queue: Title: ${title}, identifiers: ${standardIdentifiers} to Bulk ${correlationId}`);
      const recordObject = record.toObject();
      debug(JSON.stringify(recordObject));

      if (noopProcessing) {
        debug('NOOP set. Not importing anything');
        return {status: RECORD_IMPORT_STATE.SKIPPED, metadata: {title, standardIdentifiers}};
      }

      try {
        debug('Sending record to Melinda rest api queue...');
        const response = await melindaApiClient.sendRecordToBulk(recordObject, correlationId, 'application/json');
        debug(`Record sent to queue ${correlationId}`);

        if (response) {
          return {status: RECORD_IMPORT_STATE.QUEUED, metadata: {title, standardIdentifiers}};
        }

        return {status: RECORD_IMPORT_STATE.ERROR, metadata: {title, standardIdentifiers}};
      } catch (error) {
        if (error.status) {
          if (error.status === httpStatus.CONFLICT) {
            debug('Got expected conflict response (409)');
            throw error;
          }

          if (error.status === httpStatus.UNPROCESSABLE_ENTITY) {
            debug('Got expected unprosessable entity response');
            return {status: RECORD_IMPORT_STATE.INVALID, metadata: {validationMessages: error.payload, title, standardIdentifiers}};
          }

          debug('Unexpected error occured in rest api. Restarting importter!');
          throw new Error(`Melinda REST API error: ${error.status} ${error.payload || ''}`);
        }

        throw error;
      }
    }
  }
}

