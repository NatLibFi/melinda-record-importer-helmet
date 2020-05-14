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
import {Error as ApiError, Utils, createApiClient} from '@natlibfi/melinda-commons';
import {RECORD_IMPORT_STATE} from '@natlibfi/melinda-record-import-commons';
import {
  noopMelindaImport, restApiUrl, restApiUsername, restApiPassword
} from './config';
import httpStatus from 'http-status';

export function createImportCallback() {
  const {createLogger, getRecordTitle, getRecordStandardIdentifiers} = Utils;
  const logger = createLogger();
  const apiClient = createApiClient({
    restApiUrl,
    restApiUsername,
    restApiPassword
  });
  MarcRecord.setValidationOptions({subfieldValues: false});

  return async message => {
    logger.log('info', `${noopMelindaImport ? 'NOOP_MELINDA_IMPORT is set. Not importing anything' : 'Importing record to Melinda'}`);

    const record = new MarcRecord(JSON.parse(message.content.toString()));
    const title = getRecordTitle(record);
    const standardIdentifiers = getRecordStandardIdentifiers(record);

    logger.log('info', 'Sending record to rest-api-http...');
    // Params: noop & unique
    try {
      const response = await apiClient.postPrio({params: {noop: noopMelindaImport}, contentType: 'application/marc', body: record});
      logger.log('debug', JSON.stringify(response));
      const {id, data} = response;

      if (noopMelindaImport) {
        logger.log('verbose', 'Got noop expected response');
        return {status: RECORD_IMPORT_STATE.SKIPPED, metadata: {title, standardIdentifiers, validationMessages: data}};
      }

      if (id) {
        logger.log('info', `Created new record ${id}`);
        return {status: RECORD_IMPORT_STATE.CREATED, metadata: {id, title, standardIdentifiers, validationMessages: data}};
      }

      logger.log('verbose', 'Got unexpected response');
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Unexpected response');
    } catch (error) {
      logger.log('error', error);

      if (error.status === httpStatus.CONFLICT) {
        logger.log('verbose', 'Got expected conflict response');
        return {status: RECORD_IMPORT_STATE.DUPLICATE, metadata: {matches: error.payload, title, standardIdentifiers}};
      }

      return {status: RECORD_IMPORT_STATE.ERROR, metadata: {title, standardIdentifiers, error: error.payload}};
    }
  };
}
