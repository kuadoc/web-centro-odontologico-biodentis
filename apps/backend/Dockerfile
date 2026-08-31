FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-validators/package.json ./packages/shared-validators/
COPY packages/config/package.json ./packages/config/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @biodentis/shared-types build
RUN pnpm --filter @biodentis/shared-validators build
RUN pnpm --filter @biodentis/backend db:generate
RUN pnpm --filter @biodentis/backend build

EXPOSE 3000

CMD ["pnpm", "--filter", "@biodentis/backend", "start"]
