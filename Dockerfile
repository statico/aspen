FROM ubuntu:latest

RUN apt-get update
RUN apt-get install -y unrtf par git openjdk-8-jre-headless

ADD http://apache.mirrors.pair.com/tika/tika-app-1.16.jar /tika.jar

ENV NODE_VERSION 8.5.0
ADD https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz /node.tar.gz
RUN tar -xzf /node.tar.gz -C /usr/local --strip-components=1 && rm /node.tar.gz

COPY ./ /aspen/
WORKDIR /aspen/
RUN npm install --silent --global yarn
RUN yarn install --pure-lockfile --non-interactive
RUN yarn run build

ENV PATH=$PATH:/aspen/node_modules/.bin:/aspen/bin

VOLUME /aspen/static/data

EXPOSE 8080
ENV ELASTICSEARCH_URL http://elasticsearch:9200
CMD ["yarn", "start"]
