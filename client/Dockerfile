FROM node:alpine

WORKDIR /client

COPY ./package*.json ./

RUN npm install
RUN npx browserslist --update-db

COPY . .

CMD ["npm", "start"]