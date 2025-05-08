#!/usr/bin/env sh
set -e

# Usage: ./cherry-pick-and-tag.sh <COMMIT_SHA>

COMMIT_SHA=$1

if [ -z "$COMMIT_SHA" ]; then
  echo "❌ Error: Missing arguments."
  echo "👉 Usage: $0 <COMMIT_SHA>"
  echo "   Example: $0 abc1234"
  exit 1
fi

# ========== CHECK CLEAN WORKING DIRECTORY ==========
if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Error: Your working directory is not clean."
  echo "Please commit or stash your changes before running this script."
  exit 1
fi

# ========== CHECK GIT CONFIG ==========
GIT_NAME=$(git config user.name || true)
GIT_EMAIL=$(git config user.email || true)

if [[ -z "$GIT_NAME" || -z "$GIT_EMAIL" ]]; then
  echo "❌ Error: Git user.name or user.email is not configured."
  echo "Please configure them using the following commands:"
  echo ""
  echo "  git config --global user.name \"Your Name\""
  echo "  git config --global user.email \"you@example.com\""
  echo ""
  exit 1
fi

echo "📦 Fetching latest from origin..."
git fetch origin

echo "🌿 Checking out to origin/main..."
git checkout main
git pull origin main

echo "🍒 Cherry-picking commit $COMMIT_SHA..."
git cherry-pick $COMMIT_SHA

VERSION=$(node ./scripts/get-next-prerelease.js origin/rc origin/main | grep BETA_VERSION | cut -d'=' -f2)
echo "🔖 Creating tag $VERSION..."
git tag "$VERSION"


echo "🚀 Pushing changes to origin/rc..."
git push origin rc

echo "🚀 Pushing tag $VERSION to origin..."
git push origin "$VERSION"

echo "✅ Done! Commit $COMMIT_SHA cherry-picked to origin/rc and tagged as $VERSION."
