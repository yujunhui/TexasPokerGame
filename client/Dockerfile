FROM node:10.24.1-alpine AS node

WORKDIR /app
COPY package.json ./
COPY tsconfig.json ./
COPY yarn.lock ./
RUN yarn install --ignore-engines

COPY . .

ARG NODE_ENV
ARG VUE_APP_API_IP
ARG VUE_APP_API_PORT
ARG IDENTIFY_VERSION_KEY
RUN sed -i "s/IDENTIFY_VERSION_KEY/${IDENTIFY_VERSION_KEY:=tiger}/g" /app/src/views/game.vue
RUN yarn build

FROM nginx:1.24.0-alpine

COPY --from=node /app/dist /usr/share/nginx/html
