FROM node:22-slim AS base
RUN apt-get update && apt-get install -y python3 python3-pip python3-pandas python3-setuptools --no-install-recommends && rm -rf /var/lib/apt/lists/*
RUN python3 -m pip install nfl-data-py --break-system-packages

WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY . .
RUN mkdir -p public
RUN npx prisma generate
RUN npm run build

FROM node:22-slim AS runner
RUN apt-get update && apt-get install -y python3 python3-pip python3-pandas python3-setuptools --no-install-recommends && rm -rf /var/lib/apt/lists/*
RUN python3 -m pip install nfl-data-py --break-system-packages

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
