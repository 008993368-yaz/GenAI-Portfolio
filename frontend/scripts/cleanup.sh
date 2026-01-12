#!/bin/bash
set -Eeuo pipefail

# Configuration
IMAGE_NAME="react-portfolio-web"
CONTAINER_NAME="react-portfolio"

echo "=================================================="
echo "🧹 Cleaning up React Portfolio Docker resources"
echo "=================================================="

# Stop container if running
echo ""
if docker ps -q --filter "name=${CONTAINER_NAME}" | grep -q .; then
    echo "⏹️  Stopping container: ${CONTAINER_NAME}"
    docker stop "${CONTAINER_NAME}"
    echo "✅ Container stopped"
else
    echo "ℹ️  Container ${CONTAINER_NAME} is not running"
fi

# Remove container if exists
echo ""
if docker ps -aq --filter "name=${CONTAINER_NAME}" | grep -q .; then
    echo "🗑️  Removing container: ${CONTAINER_NAME}"
    docker rm "${CONTAINER_NAME}"
    echo "✅ Container removed"
else
    echo "ℹ️  Container ${CONTAINER_NAME} does not exist"
fi

# Remove image if exists
echo ""
if docker images -q "${IMAGE_NAME}" | grep -q .; then
    echo "🗑️  Removing image: ${IMAGE_NAME}"
    docker rmi "${IMAGE_NAME}"
    echo "✅ Image removed"
else
    echo "ℹ️  Image ${IMAGE_NAME} does not exist"
fi

echo ""
echo "=================================================="
echo "✅ Cleanup complete!"
echo "=================================================="
