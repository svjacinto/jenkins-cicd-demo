FROM node:20-alpine

WORKDIR /app

USER root

RUN apk upgrade --no-cache

COPY package*.json ./

# RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi && npm cache clean --force
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
    && npm cache clean --force \
    && rm -rf /root/.npm \
    && rm -rf /usr/local/lib/node_modules/npm \
    && rm -rf /usr/local/bin/npm \
    && rm -rf /usr/local/bin/npx \
    && rm -rf /opt/yarn* \
    && rm -rf /usr/local/lib/node_modules/corepack

COPY src ./src

ENV PORT=3000
EXPOSE 3000

USER node

CMD ["node", "src/server.js"]
