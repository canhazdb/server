import { Context } from './context.js';
import setupEvents from './modules/events/setup.js';
import setupHttpApi from './modules/http-api/setup.js';
import setupHttpGui from './modules/http-gui/setup.js';

export type Server = {
  close: () => Promise<void>;
};

export default async function createServer(context: Context): Promise<Server> {
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
