FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Run in development mode
CMD ["npm", "run", "dev", "--", "--host"]
