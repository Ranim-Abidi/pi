# Build context: PI-Frontend-main/PI-Frontend-main — run: npm ci && npm run build -- --configuration=production
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration=production

FROM nginx:1.27-alpine
COPY deploy/nginx-default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/jove /usr/share/nginx/html
EXPOSE 80
