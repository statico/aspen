FROM node:4
COPY ./ /aspen/
WORKDIR /aspen/
RUN npm install --silent
RUN npm install --silent --global bower && bower install --allow-root
EXPOSE 8080
ENV ELASTICSEARCH_URL http://elasticsearch:9200
VOLUME /aspen/static/data
CMD ["./node_modules/.bin/coffee", "app.coffee"]
