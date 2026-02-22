FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages/shared ./packages/shared

EXPOSE 4000
CMD ["npm", "run", "start", "-w", "@bbb/api"]

FROM node:20-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/web ./apps/web
COPY --from=build /app/packages/shared ./packages/shared

EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@bbb/web"]
