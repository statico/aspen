FROM node:16

RUN apt-get update
RUN apt-get install -y unrtf par git openjdk-11-jre-headless curl

RUN curl -sL https://archive.apache.org/dist/tika/tika-app-1.22.jar >/tika.jar

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn --production
COPY ./ /app/
RUN yarn run build

ENV PATH=$PATH:/app/node_modules/.bin:/app/bin

VOLUME /app/public/data

EXPOSE 3000
CMD ["yarn", "start"]
