# CanhazDB

CanhazDB is a lightweight, event-sourced database built on top of NATS JetStream. It provides a simple HTTP API for CRUD operations and uses an in-memory database with event sourcing for persistence.

## Features

- HTTPS server for secure communications
- CRUD operations (Create, Read, Update, Delete)
- Event sourcing using NATS JetStream
- In-memory database for fast read operations
- Configurable settings for different environments

## Prerequisites

- Node.js (version 14 or higher recommended)
- NATS server running with JetStream enabled

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/canhazdb/server.git
   cd canhazdb
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your SSL certificates in the `certs` folder:
   - `cert.pem`: Your SSL certificate
   - `key.pem`: Your SSL private key

## Configuration

Edit the configuration files in the `src/config` directory to match your environment:

- `development.ts`: Configuration for development environment
- Add more configuration files as needed for different environments

## Usage

To start the server:

```
npm start
```

The server will start on the configured port (default is 3000 for development).

## API Endpoints

- `POST /:collection`: Create a new document
- `GET /:collection/:id`: Retrieve a document
- `GET /:collection`: Retrieve all documents in a collection
- `PUT /:collection/:id`: Update a document
- `PATCH /:collection/:id`: Partially update a document
- `DELETE /:collection/:id`: Delete a document

## Testing

Run the tests using:

```
npm test
```

## Project Structure

- `src/`: Source code
  - `config/`: Configuration files
  - `createServer.ts`: Main server creation logic
  - `index.ts`: Entry point
- `tests/`: Test files

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[AGPL v3](LICENSE)
