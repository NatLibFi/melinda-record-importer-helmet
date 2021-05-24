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

export const restApiOptions = {
  restApiUrl: readEnvironmentVariable('MELINDA_API_URL'),
  restApiUsername: readEnvironmentVariable('MELINDA_API_USERNAME'),
  restApiPassword: readEnvironmentVariable('MELINDA_API_PASSWORD')
};

export const logLevel = readEnvironmentVariable('LOG_LEVEL', {defaultValue: 'info'});
export const noopMelindaImport = readEnvironmentVariable('NOOP_MELINDA_IMPORT', {defaultValue: false, format: parseBoolean});
export const catalogerId = readEnvironmentVariable('CATALOGER_ID', {defaultValue: false});
