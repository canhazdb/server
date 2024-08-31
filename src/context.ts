export type ConfigPortTypes = 'api' | 'gui';

/**
 * Configuration object for the application.
 */
export type Config = {
  /** TLS configuration */
  tls: {
    /** Path to the certificate file */
    certPath?: string;
    /** Path to the key file */
    keyPath?: string;
    /** Auto generate cert files if none found */
    autoGenerate?: boolean;
  };
  /** Port number for the server */
  ports: {
    [key in ConfigPortTypes]: number;
  },
  /** A uuid to identify the cluster */
  clusterId: string;
  /** A uuid to identify the node */
  nodeId: string;
};

/**
 * Represents a collection in the system.
 */
export type Collection = {
  name: string;
  count: number;
  lastModified: string;
};

/**
 * Application context object.
 */
export type Context = {
  /** Application configuration */
  config: Config;
  /** In-memory database */
  inMemoryDB: Record<string, Record<string, any>>;
  /** System collections */
  systemCollections: {
    collections: Collection[];
  };
  tls: {
    cert?: string;
    key?: string;
  }
  /** Functions added to this array will be executed when the server is closed */
  cleanups: Array<() => Promise<void>>;
  loadedCollections: Set<string>;
}

/**
 * Represents an event in the system.
 */
export type Event = {
  /** Type of the event */
  eventType: string;
  /** Collection associated with the event */
  collection: string;
  /** Document ID associated with the event (optional) */
  documentId: string | undefined;
  /** Payload of the event */
  payload: any
}

/**
 * Creates and returns a new context object.
 * @param config The configuration object to use
 * @returns A new Context object
 */
export function createContext (config: Config): Context {
  const context : Context = {
    config,
    inMemoryDB: {},
    systemCollections: {
      collections: []
    },
    cleanups: [],
    tls: {},
    loadedCollections: new Set<string>()
  };

  return context;
}
