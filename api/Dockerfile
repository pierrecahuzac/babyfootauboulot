FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
# Install all deps (incl. drizzle-kit for studio dev) — prod reste safe car studio jamais lancé en prod (profile dev)
RUN npm install
COPY drizzle.config.js ./drizzle.config.js
COPY src ./src
EXPOSE 33333
CMD ["npm", "start"]
