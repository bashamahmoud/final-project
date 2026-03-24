# Use the official, highly-secure lightweight Node.js 20 Alpine image
FROM node:20-alpine

# Set the working directory inside the virtual container
WORKDIR /app

# Copy the package.json and lock files first to leverage Docker layer caching
COPY package*.json ./

# Install ALL dependencies (we need devDependencies because we must run TypeScript build)
RUN npm install

# Copy the entire source code into the container
COPY . .

# Compile the TypeScript files into JavaScript (dist folder)
RUN npm run build

# Expose the API port to the host machine
EXPOSE 8080

# When the container finally boots up:
# 1. Force the database migrations to build our Database schema on the new blank PG instance
# 2. Safely start the Node.js application server
CMD ["sh", "-c", "npm run db:migrate && npm start"]
