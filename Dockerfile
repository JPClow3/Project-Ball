FROM node:24-bookworm-slim AS build

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY . .

ARG PUBLIC_APP_NAME=Project Ball
ARG PUBLIC_APP_URL=http://localhost:4321
ARG PUBLIC_SUPPORT_URL=https://t.me/projectball_support
ARG PUBLIC_CHAIN_ID=11142220
ARG PUBLIC_CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
ARG PUBLIC_CELO_EXPLORER_URL=https://celo-sepolia.blockscout.com
ARG PUBLIC_PROJECT_BALL_POOLS_ADDRESS=0x0000000000000000000000000000000000000000

ENV PUBLIC_APP_NAME=$PUBLIC_APP_NAME
ENV PUBLIC_APP_URL=$PUBLIC_APP_URL
ENV PUBLIC_SUPPORT_URL=$PUBLIC_SUPPORT_URL
ENV PUBLIC_CHAIN_ID=$PUBLIC_CHAIN_ID
ENV PUBLIC_CELO_RPC_URL=$PUBLIC_CELO_RPC_URL
ENV PUBLIC_CELO_EXPLORER_URL=$PUBLIC_CELO_EXPLORER_URL
ENV PUBLIC_PROJECT_BALL_POOLS_ADDRESS=$PUBLIC_PROJECT_BALL_POOLS_ADDRESS

RUN pnpm --filter @project-ball/shared build
RUN pnpm --filter @project-ball/web build

FROM node:24-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/apps/web/migrations ./apps/web/migrations
COPY --from=build /app/apps/web/scripts ./apps/web/scripts
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

EXPOSE 4321

ENTRYPOINT ["/docker-entrypoint.sh"]
