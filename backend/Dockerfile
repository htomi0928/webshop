FROM node:20-bookworm-slim AS base

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN mkdir -p public && \
    if [ -d .medusa/server/public/admin ]; then cp -R .medusa/server/public/admin public/admin; fi

EXPOSE 9000

CMD ["npm", "run", "start:container"]
