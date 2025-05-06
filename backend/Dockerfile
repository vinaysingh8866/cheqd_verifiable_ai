FROM node:20

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN yarn install

# Rebuild problematic native modules
RUN npm rebuild @2060.io/ref-napi --build-from-source || echo "Continuing despite errors"

# Copy source code
COPY . .

# Build application
RUN yarn build

# Expose API port
EXPOSE 3002
# Expose Agent port
EXPOSE 3001

# Start the application
CMD ["yarn", "start"] 