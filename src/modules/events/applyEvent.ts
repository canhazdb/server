import { Context, Event } from "../../context.js";

export function applyEvent(context : Context, event: Event) {
  const { inMemoryDB } = context;

  const { eventType, collection, documentId, payload } = event;
  if (!inMemoryDB[collection]) {
    inMemoryDB[collection] = {};
  }

  if (!documentId) {
    console.error('Cannot apply event: documentId is undefined');
    return;
  }

  let collectionUpdated = false;

  switch (eventType) {
    case 'CREATE':
      inMemoryDB[collection][documentId] = payload;
      collectionUpdated = true;
      break;
    case 'UPDATE':
      inMemoryDB[collection][documentId] = { ...payload, id: documentId };
      collectionUpdated = true;
      break;
    case 'PATCH':
      inMemoryDB[collection][documentId] = { ...inMemoryDB[collection][documentId], ...payload, id: documentId };
      collectionUpdated = true;
      break;
    case 'DELETE':
      delete inMemoryDB[collection][documentId];
      collectionUpdated = true;
      break;
  }

  if (collectionUpdated) {
    updateSystemCollections(context, collection);
  }
}

function updateSystemCollections(context: Context, collectionName: string) {
  const { inMemoryDB, systemCollections } = context;

  let collectionInfo = systemCollections.collections.find(c => c.name === collectionName);

  if (!collectionInfo) {
    collectionInfo = { name: collectionName, count: 0, lastModified: '' };
    systemCollections.collections.push(collectionInfo);
  }

  collectionInfo.count = Object.keys(inMemoryDB[collectionName]).length;
  collectionInfo.lastModified = new Date().toISOString();
}
