# syntax = docker/dockerfile:1

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app
ENV NODE_ENV="production"

# ── Build stage ──────────────────────────────────────────────────────────────
FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      build-essential node-gyp pkg-config python-is-python3 && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY package-lock.json package.json ./
RUN npm ci --omit=dev

COPY . .

# ── Final stage ───────────────────────────────────────────────────────────────
FROM base

# Chromium + dependências necessárias para Puppeteer headless
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      chromium \
      fonts-noto \
      fonts-noto-cjk \
      libnss3 \
      libatk1.0-0 \
      libatk-bridge2.0-0 \
      libcups2 \
      libdrm2 \
      libxkbcommon0 \
      libxcomposite1 \
      libxdamage1 \
      libxfixes3 \
      libxrandr2 \
      libgbm1 \
      libasound2 && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY --from=build /app /app

# Diretórios persistentes para sessão e cache do WhatsApp
# chmod 777 garante escrita pelo usuário node mesmo após o volume ser montado
# (volumes sobrescrevem permissões definidas via chown no build)
RUN mkdir -p /app/.wwebjs_auth /app/.wwebjs_cache && \
    chmod 777 /app/.wwebjs_auth /app/.wwebjs_cache

USER node

EXPOSE 3000

# Aponta para o Chromium instalado pelo apt
ENV PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium"
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"

CMD ["node", "bot.js"]
