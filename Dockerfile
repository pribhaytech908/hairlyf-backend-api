FROM node:18

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
