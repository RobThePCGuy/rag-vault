#!/usr/bin/env bash
set -Eeuo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
  echo -e "${YELLOW}Usage: ./scripts/release.sh [patch|minor|major]${NC}"
  echo "  patch: 1.0.0 -> 1.0.1 (bug fixes)"
  echo "  minor: 1.0.0 -> 1.1.0 (new features)"
  echo "  major: 1.0.0 -> 2.0.0 (breaking changes)"
}

trap 'echo -e "${RED}Error: failed at line ${LINENO}.${NC}"' ERR

VERSION_TYPE="${1:-}"
case "$VERSION_TYPE" in
  patch|minor|major) ;;
  *) usage; exit 1 ;;
esac

for cmd in git node npm pnpm; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo -e "${RED}Error: missing required command: $cmd${NC}"
    exit 1
  fi
done

if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}Error: Working directory not clean. Commit or stash changes first.${NC}"
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [ "$BRANCH" != "main" ]; then
  echo -e "${YELLOW}Warning: Not on main branch (currently on $BRANCH)${NC}"
  if [ -n "${CI:-}" ] || [ "${NONINTERACTIVE:-0}" = "1" ]; then
    echo -e "${RED}Error: refusing to release off main in non-interactive mode.${NC}"
    exit 1
  fi
  read -r -p "Continue anyway? (y/N) " -n 1 REPLY
  echo
  if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then exit 1; fi
fi

echo -e "${GREEN}Fetching origin...${NC}"
git fetch origin main --tags

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"
BASE="$(git merge-base HEAD origin/main)"

if [ "$LOCAL" != "$REMOTE" ]; then
  if [ "$LOCAL" = "$BASE" ]; then
    echo -e "${RED}Error: local branch is behind origin/main. Pull first.${NC}"
    exit 1
  elif [ "$REMOTE" = "$BASE" ]; then
    echo -e "${YELLOW}Warning: local branch is ahead of origin/main.${NC}"
  else
    echo -e "${RED}Error: local and origin/main have diverged. Resolve first.${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}Building project...${NC}"
pnpm build

echo -e "${GREEN}Running tests...${NC}"
pnpm test

echo -e "${GREEN}Bumping version ($VERSION_TYPE)...${NC}"
npm version "$VERSION_TYPE" --no-git-tag-version --ignore-scripts

NEW_VERSION="$(node -p "require('./package.json').version")"
TAG="v$NEW_VERSION"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo -e "${RED}Error: tag $TAG already exists.${NC}"
  exit 1
fi

echo -e "${GREEN}Syncing web-ui version to $TAG...${NC}"
( cd web-ui && npm pkg set "version=$NEW_VERSION" >/dev/null )

git add package.json web-ui/package.json

git commit -m "chore: release $TAG"
git tag -a "$TAG" -m "$TAG"

echo -e "${GREEN}New version: $TAG${NC}"

if command -v gh >/dev/null 2>&1; then
  gh auth status >/dev/null 2>&1 || echo -e "${YELLOW}Warning: gh not authenticated; GitHub release step may fail.${NC}"
else
  echo -e "${YELLOW}Warning: gh not installed; skipping GitHub release step.${NC}"
fi

npm whoami >/dev/null 2>&1 || echo -e "${YELLOW}Warning: npm not authenticated; publish may fail.${NC}"

echo -e "${GREEN}Pushing to GitHub...${NC}"
git push origin "$BRANCH" --follow-tags

echo -e "${GREEN}Publishing to npm...${NC}"
npm publish --access public

if command -v gh >/dev/null 2>&1; then
  echo -e "${GREEN}Creating GitHub release...${NC}"
  gh release create "$TAG" --generate-notes
fi

echo -e "${GREEN}Publishing to MCP Registry...${NC}"
if command -v mcp-publisher >/dev/null 2>&1; then
  mcp-publisher publish
else
  echo -e "${YELLOW}mcp-publisher not installed. Install with:${NC}"
  echo "  curl -L \"https://github.com/modelcontextprotocol/registry/releases/download/v1.1.0/mcp-publisher_1.1.0_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz\" | tar xz mcp-publisher"
  echo "  sudo mv mcp-publisher /usr/local/bin/"
  echo "Then run: mcp-publisher login github && mcp-publisher publish"
fi

echo -e "${GREEN}Done! $TAG released.${NC}"
echo
echo "Verify at:"
echo "  - https://registry.modelcontextprotocol.io"
echo "  - https://www.npmjs.com/package/rag-vault"
