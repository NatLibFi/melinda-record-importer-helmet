// {
//   "correlationId": "a109ab03-3645-4916-b5c6-4b80c7148c04",
//   "cataloger": "LOAD_IMP",
//   "oCatalogerIn": "LOAD-IMP",
//   "operation": "CREATE",
//   "operations": [
//     "CREATE"
//   ],
//   "operationSettings": {
//     "prio": false,
//     "noStream": true,
//     "noop": true,
//     "unique": true,
//     "merge": true,
//     "validate": true,
//     "failOnError": false
//   },
//   "contentType": "application/json",
//   "queueItemState": "DONE",
//   "importJobState": {
//     "CREATE": "EMPTY",
//     "UPDATE": "EMPTY"
//   },
//   "creationTime": "2022-04-04T14:03:24.841Z",
//   "modificationTime": "2022-04-04T14:04:02.314Z",
//   "records": [
//     {
//       "melindaId": "000000000",
//       "recordMetadata": {
//         "sourceId": "(FI-MELINDA)000999998",
//         "blobSequence": 1,
//         "title": "Punokset puikoille",
//         "standardIdentifiers": [
//           "978-951-692-678-3",
//           "A1258209"
//         ]
//       },
//       "status": "CONFLICT",
//       "message": "Modification history mismatch (CAT)"
//     },

import {BLOB_STATE} from '@natlibfi/melinda-record-import-commons';
import createDebugLogger from 'debug';

const debug = createDebugLogger('@natlibfi/melinda-record-import-importer:handleBulkResults');

export async function handleBulkResult(riApiClient, blobId, bulkImportResults) {
  debug('handleBulkresult Begun');

  const {processingInfo} = await riApiClient.getBlobMetadata({id: blobId});
  const {importResults} = processingInfo;

  debug('handleBulkresult Processing records');
  const records = await processRecordData(bulkImportResults.records);

  if (importResults.queueItemState === 'ERROR') {
    await riApiClient.setAborted({id: blobId});
    return records;
  }

  await riApiClient.updateState({id: blobId, state: BLOB_STATE.PROCESSED});
  return records;

  async function processRecordData(recordsData, handledRecords = []) {
    const [record, ...rest] = recordsData;

    if (record === undefined) {
      return handledRecords;
    }

    const recordData = recordDataBuilder(record);
    // To be done remove queued item from blob

    if (importResults.some(result => result.status === recordData.status && result.metadata.title === recordData.metadata.title)) {
      return processRecordData(rest, handledRecords);
    }

    debug(`Record data: ${JSON.stringify(recordData)}`);

    await riApiClient.setRecordProcessed({id: blobId, ...recordData});
    return processRecordData(rest, [...handledRecords, recordData]);
  }

  function recordDataBuilder(record) {
    const {status, message, dublicateIds, melindaId, recordMetadata = {}} = record;
    const {sourceId, title, standardIdentifiers} = recordMetadata;

    const metadata = {
      id: melindaId,
      title,
      standardIdentifiers,
      sourceId,
      message
    };

    // eslint-disable-next-line functional/immutable-data
    Object.keys(metadata).forEach(key => metadata[key] === undefined && delete metadata[key]);

    if (dublicateIds) {
      return {status, dublicateIds, metadata};
    }

    return {status, metadata};
  }
}
