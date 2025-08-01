# Dockerfile for Pactwise Supabase Backend
# Multi-stage build for optimal size and security

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Development dependencies and build
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files and install all dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate types and run build tasks
RUN npm run types:generate || true
RUN npm run typecheck

# Stage 3: Runtime image
FROM denoland/deno:alpine-1.40.5 AS runtime

# Install required tools
RUN apk add --no-cache \
    curl \
    bash \
    postgresql-client \
    aws-cli \
    jq \
    git

# Install Supabase CLI
ENV SUPABASE_VERSION=1.131.0
RUN curl -L "https://github.com/supabase/cli/releases/download/v${SUPABASE_VERSION}/supabase_linux_amd64.tar.gz" | tar xz && \
    mv supabase /usr/local/bin/

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy edge functions
COPY --chown=nodejs:nodejs supabase/functions ./supabase/functions
COPY --chown=nodejs:nodejs supabase/functions-utils ./supabase/functions-utils

# Copy migrations and configs
COPY --chown=nodejs:nodejs supabase/migrations ./supabase/migrations
COPY --chown=nodejs:nodejs supabase/config.toml ./supabase/config.toml

# Copy deployment scripts
COPY --chown=nodejs:nodejs scripts ./scripts

# Copy types
COPY --chown=nodejs:nodejs supabase/types ./supabase/types

# Set environment
ENV NODE_ENV=production
ENV DENO_DIR=/app/.cache/deno

# Create cache directory
RUN mkdir -p /app/.cache/deno && \
    chown -R nodejs:nodejs /app/.cache

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Default command
CMD ["deno", "run", "--allow-all", "supabase/functions/_shared/server.ts"]