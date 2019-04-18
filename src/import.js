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

/* eslint-disable import/default */

import {MarcRecord} from '@natlibfi/marc-record';
import {Utils, RecordMatching, Datastore} from '@natlibfi/melinda-commons';
import {RECORD_IMPORT_STATE} from '@natlibfi/melinda-record-import-commons';
import {
	CATALOGER_ID, SRU_URL, SRU_URL_PROD, NOOP_MELINDA_IMPORT,
	RECORD_LOAD_URL, RECORD_LOAD_API_KEY, RECORD_LOAD_LIBRARY
} from './config';

const {createLogger, getRecordTag} = Utils;
const {createSimpleBibService: createMatchingService} = RecordMatching;
const {createService: createDatastoreService} = Datastore;

MarcRecord.setValidationOptions({subfieldValues: false});

export default function () {
	const Logger = createLogger();
	const ProdMatchingService = createMatchingService({sruURL: SRU_URL_PROD, maxCandidatesPerQuery: 1});
	const MatchingService = createMatchingService({sruURL: SRU_URL, maxCandidatesPerQuery: 1});
	const DatastoreService = createDatastoreService({
		sruURL: SRU_URL,
		recordLoadURL: RECORD_LOAD_URL,
		recordLoadApiKey: RECORD_LOAD_API_KEY,
		recordLoadLibrary: RECORD_LOAD_LIBRARY
	});

	return async message => {
		if (NOOP_MELINDA_IMPORT) {
			Logger.log('debug', 'NOOP_MELINDA_IMPORT is set. Not importing anything');
		} else {
			Logger.log('debug', 'Importing record to Melinda');
		}

		const record = new MarcRecord(JSON.parse(message.content.toString()));
		const tag = getRecordTag(record);

		Logger.log('debug', 'Trying to find matches for record (Test)...');
		const matches = await MatchingService.find(record);
		const wouldImportToProd = await checkProdImport();

		if (matches.length > 0) {
			return {status: RECORD_IMPORT_STATE.DUPLICATE, metadata: {matches, tag, wouldImportToProd}};
		}

		if (NOOP_MELINDA_IMPORT) {
			return {status: RECORD_IMPORT_STATE.SKIPPED, metadata: {tag, wouldImportToProd}};
		}

		Logger.log('debug', 'Importing record to datastore...');
		const id = await DatastoreService.create({record, cataloger: CATALOGER_ID});

		Logger.log('debug', `Created new record ${id}`);
		return {status: RECORD_IMPORT_STATE.CREATED, metadata: {id, tag, wouldImportToProd}};

		async function checkProdImport() {
			Logger.log('debug', 'Trying to find matches for record in production...');
			if ((await ProdMatchingService.find(record)).length === 0) {
				return true;
			}

			return false;
		}
	};
}
