#!/usr/bin/env python3
"""
Delegated Execution caller-skill current-surface end-to-end smoke.

This check validates the current /skills/caller/* surface:

1. supervisor and caller-skill adapter are reachable
2. manifest exposes the six MCP-facing caller_skill actions
3. the bundled workspace-summary hotline can be searched, read, prepared,
   sent, and reported through the current progressive-disclosure flow

It intentionally does not call an external LLM. That keeps the daily
fourth-repo validation deterministic while still covering the agent-facing
HTTP truth surface used by the MCP adapter.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


SKILL_ADAPTER_BASE = os.environ.get("SKILL_ADAPTER_BASE_URL", "http://localhost:8091").rstrip("/")
SUPERVISOR_BASE = os.environ.get("SUPERVISOR_BASE_URL", "http://localhost:8079").rstrip("/")
MCP_ADAPTER_BASE = os.environ.get("MCP_ADAPTER_BASE_URL", "http://localhost:8092").rstrip("/")
TEST_HOTLINE_ID = os.environ.get(
    "AGENT_E2E_HOTLINE_ID",
    "local.delegated-execution.workspace-summary.v1",
)
TEST_SESSION_ID = f"agent-e2e-{int(time.time())}"
TEST_INPUT = {
    "text": (
        "CHG-2026-028 advances the platform billing-store implementation. "
        "The fourth repository now validates submodule integrity, boundary "
        "coverage, change bundles, contracts, and source integration on the "
        "current pinned SHA combination."
    ),
    "instruction": "Summarize the status in one sentence and mention the next step."
}

EXPECTED_ACTIONS = {
    "search_hotlines_brief",
    "search_hotlines_detailed",
    "read_hotline",
    "prepare_request",
    "send_request",
    "report_response",
}

assertions: list[dict[str, str]] = []


def assert_that(name: str, condition: bool, detail: str = "") -> bool:
    status = "PASS" if condition else "FAIL"
    assertions.append({"name": name, "status": status, "detail": detail})
    icon = "ok" if condition else "fail"
    suffix = f": {detail}" if detail else ""
    print(f"  [{icon}] {name}{suffix}")
    return condition


def http_json(base_url: str, path: str, method: str = "GET", body=None, timeout: int = 45):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json; charset=utf-8"} if data is not None else {}
    req = urllib.request.Request(f"{base_url}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            text = resp.read().decode("utf-8")
            return {
                "status": resp.status,
                "ok": 200 <= resp.status < 300,
                "body": json.loads(text) if text else None,
            }
    except urllib.error.HTTPError as error:
        text = error.read().decode("utf-8")
        try:
            parsed = json.loads(text) if text else None
        except json.JSONDecodeError:
            parsed = {"error": {"code": "HTTP_ERROR", "message": text or str(error)}}
        return {"status": error.code, "ok": False, "body": parsed}
    except Exception as error:
        return {
            "status": 0,
            "ok": False,
            "body": {"error": {"code": "CONNECTION_ERROR", "message": str(error)}},
        }


def require_ok(name: str, response, expected_status=None) -> bool:
    expected = expected_status or range(200, 300)
    if isinstance(expected, range):
        condition = response["status"] in expected
        detail = f"status={response['status']}"
    else:
        condition = response["status"] == expected
        detail = f"status={response['status']} expected={expected}"
    return assert_that(name, condition, detail)


def print_summary() -> bool:
    passed = sum(1 for item in assertions if item["status"] == "PASS")
    failed = sum(1 for item in assertions if item["status"] == "FAIL")
    print(f"\nAssertions: {passed} passed / {failed} failed / {len(assertions)} total")
    if failed:
        print("Failed assertions:")
        for item in assertions:
            if item["status"] == "FAIL":
                detail = f": {item['detail']}" if item["detail"] else ""
                print(f"  - {item['name']}{detail}")
    return failed == 0


def main() -> int:
    print("=" * 72)
    print("Delegated Execution - caller-skill current-surface e2e")
    print("=" * 72)
    print(f"skill_adapter={SKILL_ADAPTER_BASE}")
    print(f"supervisor={SUPERVISOR_BASE}")
    print(f"mcp_adapter={MCP_ADAPTER_BASE}")
    print(f"hotline={TEST_HOTLINE_ID}")

    print("\n[1/5] Runtime health")
    supervisor = http_json(SUPERVISOR_BASE, "/status", timeout=5)
    require_ok("supervisor_status_reachable", supervisor)
    if supervisor["ok"]:
        runtime = supervisor["body"].get("runtime", {})
        auth = supervisor["body"].get("auth", {})
        assert_that("secrets_unlocked", not auth.get("locked"), f"locked={auth.get('locked')}")
        skill_runtime = runtime.get("skill_adapter", {})
        mcp_runtime = runtime.get("mcp_adapter", {})
        assert_that("supervisor_reports_skill_adapter", bool(skill_runtime), f"running={skill_runtime.get('running')}")
        assert_that("supervisor_reports_mcp_adapter", bool(mcp_runtime), f"running={mcp_runtime.get('running')}")

    skill_health = http_json(SKILL_ADAPTER_BASE, "/healthz", timeout=5)
    require_ok("skill_adapter_healthz", skill_health)

    mcp_health = http_json(MCP_ADAPTER_BASE, "/healthz", timeout=5)
    require_ok("mcp_adapter_healthz", mcp_health)

    print("\n[2/5] Manifest")
    manifest_response = http_json(SKILL_ADAPTER_BASE, "/skills/caller/manifest", timeout=5)
    if not require_ok("manifest_reachable", manifest_response):
        return 1
    manifest = manifest_response["body"]
    action_names = {action.get("name") for action in manifest.get("actions", [])}
    assert_that("manifest_exposes_expected_actions", action_names == EXPECTED_ACTIONS, f"actions={sorted(action_names)}")

    print("\n[3/5] Hotline discovery")
    brief_response = http_json(
        SKILL_ADAPTER_BASE,
        "/skills/caller/search-hotlines-brief",
        method="POST",
        body={
            "task_goal": "summarize workspace status",
            "task_type": "text_summarize",
            "limit": 8,
        },
        timeout=10,
    )
    if not require_ok("search_hotlines_brief", brief_response):
        return 1
    brief_items = brief_response["body"].get("items", [])
    brief_target = next((item for item in brief_items if item.get("hotline_id") == TEST_HOTLINE_ID), None)
    assert_that("brief_search_finds_test_hotline", brief_target is not None, f"count={len(brief_items)}")

    detailed_response = http_json(
        SKILL_ADAPTER_BASE,
        "/skills/caller/search-hotlines-detailed",
        method="POST",
        body={"hotline_ids": [TEST_HOTLINE_ID]},
        timeout=10,
    )
    if not require_ok("search_hotlines_detailed", detailed_response):
        return 1
    detailed_items = detailed_response["body"].get("items", [])
    detailed_target = next((item for item in detailed_items if item.get("hotline_id") == TEST_HOTLINE_ID), None)
    assert_that("detailed_search_finds_test_hotline", detailed_target is not None, f"count={len(detailed_items)}")
    if detailed_target:
        assert_that("detailed_search_has_responder", bool(detailed_target.get("responder_id")), detailed_target.get("responder_id", ""))

    print("\n[4/5] Read and prepare")
    read_response = http_json(
        SKILL_ADAPTER_BASE,
        f"/skills/caller/hotlines/{urllib.parse.quote(TEST_HOTLINE_ID)}",
        timeout=10,
    )
    if not require_ok("read_hotline", read_response):
        return 1
    hotline = read_response["body"]
    input_schema = hotline.get("input_schema") or {}
    required_fields = set(input_schema.get("required") or [])
    assert_that("read_hotline_has_text_schema", "text" in required_fields, f"required={sorted(required_fields)}")
    assert_that("read_hotline_has_output_schema", bool(hotline.get("output_schema")), "")

    prepare_response = http_json(
        SKILL_ADAPTER_BASE,
        "/skills/caller/prepare-request",
        method="POST",
        body={
            "hotline_id": TEST_HOTLINE_ID,
            "input": TEST_INPUT,
            "agent_session_id": TEST_SESSION_ID,
        },
        timeout=10,
    )
    if not require_ok("prepare_request", prepare_response):
        return 1
    prepared = prepare_response["body"]
    assert_that("prepare_request_ready", prepared.get("status") == "ready", f"status={prepared.get('status')}")
    prepared_request_id = prepared.get("prepared_request_id")
    assert_that("prepare_request_returns_id", bool(prepared_request_id), str(prepared_request_id or ""))
    if not prepared_request_id:
        return 1

    print("\n[5/5] Send and report")
    send_response = http_json(
        SKILL_ADAPTER_BASE,
        "/skills/caller/send-request",
        method="POST",
        body={
            "prepared_request_id": prepared_request_id,
            "wait": True,
        },
        timeout=60,
    )
    if not require_ok("send_request", send_response):
        return 1
    sent = send_response["body"]
    request_id = sent.get("request_id")
    assert_that("send_request_returns_request_id", bool(request_id), str(request_id or ""))
    assert_that(
        "send_request_accepted",
        sent.get("status") in {"SENT", "PENDING", "SUCCEEDED"},
        f"status={sent.get('status')} error={sent.get('error')}",
    )
    if sent.get("status") == "SUCCEEDED":
        assert_that("send_request_result_non_empty", bool(sent.get("result")), json.dumps(sent.get("result"), ensure_ascii=False)[:120])

    if request_id:
        report_response = http_json(
            SKILL_ADAPTER_BASE,
            f"/skills/caller/requests/{urllib.parse.quote(request_id)}/report",
            timeout=15,
        )
        require_ok("report_response", report_response)
        report = report_response["body"] or {}
        assert_that("report_matches_request", report.get("request_id") == request_id, report.get("request_id", ""))
        assert_that("report_succeeded", report.get("status") == "SUCCEEDED", f"status={report.get('status')}")
        assert_that("report_result_non_empty", bool(report.get("result")), json.dumps(report.get("result"), ensure_ascii=False)[:120])

    return 0 if print_summary() else 1


if __name__ == "__main__":
    sys.exit(main())
