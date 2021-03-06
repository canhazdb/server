const WebSocket = require('ws');

const handlePost = require('./actions/ws/post');
const handleGetAll = require('./actions/ws/getAll');

const {
  COMMAND,
  DATA,
  NOTIFY_ON,
  NOTIFY_OFF
} = require('./constants');

function askOnAllNodes (state, data) {
  return Promise.all(
    state.nodes.map(node => node.connection.send(data))
  );
}

function wsHandler (server, state, options) {
  const wss = new WebSocket.Server({
    server,
    verifyClient: options.tls && options.tls.verifyClient
  });

  const listeners = {};

  state.handleMessage = function (message) {
    const triggeredPath = message[3];
    listeners[triggeredPath].forEach(socket => socket.send(JSON.stringify(['T', message])));
  };

  async function addListener (acceptId, socket, path) {
    listeners[path] = listeners[path] || [];

    if (listeners[path].length === 0) {
      askOnAllNodes(state, {
        [COMMAND]: NOTIFY_ON,
        [DATA]: path
      });
    }

    const listenerIndex = listeners[path].indexOf(socket);
    if (listenerIndex > -1) {
      return;
    }

    listeners[path].push(socket);

    socket.send(JSON.stringify(['A', acceptId]));
  }

  async function removeListener (acceptId, socket, path) {
    if (!listeners[path]) {
      return;
    }

    const listenerIndex = listeners[path].indexOf(socket);
    if (listenerIndex > -1) {
      listeners[path].splice(listenerIndex, 1);
    }

    if (listeners[path].length === 0) {
      await askOnAllNodes(state, {
        [COMMAND]: NOTIFY_OFF,
        [DATA]: path
      });

      delete listeners[path];
    }

    socket.send(JSON.stringify(['A', acceptId]));
  }

  wss.on('connection', function connection (socket) {
    socket.on('message', function incoming (rawMessage) {
      const message = JSON.parse(rawMessage);
      const [acceptId, command, data] = message;

      if (command === 'NOTIFY') {
        addListener(acceptId, socket, data);
        return;
      }

      if (command === 'UNNOTIFY') {
        removeListener(acceptId, socket, data);
        return;
      }

      if (command === 'POST') {
        handlePost(acceptId, state, data, socket);

        return;
      }

      if (command === 'GET') {
        handleGetAll(acceptId, state, data, socket);

        return;
      }

      socket.send(JSON.stringify(['R', acceptId, 'COMMAND_NOT_FOUND']));
    });

    socket.on('close', function incoming () {
      Object.keys(listeners).forEach(key => {
        listeners[key].forEach(listener => {
          if (listener[0] === socket) {
            removeListener(socket, key);
          }
        });
      });
    });
  });

  return wss;
}

module.exports = wsHandler;
