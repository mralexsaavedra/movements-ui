#!/usr/bin/env bash
# Link project skills into .claude/skills/ so Claude Code discovers them.
# Idempotent: re-running replaces existing symlinks and skips real directories.
#
# Usage: ./skills/setup.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
TARGET_DIR="$REPO_ROOT/.claude/skills"

mkdir -p "$TARGET_DIR"

linked=0
for skill_dir in "$SCRIPT_DIR"/*/; do
  [ -f "$skill_dir/SKILL.md" ] || continue
  name="$(basename "$skill_dir")"
  target="$TARGET_DIR/$name"

  if [ -e "$target" ] && [ ! -L "$target" ]; then
    echo "skip: $target exists and is not a symlink" >&2
    continue
  fi

  ln -sfn "../../skills/$name" "$target"
  echo "linked: .claude/skills/$name -> skills/$name"
  linked=$((linked + 1))
done

# CLAUDE.md mirrors AGENTS.md
if [ ! -e "$REPO_ROOT/CLAUDE.md" ] || [ -L "$REPO_ROOT/CLAUDE.md" ]; then
  ln -sfn "AGENTS.md" "$REPO_ROOT/CLAUDE.md"
fi

echo "done: $linked skill(s) linked"
