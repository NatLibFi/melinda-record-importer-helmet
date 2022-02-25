import {READERS} from '@natlibfi/fixura';
import amqplib from '@onify/fake-amqplib';
import generateTests from '@natlibfi/fixugen-http-client';
import handleTransformedBlob from './handleTransformedBlob';
import createDebugLogger from 'debug';
import {createApiClient as createRecordImportApiClient} from '@natlibfi/melinda-record-import-commons';
import {createApiClient as createMelindaApiClient} from '@natlibfi/melinda-rest-api-client';

const debug = createDebugLogger('@natlibfi/melinda-import-importer:handleTransformedBlob:test');
const riApiClient = createRecordImportApiClient({
  recordImportApiUrl: 'http://foo.bar',
  recordImportApiUsername: 'foo',
  recordImportApiPassword: 'bar'
});

const melindaApiClient = createMelindaApiClient({
  melindaApiUrl: 'http://foo.bar/',
  melindaApiUsername: 'foo',
  melindaApiPassword: 'bar'
});

generateTests({
  callback,
  path: [__dirname, '..', 'test-fixtures', 'handleTransformedBlob'],
  useMetadataFile: true,
  recurse: false,
  fixura: {
    reader: READERS.JSON
  }
});

async function callback({enabled = true, configs}) {
  if (enabled === false) {
    debug('TEST SKIPPED!');
    return;
  }

  await handleTransformedBlob(riApiClient, melindaApiClient, amqplib, configs);
  return;
}
