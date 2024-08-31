import fs from 'fs/promises';
import os from 'os';
import { Context } from './context.js';
import setupEvents from './modules/events/setup.js';
import setupHttpApi from './modules/http-api/setup.js';
import setupHttpGui from './modules/http-gui/setup.js';
import generateSelfSignedCert from './utils/generateSelfSignedCert.js';

export type Server = {
  close: () => Promise<void>;
};

export default async function createServer(context: Context): Promise<Server> {
  try {
    if (context.config.tls.certPath && context.config.tls.keyPath) {
      context.tls.cert = await fs.readFile(context.config.tls.certPath, 'utf8');
      context.tls.key = await fs.readFile(context.config.tls.keyPath, 'utf8');
    }
  // eslint-disable-next-line
  } catch(error) {}

  if (context.config.tls.autoGenerate) {
    console.log('No certs found. Generating self-signed certificate...');
    const tempDir = os.tmpdir();
    const { cert, key } = await generateSelfSignedCert(tempDir);
    context.tls.cert = cert;
    context.tls.key = key;
  } else {
    throw new Error('TLS certificate and key not found and auto-generation is disabled');
  }

  await setupEvents(context);
  await setupHttpApi(context);
  await setupHttpGui(context);

  const close = async () => {
    await Promise.all(context.cleanups.map(fn => fn()));
    process.off('SIGINT', handleNodeShutdown);
  };

  // Handle graceful shutdown
  const handleNodeShutdown = async () => {
    console.log("Shutting down...");
    await close();
    process.exit(0);
  }
  process.on('SIGINT', handleNodeShutdown);

  return { close };
}
