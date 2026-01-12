#!/bin/bash
set -Eeuo pipefail

# Configuration
IMAGE_NAME="react-portfolio-web"
CONTAINER_NAME="react-portfolio"
HOST_PORT="8080"
CONTAINER_PORT="80"

echo "=================================================="
echo "🚀 Starting React Portfolio Deployment"
echo "=================================================="

# Run cleanup first (ignore errors if nothing exists)
echo ""
echo "🧹 Running cleanup..."
bash "$(dirname "$0")/cleanup.sh" || true

echo ""
echo "🏗️  Building Docker image: ${IMAGE_NAME}"
DOCKER_BUILDKIT=1 docker build -t "${IMAGE_NAME}" .

echo ""
echo "🚢 Starting container: ${CONTAINER_NAME}"
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  --restart unless-stopped \
  "${IMAGE_NAME}"

echo ""
echo "=================================================="
echo "✅ Deployment Complete!"
echo "=================================================="
echo "🌐 Your portfolio is running at:"
echo "   http://localhost:${HOST_PORT}"
echo ""
echo "📊 Container status:"
docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "To stop: bash scripts/cleanup.sh"
echo "=================================================="
