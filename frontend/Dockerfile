ARG NODE_BUILD_IMAGE
ARG NODE_RUNTIME_IMAGE
FROM ${NODE_BUILD_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG BACKEND_INTERNAL_URL=http://backend:8080
ENV NEXT_TELEMETRY_DISABLED=1 BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL}
RUN npm run build
FROM ${NODE_RUNTIME_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=10001:10001 /app/.next/standalone ./
COPY --from=build --chown=10001:10001 /app/.next/static ./.next/static
COPY --from=build --chown=10001:10001 /app/public ./public
USER 10001:10001
EXPOSE 3000
CMD ["node", "server.js"]
