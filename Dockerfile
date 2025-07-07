# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application
COPY public ./public
COPY server.js ./

# Expose port (default for Node.js server)
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
