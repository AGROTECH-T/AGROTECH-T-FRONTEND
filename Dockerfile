# Imagen de producción del frontend de AGROTECH-T.
# Propósito: compilar Vite y servir el sitio con Nginx.
# Contexto: el navegador llama al API publicado en el puerto 8090.
# @author Cristian Deysdayr Jimenez

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=http://localhost:8090
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:1.28-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
