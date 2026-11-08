FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    DATABASE_FILE=/app/data/habitflow.db

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY src ./src
RUN mkdir -p data && chown node:node data

USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
