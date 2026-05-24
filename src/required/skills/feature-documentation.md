---
name: "feature-documentation"
description: "Create and update feature specifications in the docs folder."
whenToUse: "Use when the request says create a feature, change feature, update feature documentation, or similar."
applyTo: "**"
---

# Skill: Feature Documentation

## Description
Create and maintain feature specifications as Markdown files in `docs/<category>/` or `docs/<category>/<sub-category>/`.

## Required Workflow
1. Confirm the request was understood before creating or changing the document.
2. If the category is not provided, ask for it before creating the feature file.
3. If an optional sub-category may be needed and was not provided, ask whether one should be used.
4. Reuse an existing matching feature document when changing a feature instead of creating a duplicate.
5. Store the file in `docs/<category>/<feature-name>.feature.md` or `docs/<category>/<sub-category>/<feature-name>.feature.md`.
6. Use `docs/features/feature-template.feature.md` as the example template when creating a new feature specification.
7. Use a kebab-case filename and always end the file with `.feature.md`.

## Trigger Phrases
- create a feature
- change feature
- update feature
- feature documentation
- feature doc
