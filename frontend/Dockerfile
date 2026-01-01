# frontend/Dockerfile

# Use official Node image (lightweight)
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files first (better caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project
COPY . .

# Expose the Vite port (default is 5173)
EXPOSE 5173

# Start the development server (host 0.0.0.0 is crucial for Docker)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]