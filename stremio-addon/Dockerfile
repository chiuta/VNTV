FROM node:22-alpine
WORKDIR /app
COPY package.json index.js i18n.json ./
ENV PORT=7000 CACHE_FILE=/data/translations.json
RUN mkdir -p /data && chown node /data
VOLUME /data
HEALTHCHECK --interval=60s --timeout=5s CMD wget -qO- http://127.0.0.1:7000/health || exit 1
EXPOSE 7000
USER node
CMD ["node", "index.js"]
