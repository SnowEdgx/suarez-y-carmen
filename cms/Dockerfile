FROM node:22-bookworm-slim AS build

WORKDIR /app
ENV NODE_ENV=production
ENV STRAPI_TELEMETRY_DISABLED=true

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY . .
RUN npm run build
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV STRAPI_TELEMETRY_DISABLED=true

COPY --chown=node:node --from=build /app ./
RUN mkdir -p database/migrations public/uploads .tmp \
  && chown node:node /app database database/migrations public public/uploads .tmp

EXPOSE 1337

USER node

CMD ["npm", "run", "start"]
