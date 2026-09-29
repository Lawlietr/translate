FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:export
RUN if [ -n "$(find out -name '*.wasm*' -size +25M -print -quit)" ]; then \
      echo "FATAL: wasm file exceeds 25 MiB (Cloudflare Pages limit)"; \
      find out -name '*.wasm*' -exec du -h {} +; \
      exit 1; \
    fi

FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint-selfsigned.sh /docker-entrypoint.d/20-selfsigned.sh
RUN chmod +x /docker-entrypoint.d/20-selfsigned.sh
COPY --from=build /app/out /usr/share/nginx/html
