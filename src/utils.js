export function recordDataBuilder(result) {
  const {status, message, dublicateIds, conflictIds, databaseId, recordMetadata = {}} = result;
  const {sourceIds, title, standardIdentifiers} = recordMetadata;

  const metadata = {
    id: databaseId,
    title,
    standardIdentifiers,
    sourceIds,
    message
  };

  // eslint-disable-next-line functional/immutable-data
  Object.keys(metadata).forEach(key => metadata[key] === undefined && delete metadata[key]);

  if (dublicateIds) {
    return {status, dublicateIds, metadata};
  }

  if (conflictIds) {
    return {status, conflictIds, metadata};
  }

  return {status, metadata};
}