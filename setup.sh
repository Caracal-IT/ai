#!/usr/bin/env bash
# Bootstrap script for Caracal-IT/ai.
# Forwards all arguments to npx github:Caracal-IT/ai.
set -e
npx -y github:Caracal-IT/ai "$@"
