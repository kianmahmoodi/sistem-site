FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev

COPY api/src ./src

EXPOSE 8000
CMD ["node", "src/index.js"]
