# Build from the repository root:  docker build -f apps/api/Dockerfile -t familyhub-api .
FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
COPY supabase/tests/package.json supabase/tests/
RUN npm ci -w @familyhub/shared -w @familyhub/api --ignore-scripts
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @familyhub/shared && npm run build -w @familyhub/api \
 && npm prune --omit=dev -w @familyhub/shared -w @familyhub/api

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/packages/shared/package.json packages/shared/package.json
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/apps/api/package.json apps/api/package.json
COPY --from=build /repo/apps/api/dist apps/api/dist
USER node
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://127.0.0.1:${PORT:-3000}/health || exit 1
CMD ["node", "apps/api/dist/main.js"]
