# --- deps: install with bun (project uses bun.lock) ---
FROM oven/bun:1-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- build: Next build under Node (npm bundled in node image runs the script) ---
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Tenant-agnostic build: NO TENANT or NEXT_PUBLIC_* build-args. The image bundles
# every tenant; the running container selects one at RUNTIME via its TENANT env var,
# and SUPABASE_* are server-only runtime env. One universal image serves all domains.
RUN npm run build

# --- runner: minimal Node runtime serving standalone output ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN apk add --no-cache libc6-compat
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
