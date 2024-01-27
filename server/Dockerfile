FROM node:18-alpine AS build

WORKDIR /app
COPY . .

RUN yarn

ARG IDENTIFY_VERSION_KEY
RUN sed -i "s/IDENTIFY_VERSION_KEY/${IDENTIFY_VERSION_KEY:=tiger}/g" /app/src/app/io/middleware/auth.ts
ARG NODE_ENV
RUN yarn build

EXPOSE 7001

CMD ["yarn", "online"]