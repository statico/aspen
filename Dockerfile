FROM node:16

RUN apt-get update
RUN apt-get install -y unrtf par git openjdk-11-jre-headless curl

RUN curl -sL https://archive.apache.org/dist/tika/tika-app-1.22.jar >/tika.jar

COPY ./ /aspen/
WORKDIR /aspen/
RUN yarn install --pure-lockfile --non-interactive
RUN yarn run build

ENV PATH=$PATH:/aspen/node_modules/.bin:/aspen/bin

RUN mkdir -p /aspen/static/data && ln -sf /data /aspen/static/data
VOLUME /data

EXPOSE 3000
CMD ["yarn", "start"]
