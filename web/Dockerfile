FROM node:20.18.1-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ "$NODE_ENV" = "production" ]; then npm ci --omit=dev; else npm install; fi
COPY . ./
RUN chown -R node:node /app
USER node
EXPOSE 55174
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://localhost:55174/ || exit 1
# local dev : vite avec HMR, proxy /api -> api:33333 via host.docker.internal ou VITE_API_URL
CMD ["npm", "run", "dev"]
