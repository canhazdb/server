import https from 'node:https';
import fs from 'node:fs/promises';
import path from 'node:path';
import mime from 'mime-types';
import { Context } from '../../context.js';

export default async function setupHttpGui(context: Context) {
  const { config } = context;
  const options = {
    key: await fs.readFile(config.tls.key),
    cert: await fs.readFile(config.tls.cert)
  };

  const staticDir = path.join(import.meta.dirname, 'frontend/dist');

  const server = https.createServer(options, async (request, response) => {
    if (request.url?.startsWith('/api/')) {
      // Proxy request to the API server
      const apiReq = https.request({
        hostname: 'localhost',
        port: config.ports.gui,
        path: request.url.replace('/api', ''),
        method: request.method,
        headers: request.headers,
        rejectUnauthorized: false // Only for development, remove in production
      }, (apiRes) => {
        response.writeHead(apiRes.statusCode || 500, apiRes.headers);
        apiRes.pipe(response);
      });

      apiReq.on('error', (error) => {
        console.error('Error proxying to API:', error);
        response.writeHead(500, { 'Content-Type': 'text/plain' });
        response.end('Internal Server Error');
      });

      request.pipe(apiReq);
    } else {
      try {
        let filePath;
        if (request.url === '/' || request.url === '/index.html') {
          filePath = path.join(staticDir, 'index.html');
        } else {
          // Normalize the path to prevent directory traversal
          const normalizedPath = path.normalize(request.url || '').replace(/^(\.\.[/\\])+/, '');
          filePath = path.join(staticDir, normalizedPath);
        }

        // Check if the file exists and is within the static directory
        if (!filePath.startsWith(staticDir)) {
          throw new Error('Access denied');
        }

        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
          throw new Error('Cannot access directory');
        }

        const content = await fs.readFile(filePath);
        const contentType = mime.lookup(filePath) || 'application/octet-stream';
        response.writeHead(200, { 'Content-Type': contentType });
        response.end(content);
      } catch (error: any) {
        console.error('Error serving file:', error);
        if (error.code === 'ENOENT') {
          response.writeHead(404, { 'Content-Type': 'text/plain' });
          response.end('Not Found');
        } else {
          response.writeHead(500, { 'Content-Type': 'text/plain' });
          response.end('Internal Server Error');
        }
      }
    }
  });

  server.listen(config.ports.gui, () => {
    console.log(`GUI Server running on https://localhost:${config.ports.gui}`);
  });

  context.cleanups.push(() => new Promise(resolve => server.close(() => resolve())));

  return server;
}
