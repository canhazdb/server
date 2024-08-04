# Build stage
FROM node:22-alpine AS builder

EXPOSE 3000
EXPOSE 3001

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install OS dependencies
RUN apk update && apk add curl

# Install dependencies
RUN npm ci

# Copy the rest of your app's source code
COPY . .

# Install tsx globally
RUN npm install -g tsx

# Run the downloadNats script
RUN tsx build/downloadNats.ts

# Run npm build commands
RUN npm run build
RUN npm run build:ui

# Create necessary directories
RUN mkdir -p /app/dist /app/nats-server

# Move the dist folder to the workdir
RUN mv dist/* /app/dist/

# Move the downloaded nats-server to the workdir
RUN mv /tmp/downloads/nats /app/nats-server/
RUN chmod +x /app/nats-server/nats/nats-server

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy dist and nats-server from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/nats-server ./nats-server

# Create a startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo '/app/nats-server/nats/nats-server -js -sd /data -p 4222 -m 8222 &' >> /app/start.sh && \
    echo 'npm run start' >> /app/start.sh && \
    chmod +x /app/start.sh

# Set the command to run the startup script
CMD ["/app/start.sh"]
