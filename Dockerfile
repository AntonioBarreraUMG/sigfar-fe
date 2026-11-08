# Compilación del frontend: sin variables de entorno sensibles.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# El servicio frontend es independiente del backend.
FROM nginx:stable-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
# El entrypoint oficial de nginx reemplaza BACKEND_URL en la plantilla.
