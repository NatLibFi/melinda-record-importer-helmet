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
import {RecordMatching, Datastore} from '@natlibfi/melinda-commons';
import {ImporterUtils, registerSignalHandlers, createLogger, startHealthCheckService, RECORD_IMPORT_STATE} from '@natlibfi/melinda-record-import-commons';
import {
	API_URL, BLOB_ID, PROFILE_ID, API_USERNAME, API_PASSWORD, AMQP_URL, CATALOGER_ID,
	SRU_URL, RECORD_LOAD_URL, RECORD_LOAD_API_KEY, RECORD_LOAD_LIBRARY
} from './config';

start();

async function start() {
	const {checkEnv, startImport} = ImporterUtils;
	const {createBibService: createMatchingService} = RecordMatching;
	const {createService: createDatastoreService} = Datastore;

	const Logger = createLogger();

	registerSignalHandlers();
	checkEnv();

	const stopHealthCheckService = startHealthCheckService(process.env.HEALTH_CHECK_PORT);

	process.on('SIGINT', () => {
		stopHealthCheckService();
	});

	try {
		Logger.log('info', 'Starting melinda-record-import-importer-helmet');

		const MatchingService = createMatchingService({sruURL: SRU_URL});
		const DatastoreService = createDatastoreService({
			sruURL: SRU_URL,
			recordLoadURL: RECORD_LOAD_URL,
			recordLoadApiKey: RECORD_LOAD_API_KEY,
			recordLoadLibrary: RECORD_LOAD_LIBRARY
		});

		await startImport({
			callback: createImportCallback(MatchingService, DatastoreService),
			blobId: BLOB_ID,
			profile: PROFILE_ID,
			apiURL: API_URL,
			apiUsername: API_USERNAME,
			apiPassword: API_PASSWORD,
			amqpURL: AMQP_URL
		});

		stopHealthCheckService();
		process.exit();
	} catch (err) {
		stopHealthCheckService();
		Logger.error(err.stack);
		process.exit(-1);
	}

	function createImportCallback(MatchingService, DatastoreService) {
		return async message => {
			Logger.log('debug', 'Importing record to Melinda');
			Logger.log('debug', `Got message`);

			const record = new MarcRecord(JSON.parse(message.content));
			const matches = await MatchingService.find(record);

			if (matches.length > 0) {
				return {status: RECORD_IMPORT_STATE.duplicate};
			}

			const id = await DatastoreService.create({record, cataloger: CATALOGER_ID});

			return {metadata: {id}, status: RECORD_IMPORT_STATE.created};
		};
	}
}
