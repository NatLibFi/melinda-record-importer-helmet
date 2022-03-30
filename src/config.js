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

import {readEnvironmentVariable} from '@natlibfi/melinda-backend-commons';
import {parseBoolean} from '@natlibfi/melinda-commons';

export const profileIds = readEnvironmentVariable('PROFILE_IDS', {format: v => JSON.parse(v)});
export const amqpUrl = readEnvironmentVariable('AMQP_URL');
export const importOfflinePeriod = readEnvironmentVariable('IMPORT_OFFLINE_PERIOD', {defaultValue: '{"startHour":24, "lengthHours":0}'});

export const logLevel = readEnvironmentVariable('LOG_LEVEL', {defaultValue: 'info'});
export const noopProcessing = readEnvironmentVariable('NOOP_PROCESSING', {defaultValue: false, format: parseBoolean});
export const noopMelindaImport = readEnvironmentVariable('NOOP_MELINDA_IMPORT', {defaultValue: '0'});
export const uniqueMelindaImport = readEnvironmentVariable('UNIQUE_MELINDA_IMPORT', {defaultValue: '1'});

export const recordImportApiOptions = {
  recordImportApiUrl: readEnvironmentVariable('RECORD_IMPORT_API_URL'),
  recordImportApiUsername: readEnvironmentVariable('RECORD_IMPORT_API_USERNAME_IMPORTER'),
  recordImportApiPassword: readEnvironmentVariable('RECORD_IMPORT_API_PASSWORD_IMPORTER'),
  userAgent: readEnvironmentVariable('API_CLIENT_USER_AGENT', {defaultValue: '_RECORD-IMPORT-IMPORTER'})
};

export const melindaApiOptions = {
  melindaApiUrl: readEnvironmentVariable('MELINDA_API_URL', {defaultValue: false}),
  melindaApiUsername: readEnvironmentVariable('MELINDA_API_USERNAME', {defaultValue: ''}),
  melindaApiPassword: readEnvironmentVariable('MELINDA_API_PASSWORD', {defaultValue: ''}),
  cataloger: readEnvironmentVariable('CATALOGER_ID', {defaultValue: false})
};
