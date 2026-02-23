FROM node:20-alpine
WORKDIR /app
COPY server.js .
COPY index.html .
COPY assets ./assets
EXPOSE 4000
CMD ["node", "server.js"]
