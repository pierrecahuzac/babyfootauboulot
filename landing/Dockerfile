FROM node:20.18.1-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ "$NODE_ENV" = "production" ]; then npm ci --omit=dev; else npm install; fi
COPY . ./
RUN chown -R node:node /app
USER node
EXPOSE 55175
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://localhost:55175/ || exit 1
CMD ["npm", "run", "dev"]
