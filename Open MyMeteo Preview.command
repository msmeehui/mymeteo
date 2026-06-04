#!/bin/zsh

script_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$script_dir" || exit 1

node mymeteo-preview.mjs
