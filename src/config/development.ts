import { Config } from "../context.js";

const config: Config = {
  tls: {
    certPath: 'certs/cert.pem',
    keyPath: 'certs/key.pem',
    autoGenerate: true
  },
  ports: {
    api: 3000,
    gui: 3001
  },
  clusterId: 'canhazdb-dev',
  nodeId: 'canhazdb-dev-1',
};

export default config;
