FROM node:alpine

WORKDIR /server

COPY ./package*.json ./

RUN npm install -g nodemon
RUN npm install

COPY . .

RUN npm run build

CMD ["node", "build/index.js"]
