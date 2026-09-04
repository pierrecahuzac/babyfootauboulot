FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . ./
EXPOSE 55174
# local dev : vite avec HMR, proxy /api -> api:33333 via host.docker.internal ou VITE_API_URL
CMD ["npm", "run", "dev"]
