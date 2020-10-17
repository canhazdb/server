const packageJson = require('../package.json');

const path = require('path');
const tcpocket = require('tcpocket');

const handleExternal = require('./handleExternal');
const createInternalServer = require('./createInternalServer');

const { flushCache } = require('./utils/cachableSqlite');

const { INFO, DATA } = require('./constants');

async function canhazdb (options) {
  const log = (options.logger || console.log);

  async function makeConnection (host, port, tls) {
    const client = await tcpocket.createClient({ host, port, tls });
    client.on('testResp', (data, sender) => {
      log(data);
    });
    return client;
  }

  options.dataDirectory = options.dataDirectory || path.resolve(process.cwd(), './canhazdata');
  options.port = parseInt(options.port);

  const state = {
    options,

    nodes: [{
      host: options.host,
      port: options.port,
      info: {
        version: packageJson.version
      }
    }],

    data: {}
  };

  const internalServer = await createInternalServer(state, options.port, options.tls);

  state.nodes[0].connection = await makeConnection(options.host, options.port, options.tls);

  let server;

  if (options.tls) {
    server = require('https').createServer(options.tls, handleExternal.bind(null, state));
  } else {
    server = require('http').createServer(handleExternal.bind(null, state));
  }

  server.listen(options.queryPort);

  async function join ({ host, port }, alreadyRecursed) {
    port = parseInt(port);

    if (state.nodes.find(node => node.host === host && node.port === port)) {
      return;
    }

    log(`  joining ${host}:${port}`);

    const newNode = {
      host,
      port
    };

    state.nodes.push(newNode);

    newNode.connection = await makeConnection(host, port, options.tls);

    newNode.info = await newNode.connection.ask(INFO, {
      nodes: state.nodes.map(node => ({ host: node.host, port: node.port }))
    });

    if (!alreadyRecursed) {
      const otherJoins = newNode.info[DATA].nodes.map(node => {
        return join({ ...node }, true);
      });

      await Promise.all(otherJoins);
    }
  }

  state.join = join;

  return new Promise((resolve) => {
    server.on('listening', async () => {
      resolve({
        url: `${options.tls ? 'https' : 'http'}://` + options.host + ':' + options.queryPort,
        host: options.host,
        port: options.port,
        queryPort: options.queryPort,

        state,

        join,

        close: () => {
          state.nodes.forEach(node => {
            node.connection.close();
          });
          server.close();
          internalServer.close();
          flushCache();
        }
      });
    });
  });
}

module.exports = canhazdb;