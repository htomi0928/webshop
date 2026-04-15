FROM node:20-bookworm-slim AS base

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 8000

CMD ["npm", "run", "start:container"]
