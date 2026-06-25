FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY src ./src

ENV PORT=3000
EXPOSE 3000

USER node

CMD ["node", "src/server.js"]
