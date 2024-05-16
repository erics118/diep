FROM node:20

WORKDIR /app

COPY server/package*.json ./

RUN npm ci

COPY server/ .

RUN npm run build

CMD [ "node", "lib/index.js" ]
