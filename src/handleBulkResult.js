// {
//   "correlationId":"FOO",
//   "cataloger":"xxx0000",
//   "oCatalogerIn": "xxx0000",
//   "operation":"CREATE",
//   "queueItemState":"DONE",
//   "handledRecords": [
//    {"status": "CREATED", "melindaId":"001234567", "title": "example", "standardIdentifiers": ["978-952-373-345-9"], "sourceId": "(MALLI)0239734", "blobf001": "000000001"},
//    {"status": "UPDATED", "melindaId":"001234567", "title": "example", "standardIdentifiers": ["978-952-373-345-9"], "sourceId": "(MALLI)0239734", "blobf001": "001234567"}
//   ],
//   "rejectedRecords": [
//    {"status": "NOT_FOUND", "melindaId":"001234567", "title": "example", "standardIdentifiers": ["978-952-373-345-9"], "sourceId": "(MALLI)0239734", "blobf001": "001234567"},
//    {"status": "CONFLICT", "melindaId":"001234567", "message": "CAT-missmatch", "title": "example", "standardIdentifiers": ["978-952-373-345-9"], "sourceId": "(MALLI)0239734", "blobf001": "001234567"},
//    {"status": "ERROR", "message": "example", "title": "example", "standardIdentifiers": ["978-952-373-345-9"], "sourceId": "(MALLI)0239734", "blobf001": "001234567"},
//    {"status": "INVALID", "message": "example", "title": "example", "standardIdentifiers": ["978-952-373-345-9"], "sourceId": "(MALLI)0239734", "blobf001": "001234567"},
//    {"status": "UNPROCESSABLE_ENTITY", "message": "example", "title": "example", "standardIdentifiers": ["978-952-373-345-9"], "sourceId": "(MALLI)0239734", "blobf001": "001234567"},
//    {"status": "DUPLICATE", "title": "example", "standardIdentifiers": ["978-952-373-345-9"], "sourceId": "(MALLI)0239734", "blobf001": "001234567", "dublicateIds": ["001234567"]}
//   ],
//   "errorStatus": "",
//   "errorMessage": "",
// }

import {BLOB_STATE} from '@natlibfi/melinda-record-import-commons';
import createDebugLogger from 'debug';

const debug = createDebugLogger('@natlibfi/melinda-record-import-importer:handleBulkResults');

export async function handleBulkResult(riApiClient, blobId, bulkImportResults) {
  debug('handleBulkresult Begun');

  const {processingInfo} = await riApiClient.getBlobMetadata({id: blobId});
  const {importResults} = processingInfo;

  debug('handleBulkresult Processing records');
  const handledRecords = [...await processRecordData(bulkImportResults.handledRecords), ...await processRecordData(bulkImportResults.rejectedRecords)];

  if (importResults.queueItemState === 'ERROR') {
    await riApiClient.setAborted({id: blobId});
    return handledRecords;
  }

  await riApiClient.updateState({id: blobId, state: BLOB_STATE.PROCESSED});
  return handledRecords;

  async function processRecordData(recordsData, handledRecords = []) {
    const [handledRecord, ...rest] = recordsData;

    if (handledRecord === undefined) {
      return handledRecords;
    }

    const {status, melindaId = '', title, standardIdentifiers, sourceId, message = '', dublicateIds = []} = handledRecord;
    if (importResults.some(result => result.status === status && result.metadata.title === title)) {
      return processRecordData(rest, handledRecords);
    }

    const recordData = {
      status,
      metadata: {
        id: melindaId,
        title,
        standardIdentifiers,
        sourceId,
        message,
        dublicateIds
      }
    };

    debug(`Record data: ${JSON.stringify(recordData)}`);

    await riApiClient.setRecordProcessed({id: blobId, ...recordData});
    return processRecordData(rest, [...handledRecords, recordData]);
  }
}
