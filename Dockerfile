# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --legacy-peer-deps

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Copiar arquivos necessários para rodar o preview
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/vite.config.ts ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080

CMD ["npm", "run", "preview"]
  