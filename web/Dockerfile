FROM node:20.18.1-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
# Build ARG bustable pour VITE (build-time)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm ci
COPY . ./
# Build prod si VITE_API_URL est défini (ou toujours) -> dist/
RUN npm run build
RUN chown -R node:node /app
USER node
EXPOSE 55174
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://localhost:55174/ || exit 1
# En prod on sert le build statique via vite preview (pas HMR)
# En dev, docker-compose.yml override avec command: npm run dev + volumes
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "55174"]
