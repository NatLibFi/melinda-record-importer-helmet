import {getNextBlobId, BLOB_STATE} from '@natlibfi/melinda-record-import-commons';
import {promisify} from 'util';
import {pollMelindaRestApi} from '@natlibfi/melinda-rest-api-client';
import {handleBulkResult} from './handleBulkResult';
import handleTransformedBlob from './handleTransformedBlob';
import createDebugLogger from 'debug';

const setTimeoutPromise = promisify(setTimeout);
const debug = createDebugLogger('@natlibfi/melinda-import-importer:startApp');

export async function startApp(config, riApiClient, melindaApiClient, amqplib, wait) {
  if (wait) {
    await setTimeoutPromise(3000);
    return startApp(config, riApiClient, melindaApiClient);
  }

  // Check if blobs
  const processingBlobId = await getNextBlobId(riApiClient, {profileId: config.profileId, state: BLOB_STATE.PROCESSING_BULK});
  if (!processingBlobId) {
    debug(`No blobs in ${BLOB_STATE.PROCESSING_BULK} found for ${config.profileId}`);
    const transformedBlobId = await getNextBlobId(riApiClient, {profileId: config.profileId, state: BLOB_STATE.TRANSFORMED});

    if (!transformedBlobId) {
      debug(`No blobs in ${BLOB_STATE.TRANSFORMED} found for ${config.profileId}`);
      return startApp(config, riApiClient, melindaApiClient, true);
    }

    // Handle blob to bulk
    debug(`Handling ${BLOB_STATE.TRANSFORMED} blob ${transformedBlobId}`);
    await handleTransformedBlob(riApiClient, melindaApiClient, amqplib, {blobId: transformedBlobId, ...config});
    return startApp(config, riApiClient, melindaApiClient);
  }

  // Poll bulk
  debug(`Handling ${BLOB_STATE.PROCESSING_BULK} blob ${processingBlobId}`);
  const importResults = await pollMelindaRestApi(melindaApiClient, processingBlobId);
  await handleBulkResult(riApiClient, processingBlobId, importResults);
  // Handle result
  return startApp(config, riApiClient, melindaApiClient);
}
