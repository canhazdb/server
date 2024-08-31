import { v4 as uuidv4 } from 'uuid';
import { Collection, Context } from "../../context.js";
import { applyEvent } from './applyEvent.js';
import fs from 'fs';

export async function getSystemCollections(context: Context): Promise<Collection[]> {
  return context.systemCollections.collections;
}

async function loadAndApplyEvents(context: Context, streamName: string) {
  const filePath = `./data/${streamName}.json`;

  try {
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    const events = fileContent.trim().split('\n').map(line => JSON.parse(line));

    for (const event of events) {
      applyEvent(context, event);
    }
  } catch (error) {
    // If the file doesn't exist (ENOENT), it's not an error, just means no events to load
    // @ts-expect-error TS18046
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function getNextSequence(streamName: string): Promise<number> {
  const filePath = `./data/${streamName}.json`;
  try {
    const stats = await fs.promises.stat(filePath);
    if (stats.size === 0) {
      return 1;
    }
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    const lastLine = fileContent.trim().split('\n').pop();
    if (lastLine) {
      const lastEvent = JSON.parse(lastLine);
      return (lastEvent.sequence || 0) + 1;
    }
  } catch (error) {
    // If the file doesn't exist (ENOENT), it's not an error, just means no events to load
    // @ts-expect-error TS18046
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  return 1;
}

function isCollectionLoaded(context: Context, collection: string): boolean {
  return context.loadedCollections && context.loadedCollections.has(collection);
}

export async function handleDatabaseOperation(context: Context, method: string, collection: string, documentId: string | undefined, payload: any) {
  const { inMemoryDB } = context;

  const streamName = context.config.clusterId + context.config.nodeId + collection;

  if (collection === '_haz.collections' && method === 'GET') {
    return getSystemCollections(context);
  }

  if (collection.startsWith('_haz.')) {
    return { error: 'Can not mutate system collections' };
  }

  // Check if the collection has been loaded, and load it if not
  if (!isCollectionLoaded(context, collection)) {
    await loadAndApplyEvents(context, streamName);
    if (!context.loadedCollections) {
      context.loadedCollections = new Set();
    }
    context.loadedCollections.add(collection);
  }

  if (method === 'GET') {
    if (!inMemoryDB[collection]) {
      return { error: 'Collection not found' };
    }
    if (documentId) {
      return inMemoryDB[collection][documentId] || { error: 'Document not found' };
    }
    return Object.values(inMemoryDB[collection]);
  }

  const eventType = {
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'PATCH',
    'DELETE': 'DELETE'
  }[method] as 'CREATE' | 'UPDATE' | 'PATCH' | 'DELETE' | undefined;

  if (!eventType) {
    throw new Error(`Invalid method ${method}`);
  }

  // Generate UUID v4 for new documents
  if (eventType === 'CREATE') {
    documentId = uuidv4();
  }

  if (method === 'POST' && payload && 'id' in payload) {
    delete payload.id;
  }

  if ((method === 'PUT' || method === 'PATCH') && payload) {
    delete payload.id;
  }

  const sequence = await getNextSequence(streamName);
  const event = {
    eventType,
    collection,
    documentId,
    timestamp: new Date().toISOString(),
    payload: eventType === 'CREATE' ? { ...payload, id: documentId } : { ...payload, id: documentId },
    sequence
  };

  await fs.promises.appendFile(`./data/${streamName}.json`, JSON.stringify(event) + '\n');
  applyEvent(context, event);

  return {
    success: true,
    message: `${eventType} operation successful`,
    sequence: sequence,
    documentId: event.documentId
  };
}

export async function setup(context: Context) {
  await fs.promises.mkdir('./data', { recursive: true });
  context.loadedCollections = new Set();
}

export default setup;
