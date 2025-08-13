# Use a lightweight Node.js image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy the rest of the application source code
COPY . .

# Create a non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Change the ownership of the app directory
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 3000

# The command to start the application
CMD ["node", "src/server.js"]
