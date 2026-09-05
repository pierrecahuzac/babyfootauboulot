FROM node:20.18.1-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
# prod utilise ci --omit=dev, dev garde tout pour drizzle-kit
RUN if [ "$NODE_ENV" = "production" ]; then npm ci --omit=dev; else npm install; fi
COPY drizzle.config.js ./drizzle.config.js
COPY src ./src
RUN chown -R node:node /app
USER node
# Render attend 10000, local 33333 -> PORT env dynamique
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://localhost:${PORT:-10000}/health || exit 1
CMD ["npm", "start"]
