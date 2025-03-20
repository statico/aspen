FROM node:22

RUN apt-get update
RUN apt-get install -y unrtf par git openjdk-17-jre-headless curl

RUN curl -sL https://archive.apache.org/dist/tika/tika-app-1.22.jar >/tika.jar

WORKDIR /app
ENV HUSKY=0
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod
COPY ./ /app/
RUN pnpm run build

ENV PATH=/app/bin:$PATH:/app/node_modules/.bin

VOLUME /app/public/data

EXPOSE 3000
CMD ["pnpm", "start"]
