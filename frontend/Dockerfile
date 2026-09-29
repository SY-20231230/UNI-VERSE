FROM node:24-alpine AS frontend-base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM frontend-base AS development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM frontend-base AS frontend-build
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1