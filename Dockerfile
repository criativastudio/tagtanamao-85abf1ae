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

COPY --from=builder /app/dist ./dist

EXPOSE 3333

CMD ["node", "dist/index.js"]
  