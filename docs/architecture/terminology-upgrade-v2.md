# Terminology Upgrade to v2

This document records the cutover from the legacy terminology set to the current v2 terminology set.

## Field Mapping

| Legacy | Current |
|---|---|
| `buyer_id` | `caller_id` |
| `seller_id` | `responder_id` |
| `subagent_id` | `hotline_id` |
| `subagent_ids` | `hotline_ids` |

## Route Mapping

| Legacy | Current |
|---|---|
| `GET /v1/catalog/subagents` | `GET /v2/hotlines` |
| `GET /v1/catalog/subagents/{subagent_id}` | `GET /v2/hotlines/{hotline_id}` |
| `POST /v1/catalog/subagents` | `POST /v2/hotlines` |
| `GET /v1/admin/sellers` | `GET /v2/admin/responders` |
| `GET /v1/admin/subagents` | `GET /v2/admin/hotlines` |
| `POST /v1/sellers/{seller_id}/heartbeat` | `POST /v2/responders/{responder_id}/heartbeat` |

## Event and Error Mapping

| Legacy | Current |
|---|---|
| `buyer.request.*` | `caller.request.*` |
| `seller.task.*` | `responder.task.*` |
| `BUYER_*` | `CALLER_*` |
| `SELLER_*` | `RESPONDER_*` |
| `SUBAGENT_*` | `HOTLINE_*` |

## Package and Artifact Mapping

| Legacy | Current |
|---|---|
| `@delexec/buyer-controller` | `@delexec/caller-controller` |
| `@delexec/buyer-controller-core` | `@delexec/caller-controller-core` |
| `@delexec/buyer-skill-adapter` | `@delexec/caller-skill-adapter` |
| `@delexec/seller-controller` | `@delexec/responder-controller` |
| `@delexec/seller-runtime-core` | `@delexec/responder-runtime-core` |
| `rsp-buyer` | `rsp-caller` |
| `rsp-seller` | `rsp-responder` |
