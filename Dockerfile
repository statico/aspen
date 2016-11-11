FROM ubuntu:16.04

RUN apt-get update
RUN apt-get install -y unrtf par git openjdk-8-jre-headless

ADD http://mirror.stjschools.org/public/apache/tika/tika-app-1.14.jar /tika.jar

ENV NODE_VERSION 4.6.2
ADD https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz /node.tar.gz
RUN tar -xzf /node.tar.gz -C /usr/local --strip-components=1 && rm /node.tar.gz

COPY ./ /aspen/
WORKDIR /aspen/
RUN npm install --silent
RUN npm install --silent --global bower && bower install --allow-root

ENV PATH=$PATH:/aspen/node_modules/.bin:/aspen/bin

VOLUME /aspen/static/data

EXPOSE 8080
ENV ELASTICSEARCH_URL http://elasticsearch:9200
CMD ["coffee", "app.coffee"]
