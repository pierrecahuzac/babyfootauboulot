FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
ARG PUBLIC_APP_URL
ENV PUBLIC_APP_URL=$PUBLIC_APP_URL
RUN npm ci --include=optional
COPY . ./
RUN npm run build
RUN chown -R node:node /app
USER node
EXPOSE 55175
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://localhost:55175/ || exit 1
# Prod: sert le build Astro (static) via preview. Dev override via command: npm run dev
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "55175"]
