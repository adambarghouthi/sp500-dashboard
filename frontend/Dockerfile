FROM oven/bun:1.1 AS base
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install
COPY . .
ARG BACKEND_URL=http://backend:8000
ENV BACKEND_URL=$BACKEND_URL
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "start"]
