FROM node:18-alpine AS builder
WORKDIR /app
COPY widget/package*.json /app/
COPY widget/tsconfig*.json /app/
COPY widget/vite.config.ts /app/
RUN npm ci
COPY widget /app

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY widget/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80

