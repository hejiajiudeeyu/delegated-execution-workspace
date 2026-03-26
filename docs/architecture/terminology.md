# Terminology v2

This document is the canonical terminology mapping for the current protocol generation.

The current product and protocol surface uses the same primary terms:

- `Caller`
- `Responder`
- `Hotline`
- `Platform`
- `Selfhost`

## Core Rules

- `caller_id`, `responder_id`, and `hotline_id` are the canonical wire identifiers.
- `Buyer`, `Seller`, and `Subagent` are legacy terms and should appear only in upgrade notes or historical context.
- Public REST APIs should prefer `/v2/hotlines`, `/v2/admin/responders`, and `/v2/admin/hotlines`.
- Runtime component names should prefer `Caller Controller`, `Responder Controller`, and `Hotline` terminology.
- `Platform Control` is the external label for the platform review and oversight surface.
- `Selfhost` remains a deployment and product-layer term and does not replace `Platform`.

## Canonical Mapping

| Current Term | Legacy Term | Primary Context |
|---|---|---|
| Caller | Buyer | caller runtime, request ownership, local orchestration |
| Responder | Seller | responder runtime, platform review, capability ownership |
| Hotline | Subagent | published capability unit and marketplace-facing service entry |
| Platform Control | Platform Console | operator surface |

## Migration Boundary

- Old field names, error domains, event names, and package names are deprecated.
- New work should use only current terminology.
- Historical references to `buyer/seller/subagent` should be isolated to upgrade documentation.
