import {processBlobs, isOfflinePeriod, BLOB_STATE} from '@natlibfi/melinda-record-import-commons';
import {createLogger} from '@natlibfi/melinda-backend-commons';
import {promisify} from 'util';
import {pollMelindaRestApi} from './pollMelindaRestApi';
import {handleBulkResult} from './handleBulkResult';
import handleTransformedBlob from './handleTransformedBlob';

const setTimeoutPromise = promisify(setTimeout);
const logger = createLogger();

export async function startApp(config, riApiClient, melindaApiClient, amqplib, wait) {
  if (wait) {
    await setTimeoutPromise(3000);
    return startApp(config, riApiClient, melindaApiClient);
  }

  // Check if blobs
  const processingBlobId = await checkProcessingBlobs(riApiClient, config.profileId);
  if (!processingBlobId) {
    const transformedBlobId = await checkTransformedBlobs(riApiClient, config.profileId);
    // Handle blob to bulk
    if (transformedBlobId !== false) {
      // import
      await handleTransformedBlob(riApiClient, melindaApiClient, amqplib, {blobId: transformedBlobId, ...config});
      return startApp(config, riApiClient, melindaApiClient);
    }

    return startApp(config, riApiClient, melindaApiClient, true);
  }

  // Poll bulk
  const importResults = await pollMelindaRestApi(melindaApiClient, processingBlobId);
  await handleBulkResult(riApiClient, processingBlobId, importResults);
  // Handle result
  return startApp(config, riApiClient, melindaApiClient);

  async function checkProcessingBlobs(riApiClient, profileId) {
    logger.log('debug', 'Checking transformed blobs');
    let result = ''; // eslint-disable-line functional/no-let

    try {
      result = await processBlobs({
        client: riApiClient,
        query: {state: BLOB_STATE.PROCESSING_BULK},
        processCallback,
        messageCallback: () => `${profileId} has blob in processing`,
        filter: (blob) => blob.profileId === profileId
      });

      // Returns false or blob id
      return result;
    } catch (err) {
      logger.error(err);
    }
  }


  async function checkTransformedBlobs(riApiClient, profileId) {
    logger.log('debug', 'Checking transformed blobs');
    let result = ''; // eslint-disable-line functional/no-let

    try {
      result = await processBlobs({
        client: riApiClient,
        query: {state: BLOB_STATE.TRANSFORMED},
        processCallback,
        messageCallback: count => `${profileId} has ${count} blobs have records waiting to be processed`,
        filter: (blob) => blob.profileId === profileId
      });

      // Returns false or blob id
      return result;
    } catch (err) {
      logger.error(err);
    }
  }

  function processCallback(blobs) {
    const [blob] = blobs;

    if (blob === undefined || isOfflinePeriod(config.importOfflinePeriod)) {
      logger.debug('No blobs or offline period');
      return false;
    }

    const {id} = blob;

    return id;
  }
}
