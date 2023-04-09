FROM ubuntu:20.04

RUN apt-get update -y
RUN apt-get upgrade -y

RUN apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs
RUN apt-get -y install gcc
RUN apt-get -y install g++

WORKDIR /worker

RUN mkdir codes
COPY ./package*.json ./

RUN npm install -g nodemon
RUN npm install

COPY . .

CMD ["node", "index.js"]
