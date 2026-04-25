ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-slim AS builder

WORKDIR /app

COPY src ./src
COPY scripts ./scripts
COPY resources ./resources
RUN mkdir -p data && node scripts/preprocess.mjs

FROM node:${NODE_VERSION}-alpine AS deps

WORKDIR /app

RUN apk add --no-cache g++ make python3

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:${NODE_VERSION}-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=9999
ENV RINHA_RESOURCES_DIR=./data

RUN apk add --no-cache libstdc++

COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY --from=builder /app/data ./data

EXPOSE 9999

CMD ["node", "--max-old-space-size=120", "src/server.js"]
