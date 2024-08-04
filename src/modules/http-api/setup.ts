import https from 'node:https';
import url from 'node:url';
import { handleDatabaseOperation } from '../events/setup.js';
import { Context } from "../../context.js";

export default async function setupHttpApi(context: Context) {
  const { config } = context;
  const options = {
    key: context.tls.key,
    cert: context.tls.cert
  };

  const server = https.createServer(options, async (request, response) => {
    if (!request.url) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Invalid URL' }));
      return;
    }

    const parsedUrl = url.parse(request.url, true);
    if (!parsedUrl.pathname) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Invalid pathname' }));
      return;
    }

    const path = parsedUrl.pathname.split('/').filter(Boolean);
    const [collection, documentId] = path;

    if (!collection) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Collection name is required' }));
      return;
    }

    let body = '';
    request.on('data', chunk => {
      body += chunk.toString();
    });

    request.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : null;

        if ((request.method === 'PUT' || request.method === 'PATCH') && payload && 'id' in payload) {
          delete payload.id;
        }

        const result = await handleDatabaseOperation(context, config.jetstream.streamName, request.method || 'GET', collection, documentId, payload);
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(result));
      } catch (error) {
        console.error('Error:', error);
        response.writeHead(500, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }));
      }
    });
  });

  server.listen(config.ports.api, () => {
    console.log(`Server running on https://localhost:${config.ports.api}`);
  });

  context.cleanups.push(() => new Promise(resolve => server.close(() => resolve())));

  return server;
}
