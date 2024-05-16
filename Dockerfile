FROM node:20

WORKDIR /app

COPY server/package*.json ./

RUN npm install --omit=dev

COPY server/ .

RUN npm run build

CMD [ "node", "lib/index.js" ]
