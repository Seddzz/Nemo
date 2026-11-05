FROM node:20-alpine

WORKDIR /app

COPY web/package*.json ./
RUN npm ci

COPY web/ ./

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
