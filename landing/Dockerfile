FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . ./
EXPOSE 55175
CMD ["npm", "run", "dev"]
