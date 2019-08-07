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
import {Utils} from '@natlibfi/melinda-commons';
import {RECORD_IMPORT_STATE} from '@natlibfi/melinda-record-import-commons';

const {createLogger, getRecordTitle, getRecordStandardIdentifiers} = Utils;

// Does this need to be true?
MarcRecord.setValidationOptions({subfieldValues: false});

export default function () {
	const Logger = createLogger();

	return async message => {

		Logger.log('info', 'Not importing anything to Melinda, just logging!');

		const record = new MarcRecord(JSON.parse(message.content.toString()));
		const title = getRecordTitle(record);
		const standardIdentifiers = getRecordStandardIdentifiers(record);
		const recordFields = record.fields;

		// Logs record and it's subfields to info channel
		// Possibility to add enviromental variable to change log location
		// Logging to file needs new function to Melinda-commons-js/utils
		Logger.log('info', 'Got record for importing:');
		Logger.log('info', 'Record title: ' + title);
		Logger.log('info', 'Standard identifiers: ' +standardIdentifiers);
		Logger.log('info', 'Records fields to be imported:');
		recordFields.forEach(field => {
			Logger.log('info', 'Tag: ' + field.tag)
			Logger.log('info', 'Subfields:')
			field.subfield.forEach(sub => {
				Logger.log('info', 'Code: ' + sub.code)
				Logger.log('info', 'Value: ' + sub.value)
			})
			Logger.log('info', '---------')
		})

		return {status: RECORD_IMPORT_STATE.SKIPPED, metadata: {title, standardIdentifiers}};
	};
}
