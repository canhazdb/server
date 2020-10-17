const path = require('path');
const fs = require('fs').promises;

const tcpocket = require('tcpocket');
const uuid = require('uuid').v4;

const { getConnection } = require('./utils/cachableSqlite');
const queryStringToSql = require('./utils/queryStringToSql');

const {
  STATUS,
  DATA,
  DOCUMENT,
  DOCUMENTS,
  INFO,
  GET,
  POST,
  PUT,
  DELETE,
  COLLECTION_ID,
  RESOURCE_ID,
  QUERY
} = require('./constants');

async function fileExists (filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function createTableFromSchema (db, collectionName) {
  return db.run(
    `CREATE TABLE IF NOT EXISTS "${collectionName}" (
      id VARCHAR (36) PRIMARY KEY NOT NULL UNIQUE,
      data TEXT,
      date_created NUMBER,
      date_updated NUMBER
    )`
  );
}

async function get (state, data, sender) {
  const collectionId = data[COLLECTION_ID];
  const resourceId = data[RESOURCE_ID];
  const query = data[QUERY];

  const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');

  if (!await fileExists(dbFile)) {
    sender.reply({ [STATUS]: 404 });
    return;
  }

  const db = await getConnection(10000, dbFile);

  const queryForOne = { query: `SELECT * FROM "_${collectionId}";`, values: [] };
  const statement = resourceId ? queryForOne : queryStringToSql.records(collectionId, query);
  const resources = await db.getAll(statement.query, statement.values);

  const documents = resources.map(resource => ({
    id: resource.id,
    ...JSON.parse(resource.data)
  }));

  sender.reply({ [STATUS]: 200, [DOCUMENTS]: documents });
}

async function post (state, data, sender) {
  const collectionId = data[COLLECTION_ID];

  const resourceId = uuid();

  const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');
  const db = await getConnection(10000, dbFile);
  await createTableFromSchema(db, '_' + collectionId);
  await db.run(`INSERT INTO "${'_' + collectionId}" (id, data, date_created) VALUES (?, ?, ?);`, [
    resourceId,
    JSON.stringify(data[DOCUMENT]),
    Date.now()
  ]);

  sender.reply({
    [STATUS]: 201,
    [DOCUMENT]: {
      id: resourceId,
      ...data[DOCUMENT]
    }
  });
}

async function put (state, data, sender) {
  const collectionId = data[COLLECTION_ID];
  const resourceId = data[RESOURCE_ID];
  const query = data[QUERY];

  const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');

  if (!await fileExists(dbFile)) {
    sender.reply({ [STATUS]: 404 });
    return;
  }

  const db = await getConnection(10000, dbFile);

  const updates = {
    data: JSON.stringify(data[DOCUMENT])
  };

  const queryForOne = { query: `UPDATE "_${collectionId}" SET "data" = $1 WHERE "id" = $2`, values: [JSON.stringify(data[DOCUMENT]), resourceId] };
  const statement = resourceId ? queryForOne : queryStringToSql.records(collectionId, query, null, null, null, null, 'update', updates);

  const result = await db.run(statement.query, statement.values);

  sender.reply({ [STATUS]: 200, [DATA]: { changes: result.changes } });
}

async function del (state, data, sender) {
  const collectionId = data[COLLECTION_ID];
  const resourceId = data[RESOURCE_ID];
  const query = data[QUERY];

  const dbFile = path.join(state.options.dataDirectory, './' + collectionId + '.db');
  if (!await fileExists(dbFile)) {
    sender.reply({ [STATUS]: 404 });
    return;
  }

  const db = await getConnection(10000, dbFile);

  const queryForOne = { query: `DELETE FROM "_${collectionId}" WHERE "id" = $1`, values: [resourceId] };
  const statement = resourceId ? queryForOne : queryStringToSql.records(collectionId, query, null, null, null, null, 'delete');

  const result = await db.run(statement.query, statement.values);

  sender.reply({ [STATUS]: 200, [DATA]: { changes: result.changes } });
}

async function info (state, data, sender) {
  await Promise.all(data.nodes.map(node => state.join(node, true)));

  sender.reply({
    [STATUS]: 200,
    [DATA]: {
      nodes: state.nodes.map(node => ({ host: node.host, port: node.port }))
    }
  });
}

async function createInternalServer (state, port, tls) {
  const internalServer = await tcpocket.createServer({ port, tls });

  internalServer.on(INFO, info.bind(null, state));
  internalServer.on(GET, get.bind(null, state));
  internalServer.on(POST, post.bind(null, state));
  internalServer.on(PUT, put.bind(null, state));
  internalServer.on(DELETE, del.bind(null, state));

  return internalServer;
}

module.exports = createInternalServer;