import {getNextBlobId, BLOB_STATE} from '@natlibfi/melinda-record-import-commons';
import {promisify} from 'util';
import {pollMelindaRestApi} from '@natlibfi/melinda-rest-api-client';
import {handleBulkResult} from './handleBulkResult';
import createDebugLogger from 'debug';

const setTimeoutPromise = promisify(setTimeout);
const debug = createDebugLogger('@natlibfi/melinda-import-importer:startApp');

export async function startApp(config, riApiClient, melindaApiClient, transformedBlobHandler) {
  await logic();

  async function logic(wait = false) {
    if (wait) {
      await setTimeoutPromise(3000);
      return logic();
    }

    const {profileIds} = config;

    // Check if blobs
    debug(`Trying to find blobs for ${profileIds}`); // eslint-disable-line
    const processingBlobInfo = await getNextBlobId(riApiClient, {profileIds, state: BLOB_STATE.PROCESSING_BULK, importOfflinePeriod: config.importOfflinePeriod});
    if (!processingBlobInfo.blobId) {
      debug(`No blobs in ${BLOB_STATE.PROCESSING_BULK} found for ${profileIds}`);
      const transformedBlobInfo = await getNextBlobId(riApiClient, {profileIds, state: BLOB_STATE.TRANSFORMED});

      if (!transformedBlobInfo.blobId) {
        debug(`No blobs in ${BLOB_STATE.TRANSFORMED} found for ${profileIds}`);
        return logic(true);
      }

      // Handle blob to bulk
      debug(`Handling ${BLOB_STATE.TRANSFORMED} blob ${transformedBlobInfo.blobId}`);
      await transformedBlobHandler.startHandling(transformedBlobInfo.blobId);
      return logic();
    }

    // Poll bulk
    debug(`Handling ${BLOB_STATE.PROCESSING_BULK} blob ${processingBlobInfo.blobId}, correlationId: ${processingBlobInfo.correlationId}`);
    // get blob info from record-import-api
    const importResults = await pollResultHandling(melindaApiClient, rocessingBlobInfo.blobId, processingBlobInfo.correlationId);
    await handleBulkResult(riApiClient, processingBlobInfo.blobId, importResults);
    // Handle result
    return logic();
  }

  async function pollResultHandling(melindaApiClient, recordImportBlobId, melindaRestApiCorrelationId) {
    const metadata = await riApiClient.getBlobMetadata({id: recordImportBlobId});

    if (metadata.state === RECORD_IMPORT_STATE.ABORTED) {
      debug('Blob state is set to ABORTED. Stopping rest api');
      await melindaApiClient.setBulkStatus(melindaRestApiCorrelationId, 'ABORT');

      return logic();
    }

    const pollResults = await pollMelindaRestApi(melindaApiClient, melindaRestApiCorrelationId, true);
    const finalQueueItemStates = ['DONE', 'ERROR', 'ABORT'];

    if (finalQueueItemStates.includes(pollResults.queueItemState)) {
      debug(`Melinda rest api item has made to final state ${pollResults.queueItemState}`);

      return pollResults;
    }

    debug(`Current Melinda rest api item status: ${pollResults.queueItemState}, handled succesfully: ${pollMelindaRestApi.handledIds.length}, rejected: ${pollMelindaRestApi.rejectedIds.length}`);
    await setTimeoutPromise(1000);

    return pollResultHandling(melindaApiClient, recordImportBlobId, melindaRestApiCorrelationId);
  }
}
