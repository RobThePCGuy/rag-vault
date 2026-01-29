#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./scripts/release.sh [patch|minor|major]${NC}"
    echo "  patch: 1.0.0 -> 1.0.1 (bug fixes)"
    echo "  minor: 1.0.0 -> 1.1.0 (new features)"
    echo "  major: 1.0.0 -> 2.0.0 (breaking changes)"
    exit 1
fi

VERSION_TYPE=$1

# Ensure clean working directory
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: Working directory not clean. Commit or stash changes first.${NC}"
    exit 1
fi

# Ensure on main branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
    echo -e "${YELLOW}Warning: Not on main branch (currently on $BRANCH)${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then exit 1; fi
fi

echo -e "${GREEN}Building project...${NC}"
pnpm build

echo -e "${GREEN}Running tests...${NC}"
pnpm test

echo -e "${GREEN}Bumping version ($VERSION_TYPE)...${NC}"
# Bump version without git commit (we'll commit both package.json files together)
npm version $VERSION_TYPE --no-git-tag-version

NEW_VERSION=$(node -p "require('./package.json').version")

# Update web-ui/package.json to match
echo -e "${GREEN}Syncing web-ui version to v$NEW_VERSION...${NC}"
cd web-ui
npm version $NEW_VERSION --no-git-tag-version --allow-same-version
cd ..

# Commit both version changes and create tag
git add package.json web-ui/package.json
git commit -m "chore: release v$NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "v$NEW_VERSION"
echo -e "${GREEN}New version: v$NEW_VERSION${NC}"

echo -e "${GREEN}Publishing to npm...${NC}"
npm publish --access public

echo -e "${GREEN}Pushing to GitHub...${NC}"
git push origin main --follow-tags

echo -e "${GREEN}Creating GitHub release...${NC}"
gh release create "v$NEW_VERSION" --generate-notes

echo -e "${GREEN}Publishing to MCP Registry...${NC}"
if command -v mcp-publisher &> /dev/null; then
    mcp-publisher publish
else
    echo -e "${YELLOW}mcp-publisher not installed. Install with:${NC}"
    echo "  curl -L \"https://github.com/modelcontextprotocol/registry/releases/download/v1.1.0/mcp-publisher_1.1.0_\$(uname -s | tr '[:upper:]' '[:lower:]')_\$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz\" | tar xz mcp-publisher"
    echo "  sudo mv mcp-publisher /usr/local/bin/"
    echo "Then run: mcp-publisher login github && mcp-publisher publish"
fi

echo -e "${GREEN}Done! v$NEW_VERSION released.${NC}"
echo ""
echo "Verify at:"
echo "  - https://registry.modelcontextprotocol.io"
echo "  - https://www.npmjs.com/package/rag-vault"
