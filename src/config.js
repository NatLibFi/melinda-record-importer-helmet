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
import {candidateSearch, matchDetection} from '@natlibfi/melinda-record-matching';

export const CATALOGER_ID = readEnvironmentVariable('CATALOGER_ID', {defaultValue: 'IMP_HELMET'});

export const SRU_URL = readEnvironmentVariable('SRU_URL');

export const RECORD_LOAD_URL = readEnvironmentVariable('RECORD_LOAD_URL');
export const RECORD_LOAD_API_KEY = readEnvironmentVariable('RECORD_LOAD_API_KEY');
export const RECORD_LOAD_LIBRARY = readEnvironmentVariable('RECORD_LOAD_LIBRARY');

export const NOOP_MELINDA_IMPORT = readEnvironmentVariable('NOOP_MELINDA_IMPORT', {defaultValue: false, format: parseBoolean});

const recordType = readEnvironmentVariable('RECORD_TYPE', {defaultValue: 'bib'});

export const matchOptions = {
    maxMatches: readEnvironmentVariable('MAX_MATCHES', {
        defaultValue: 1, format: v => Number(v)
    }),
    maxCandidates: readEnvironmentVariable('MAX_CANDIDATES', {defaultValue: 25, format: v => Number(v)}),
    search: {
        url: readEnvironmentVariable('SRU_URL'),
        searchSpec: generateSearchSpec()
    },
    detection: {
        treshold: readEnvironmentVariable('MATCHING_TRESHOLD', {defaultValue: 0.9, format: v => Number(v)}),
        strategy: generateStrategy()
    }
};

function generateStrategy() {
    if (recordType === 'bib') {
        return [
            matchDetection.features.bib.hostComponent(),
            matchDetection.features.bib.isbn(),
            matchDetection.features.bib.issn(),
            matchDetection.features.bib.otherStandardIdentifier(),
            matchDetection.features.bib.title(),
            matchDetection.features.bib.authors(),
            matchDetection.features.bib.recordType(),
            matchDetection.features.bib.publicationTime(),
            matchDetection.features.bib.language(),
            matchDetection.features.bib.bibliographicLevel()
        ];
    }

    throw new Error('Unsupported record type');
}

function generateSearchSpec() {
    if (recordType === 'bib') {
        return [
            candidateSearch.searchTypes.bib.hostComponents,
            candidateSearch.searchTypes.bib.standardIdentifiers,
            candidateSearch.searchTypes.bib.title
        ];
    }

    throw new Error('Unsupported record type');
}
