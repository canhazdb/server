# Build stage
FROM node:22-alpine AS builder

EXPOSE 3000

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

# Run npm build commands
RUN npm run build
RUN npm run build:ui

# Move the dist folder to the workdir
RUN mv dist/* /app/dist/

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy dist from builder stage
COPY --from=builder /app/dist ./dist

# Set the command to run the startup script
CMD ["npm", "run", "start"]
