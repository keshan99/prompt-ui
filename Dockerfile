# ---------- Build Stage ----------
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package.json package-lock.json ./
RUN npm install

# Copy the full source
COPY . .

# Build the production bundle
RUN npm run build

# ---------- Runtime Stage ----------
FROM nginx:stable

# Copy the built frontend to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
