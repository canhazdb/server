import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import createServer, { Server } from '../src/createServer.js';
import { Context, Config, createContext } from '../src/context.js';
import https from 'node:https';

https.globalAgent.maxSockets = 1000;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

interface RequestOptions {
  hostname: string;
  port: number;
  path: string;
  method: string;
}

interface Response {
  statusCode: number;
  headers: Headers;
  body: any;
}

async function makeRequest(options: RequestOptions, data: any = null): Promise<Response> {
  const url = `https://${options.hostname}:${options.port}${options.path}`;
  const fetchOptions: RequestInit = { // Changed from any to RequestInit
    method: options.method, // Explicitly set the method
    headers: {
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined,
  };

  const response = await fetch(url, fetchOptions);
  const responseBody = await response.json();
  return {
    statusCode: response.status,
    headers: response.headers as Headers,
    body: responseBody
  };
}

const testConfig: Config = {
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
    streamName: `canhazdb-test-${Date.now()}`,
    consumerName: `canhazdb-test-consumer-${Date.now()}`,
  }
};

describe('CanhazDB Server Tests', async () => {
  let server: Server;

  beforeEach(async () => {
    const context: Context = createContext(testConfig);
    server = await createServer(context);
  });

  afterEach(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('CRUD Operations', () => {
    test('CREATE - should create a new document', async () => {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/users',
        method: 'POST'
      }, { name: 'John Doe', age: 30 });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.success, true);
      assert.equal(response.body.message, 'CREATE operation successful');
      assert(response.body.documentId);
    });

    test('READ - should retrieve a document', async () => {
      // First, create a document
      const createResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/users',
        method: 'POST'
      }, { name: 'Jane Doe', age: 25 });

      const documentId = createResponse.body.documentId;

      // Now, retrieve the document
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/users/${documentId}`,
        method: 'GET',
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.name, 'Jane Doe');
      assert.equal(response.body.age, 25);
    });

    test('UPDATE - should update a document', async () => {
      // First, create a document
      const createResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/users',
        method: 'POST',
      }, { name: 'Bob Smith', age: 40 });

      const documentId = createResponse.body.documentId;

      // Now, update the document
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/users/${documentId}`,
        method: 'PUT',
      }, { name: 'Bob Smith', age: 41 });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.success, true);
      assert.equal(response.body.message, 'UPDATE operation successful');

      // Verify the update
      const getResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/users/${documentId}`,
        method: 'GET'
      });

      assert.equal(getResponse.body.name, 'Bob Smith');
      assert.equal(getResponse.body.age, 41);
    });

    test('DELETE - should delete a document', async () => {
      // First, create a document
      const createResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/users',
        method: 'POST'
      }, { name: 'Alice Johnson', age: 35 });

      const documentId = createResponse.body.documentId;

      // Now, delete the document
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/users/${documentId}`,
        method: 'DELETE'
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.success, true);
      assert.equal(response.body.message, 'DELETE operation successful');

      // Verify the deletion
      const getResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/users/${documentId}`,
        method: 'GET'
      });

      assert.deepEqual(getResponse.body, { error: 'Document not found' });
    });

    test.skip('STRESS TEST - should handle lots of inserted documents', async () => {
      const totalDocuments = 1000;
      const insertPromises: Promise<Response>[] = [];

      for (let i = 0; i < totalDocuments; i++) {
        insertPromises.push(makeRequest({
          hostname: 'localhost',
          port: 3000,
          path: '/users',
          method: 'POST',
        }, { name: `User${i}`, age: i % 100, index: i }));
      }

      const responses = await Promise.all(insertPromises);

      responses.forEach((response) => {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.success, true);
        assert(response.body.documentId);
      });

      // Randomly read some of the inserted documents
      const readPromises: Promise<Response>[] = [];
      for (let i = 0; i < 10; i++) {
        const randomId = Math.floor(Math.random() * totalDocuments);
        readPromises.push(makeRequest({
          hostname: 'localhost',
          port: 3000,
          path: `/users/${responses[randomId].body.documentId}`,
          method: 'GET'
        }));
      }

      const readResponses = await Promise.all(readPromises);
      readResponses.forEach((response) => {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.name, `User${response.body.index}`);
        assert(typeof response.body.age === 'number');
      });
    });
  });

  describe('Error Handling', () => {
    test('should return 400 for invalid URL', async () => {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '',
        method: 'GET'
      });
      assert.equal(response.statusCode, 400);
      assert.equal(response.body.error, 'Collection name is required');
    });

    test('should return 400 for missing collection name', async () => {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/',
        method: 'GET'
      });
      assert.equal(response.statusCode, 400);
      assert.equal(response.body.error, 'Collection name is required');
    });
  });
});