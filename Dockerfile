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
# NEXT_PUBLIC_* are baked into the client bundle at BUILD time:
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
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
