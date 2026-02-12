#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Usage: scripts/release-npm.sh [--bump patch|minor|major] [--dry-run]

Examples:
  pnpm release:patch
  pnpm release:minor
  pnpm release:major
  pnpm release:dry
EOF
}

log() {
  printf '\n[release] %s\n' "$1"
}

fail() {
  if [[ -n "${AUTH_NPMRC:-}" && -f "${AUTH_NPMRC:-}" ]]; then
    rm -f "${AUTH_NPMRC}"
  fi
  printf '\n[release] ERROR: %s\n' "$1" >&2
  exit 1
}

BUMP_TYPE="patch"
DRY_RUN=false
AUTH_NPMRC=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bump)
      [[ $# -ge 2 ]] || fail "--bump requires one value: patch, minor, or major."
      BUMP_TYPE="$2"
      shift 2
      ;;
    patch|minor|major)
      BUMP_TYPE="$1"
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

case "$BUMP_TYPE" in
  patch|minor|major) ;;
  *) fail "Invalid bump type: $BUMP_TYPE (expected: patch, minor, major)." ;;
esac

for cmd in node npm pnpm; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing required command: $cmd"
done

PACKAGE_NAME="$(node -p "require('./package.json').name")"
CURRENT_VERSION="$(node -p "require('./package.json').version")"

NEXT_VERSION="$(node -e '
const fs = require("fs");
const bump = process.argv[1];
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version);
if (!match) {
  console.error(`Unsupported version format: ${pkg.version}. Expected x.y.z.`);
  process.exit(1);
}
let [major, minor, patch] = match.slice(1).map(Number);
if (bump === "major") {
  major += 1;
  minor = 0;
  patch = 0;
} else if (bump === "minor") {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}
process.stdout.write(`${major}.${minor}.${patch}`);
' "$BUMP_TYPE")"

log "Package: ${PACKAGE_NAME}"
log "Version bump: ${CURRENT_VERSION} -> ${NEXT_VERSION} (${BUMP_TYPE})"

if npm view "${PACKAGE_NAME}@${NEXT_VERSION}" version >/dev/null 2>&1; then
  fail "${PACKAGE_NAME}@${NEXT_VERSION} already exists on npm. Pick a different bump."
fi

log "Installing root dependencies"
pnpm install --frozen-lockfile

log "Installing web-ui dependencies"
pnpm --prefix web-ui install --frozen-lockfile

log "Running checks/tests/build gate"
pnpm check:all

log "Building web-ui bundle for publish artifact"
pnpm ui:build
[[ -f "web-ui/dist/index.html" ]] || fail "web-ui build output missing: web-ui/dist/index.html"

log "Verifying npm authentication"
if [[ -n "${NPM_TOKEN:-}" ]]; then
  AUTH_NPMRC="$(mktemp)"
  printf "//registry.npmjs.org/:_authToken=%s\n" "${NPM_TOKEN}" > "${AUTH_NPMRC}"
  export NPM_CONFIG_USERCONFIG="${AUTH_NPMRC}"
fi
npm whoami --registry=https://registry.npmjs.org >/dev/null 2>&1 || fail "npm auth failed. Set NPM_TOKEN or run: npm login"

pkg_backup="$(mktemp)"
server_backup="$(mktemp)"
cp package.json "$pkg_backup"
cp server.json "$server_backup"

ROLLBACK_REQUIRED=true
cleanup() {
  local status=$?
  if [[ "$ROLLBACK_REQUIRED" == "true" ]]; then
    cp "$pkg_backup" package.json
    cp "$server_backup" server.json
    if [[ $status -ne 0 ]]; then
      printf '\n[release] Release failed. Restored package.json and server.json.\n' >&2
    fi
  fi
  if [[ -n "${AUTH_NPMRC:-}" && -f "${AUTH_NPMRC:-}" ]]; then
    rm -f "${AUTH_NPMRC}"
  fi
  rm -f "$pkg_backup" "$server_backup"
}
trap cleanup EXIT

log "Updating package.json and server.json to ${NEXT_VERSION}"
node -e '
const fs = require("fs");
const version = process.argv[1];

const pkgPath = "package.json";
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.version = version;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const serverPath = "server.json";
const server = JSON.parse(fs.readFileSync(serverPath, "utf8"));
server.version = version;
let npmEntriesUpdated = 0;
if (Array.isArray(server.packages)) {
  for (const entry of server.packages) {
    if (entry && entry.registryType === "npm") {
      entry.version = version;
      npmEntriesUpdated += 1;
    }
  }
}
if (npmEntriesUpdated === 0) {
  console.error("server.json has no npm package entries to version.");
  process.exit(1);
}
fs.writeFileSync(serverPath, `${JSON.stringify(server, null, 2)}\n`);
' "$NEXT_VERSION"

log "Packing npm artifact"
mkdir -p ./.artifacts
pnpm pack --pack-destination ./.artifacts

if [[ "$DRY_RUN" == "true" ]]; then
  log "Running publish dry-run"
  pnpm publish --access public --no-git-checks --dry-run
  log "Dry-run successful for ${PACKAGE_NAME}@${NEXT_VERSION}. Version files were restored."
  exit 0
fi

log "Publishing ${PACKAGE_NAME}@${NEXT_VERSION} to npm"
PUBLISH_ARGS=(--access public --no-git-checks)
if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  PUBLISH_ARGS+=(--provenance)
fi
pnpm publish "${PUBLISH_ARGS[@]}"

ROLLBACK_REQUIRED=false
log "Publish successful."
