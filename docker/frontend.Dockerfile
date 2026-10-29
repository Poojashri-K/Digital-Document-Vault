# Multi-stage Dockerfile for Digital Document Vault Frontend
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package descriptors and install dependencies
COPY frontend/package.json ./
RUN npm install

# Copy source and build assets
COPY frontend/ ./
RUN npm run build

# Production web server
FROM nginx:1.25-alpine

# Copy custom Nginx reverse proxy configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy production static build artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
