#!/usr/bin/env bash
# Script to run integration tests with cromper and Django services
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting integration test suite...${NC}"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    exit 1
fi

# Function to cleanup
cleanup() {
    echo -e "${YELLOW}Cleaning up services...${NC}"
    docker-compose -f ../docker-compose.yaml down
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Start services
echo -e "${YELLOW}Starting cromper and Django services...${NC}"
docker-compose -f ../docker-compose.yaml up -d cromper backend postgres

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"

# Wait for cromper with retry logic
MAX_RETRIES=30
RETRY_COUNT=0
echo -n "Checking cromper health..."
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:8888/health > /dev/null 2>&1; then
        echo -e " ${GREEN}OK${NC}"
        break
    fi
    echo -n "."
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e " ${RED}FAILED${NC}"
    echo -e "${RED}Error: Cromper service is not responding after 60 seconds${NC}"
    echo -e "${YELLOW}Checking cromper logs:${NC}"
    docker-compose -f ../docker-compose.yaml logs --tail=50 cromper
    exit 1
fi

echo -e "${GREEN}Services are ready!${NC}"

# Run tests
echo -e "${YELLOW}Running integration tests...${NC}"
cd "$(dirname "$0")"

if uv run pytest "$@"; then
    echo -e "${GREEN}All integration tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some integration tests failed!${NC}"
    exit 1
fi
