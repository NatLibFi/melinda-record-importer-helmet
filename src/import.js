/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Helmet record importer for the Melinda record batch import system
*
* Copyright (c) 2019 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-record-import-importer-helmet
*
* melinda-record-import-importer-helmet program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-record-import-importer-helmet is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

import {MarcRecord} from '@natlibfi/marc-record';
import {Utils, Datastore} from '@natlibfi/melinda-commons';
import {createLogger} from '@natlibfi/melinda-backend-commons';
import {RECORD_IMPORT_STATE} from '@natlibfi/melinda-record-import-commons';
import {
  CATALOGER_ID, SRU_URL, NOOP_MELINDA_IMPORT,
  RECORD_LOAD_URL, RECORD_LOAD_API_KEY, RECORD_LOAD_LIBRARY, matchOptions
} from './config';
import createMatchInterface from '@natlibfi/melinda-record-matching';

const {getRecordTitle, getRecordStandardIdentifiers} = Utils;
const {createService: createDatastoreService} = Datastore;

MarcRecord.setValidationOptions({subfieldValues: false});

export default function () {
  const Logger = createLogger();
  const match = createMatchInterface(matchOptions);
  const DatastoreService = createDatastoreService({
    sruURL: SRU_URL,
    recordLoadURL: RECORD_LOAD_URL,
    recordLoadApiKey: RECORD_LOAD_API_KEY,
    recordLoadLibrary: RECORD_LOAD_LIBRARY
  });

  return async message => {
    if (NOOP_MELINDA_IMPORT) { // eslint-disable-line functional/no-conditional-statement
      Logger.log('info', 'NOOP_MELINDA_IMPORT is set. Not importing anything');
    } else { // eslint-disable-line functional/no-conditional-statement
      Logger.log('info', 'Importing record to Melinda');
    }

    const record = new MarcRecord(JSON.parse(message.content.toString()));
    const title = getRecordTitle(record);
    const standardIdentifiers = getRecordStandardIdentifiers(record);

    Logger.log('debug', 'Trying to find matches for record...');
    const matches = await match(record);

    if (matches.length > 0) {
      const matchedIds = matches.map(({candidate: {id}}) => id);
      return {status: RECORD_IMPORT_STATE.DUPLICATE, metadata: {matches, title, standardIdentifiers: matchedIds}};
    }

    if (NOOP_MELINDA_IMPORT) {
      return {status: RECORD_IMPORT_STATE.SKIPPED, metadata: {title, standardIdentifiers}};
    }

    Logger.log('info', 'Importing record to datastore...');
    const id = await DatastoreService.create({record, cataloger: CATALOGER_ID});

    Logger.log('info', `Created new record ${id}`);
    return {status: RECORD_IMPORT_STATE.CREATED, metadata: {id, title, standardIdentifiers}};
  };
}
