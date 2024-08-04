import { Config } from "../context.js";

const config: Config = {
  tls: {
    certPath: 'certs/cert.pem',
    keyPath: 'certs/key.pem',
  },
  ports: {
    api: 3000,
    gui: 3001
  },
  jetstream: {
    servers: ['nats://localhost:4222'],
    streamName: 'canhazdb-prod',
    consumerName: 'consumer'
  }
};

export default config;
