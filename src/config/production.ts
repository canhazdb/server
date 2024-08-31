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
  clusterId: 'canhazdb-prod',
  nodeId: 'canhazdb-prod-1',
};

export default config;
