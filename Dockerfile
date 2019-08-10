FROM ubuntu:latest

RUN apt-get update
RUN apt-get install -y unrtf par git openjdk-8-jre-headless curl

RUN curl -sL http://apache.mirrors.pair.com/tika/tika-app-1.22.jar >/tika.jar

ENV NODE_VERSION 8.5.0
RUN curl -sL https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz >/node.tar.gz
RUN tar -xzf /node.tar.gz -C /usr/local --strip-components=1 && rm /node.tar.gz

COPY ./ /aspen/
WORKDIR /aspen/
RUN npm install --silent --global yarn
RUN yarn install --pure-lockfile --non-interactive
RUN yarn run build

ENV PATH=$PATH:/aspen/node_modules/.bin:/aspen/bin

RUN ln -s /data /aspen/static/data
VOLUME /data

EXPOSE 3000
CMD ["yarn", "start"]