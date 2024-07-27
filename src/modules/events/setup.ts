import { connect, StringCodec, NatsError } from "nats";
import { v4 as uuidv4 } from 'uuid';
import { Collection, Context } from "../../context.js";
import { applyEvent } from "./applyEvent.js";

export async function getSystemCollections(context: Context): Promise<Collection[]> {
  return context.systemCollections.collections;
}

async function setupNats(context: Context) {
  const { config, jetStream } = context;
  jetStream.nc = await connect({ servers: config.jetstream.servers });
  console.log("Connected to NATS");

  jetStream.jsm = await jetStream.nc.jetstreamManager();
  jetStream.js = jetStream.nc.jetstream();

  context.cleanups.push(async () => {
    await jetStream.nc.drain();
    await jetStream.nc.close();
  });
}

// Ensure the stream exists
async function ensureStream(context: Context, streamName: string) {
  const { jetStream } = context;
  try {
    await jetStream.jsm.streams.add({ name: streamName, subjects: [`${streamName}.>`] });
    console.log(`Stream '${streamName}' created`);
  } catch (err) {
    if (err instanceof NatsError && err.code !== '400') {
      throw err;
    }
    console.log(`Stream '${streamName}' already exists`);
  }
}

// Stream all events from the beginning to build up the in-memory database
async function streamEvents(context: Context, streamName: string) {
  const { jetStream } = context;
  const consumer = await jetStream.js.consumers.get(streamName);

  const iter = await consumer.consume();
  const sc = StringCodec();

  context.cleanups.push(async () => {
    await iter.stop();
    await iter.close();
  });

  // We need to resolve this function so the next module can run
  (async function() {
    for await (const msg of iter) {
      const event = JSON.parse(sc.decode(msg.data));
      applyEvent(context, event);
      msg.ack();
    }
  })();
}

// Function to handle database operations
export async function handleDatabaseOperation(context: Context, streamName: string, method: string, collection: string, documentId: string | undefined, payload: any) {
  const { inMemoryDB, jetStream } = context;

  if (collection === '_haz.collections' && method === 'GET') {
    return getSystemCollections(context);
  }

  if (collection.startsWith('_haz.')) {
    return { error: 'Can not mutate system collections' };
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
    throw new Error('Invalid method');
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

  const event = {
    eventType,
    collection,
    documentId,
    timestamp: new Date().toISOString(),
    payload: eventType === 'CREATE' ? { ...payload, id: documentId } : { ...payload, id: documentId }
  };

  const subject = `${streamName}.${collection}`;
  const sc = StringCodec();
  const pubAck = await jetStream.js.publish(subject, sc.encode(JSON.stringify(event)));

  return { success: true, message: `${eventType} operation successful`, sequence: pubAck.seq, documentId: event.documentId };
}

export default async function setup (context: Context) {
  const { config } = context;
  await setupNats(context);
  await ensureStream(context, config.jetstream.streamName);
  await streamEvents(context, config.jetstream.streamName);
}
