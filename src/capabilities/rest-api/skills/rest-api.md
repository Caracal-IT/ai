# Skill: REST API Standards

## Description
Design and implement RESTful HTTP APIs that are consistent, discoverable, and versioned.

## Steps
1. Follow RFC 7231 HTTP semantics (GET is idempotent, POST creates, etc.).
2. Use problem+json (RFC 9457) for error responses.
3. Version the API through URL path (/v1/…) or Accept header.
4. Document every endpoint with OpenAPI 3.x.
5. Validate request bodies and return 400 on schema violations.
