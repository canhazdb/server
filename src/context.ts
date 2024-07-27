import { JetStreamClient, JetStreamManager, NatsConnection } from "nats";

export type ConfigPortTypes = 'api' | 'gui';

/**
 * Configuration object for the application.
 */
export type Config = {
  /** TLS configuration */
  tls: {
    /** Path to the certificate file */
    cert: string;
    /** Path to the key file */
    key: string;
  };
  /** Port number for the server */
  ports: {
    [key in ConfigPortTypes]: number;
  },
  /** JetStream configuration */
  jetstream: {
    /** Array of JetStream server addresses */
    servers: string[];
    /** Name of the JetStream stream */
    streamName: string;
    /** Name of the JetStream consumer */
    consumerName: string;
  };
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
  /** JetStream-related objects */
  jetStream: {
    /** NATS connection */
    nc: NatsConnection;
    /** JetStream manager */
    jsm: JetStreamManager;
    /** JetStream client */
    js: JetStreamClient;
  }
  /** Functions added to this array will be executed when the server is closed */
  cleanups: Array<() => Promise<void>>;
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
    // @ts-expect-error TS2739
    jetStream : {},
    cleanups: []
  };

  return context;
}
