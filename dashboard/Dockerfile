FROM node:18-alpine AS builder
WORKDIR /app
COPY dashboard/package*.json /app/
COPY dashboard/tsconfig*.json /app/
COPY dashboard/vite.config.ts /app/
RUN npm ci
COPY dashboard /app

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80

