FROM node:20-alpine AS builder

WORKDIR /app

ENV CI=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx vite build

FROM nginx:alpine

COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
