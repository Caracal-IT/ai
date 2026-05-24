---
name: "redis-cache"
description: "Use Redis for caching, session storage, or rate-limiting."
applyTo: "**"
---

# Skill: Redis Cache

## Description
Use Redis for caching, session storage, or rate-limiting.

## Steps
1. Connect via the idiomatic client for the chosen stack.
2. Set explicit TTLs on all cached keys.
3. Handle cache misses gracefully – fall through to the source of truth.
4. Test cache hit and miss paths separately.
