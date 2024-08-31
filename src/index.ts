import createServer from './createServer.js';
import configs from './config/index.js';
import { createContext } from './context.js';

const nodeEnv = process.env.NODE_ENV || 'development';
const config = configs[nodeEnv as keyof typeof configs];
const context = createContext(config);

createServer(context);
