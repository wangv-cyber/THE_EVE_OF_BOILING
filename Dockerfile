# Stage 1: Build frontend
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY server.ts ./
COPY services/ ./services/
COPY constants.ts types.ts ./

# Cloud Run uses port 8080
ENV PORT=8080
EXPOSE 8080

CMD ["npx", "tsx", "server.ts"]
