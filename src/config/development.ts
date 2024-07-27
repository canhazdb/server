import { Config } from "../context.js";

export default {
  tls: {
    cert: 'certs/cert.pem',
    key: 'certs/key.pem',
  },
  ports: {
    api: 3000,
    gui: 3001
  },
  jetstream: {
    servers: ['nats://localhost:4222'],
    streamName: 'canhazdb-dev',
    consumerName: 'consumer'
  }
} as Config;
