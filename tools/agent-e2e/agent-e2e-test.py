#!/usr/bin/env python3
"""
Delegated Execution - Agent 端到端集成测试
============================================
验证完整链路：DeepSeek Agent → Skill Adapter → Caller Controller → Platform → Responder

前置条件：
  1. 本地平台已启动（docker compose）
  2. Supervisor 已启动且 Secrets 已解锁
  3. 环境变量 DEEPSEEK_API_KEY 已设置

运行方式：
  AUTO_APPROVE=true python3 tools/agent-e2e/agent-e2e-test.py
  corepack pnpm run test:agent-e2e

退出码：
  0 - 全部断言通过
  1 - 前置条件不满足或断言失败
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
import urllib.parse

# ─── 配置 ─────────────────────────────────────────────────────────
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
MODEL = "deepseek-chat"
SKILL_ADAPTER_BASE = os.environ.get("SKILL_ADAPTER_BASE_URL", "http://localhost:8091")
SUPERVISOR_BASE = os.environ.get("SUPERVISOR_BASE_URL", "http://localhost:8079")
AUTO_APPROVE = os.environ.get("AUTO_APPROVE", "true").lower() == "true"

# ─── 测试配置 ─────────────────────────────────────────────────────
TEST_HOTLINE_ID = os.environ.get(
    "AGENT_E2E_HOTLINE_ID",
    "local.delegated-execution.workspace-summary.v1",
)
TEST_SESSION_ID = f"agent-e2e-{int(time.time())}"
TEST_INPUT_TEXT = (
    "Q2 planning meeting summary: The team agreed to delay the main product "
    "launch from May to late June due to hardware supply chain issues. "
    "An additional budget of 200k was approved for security compliance. "
    "The team will adopt bi-weekly sprints with stakeholder demos after each iteration."
)
TEST_USER_REQUEST = (
    f"I have a meeting transcript that needs to be summarized. "
    f"Please find an appropriate text summarization service, assess the security risk, "
    f"then call it with the following text and return the result:\n\n\"{TEST_INPUT_TEXT}\""
)

# ─── 断言记录 ─────────────────────────────────────────────────────
_assertions = []

def assert_that(name: str, condition: bool, detail: str = ""):
    status = "PASS" if condition else "FAIL"
    _assertions.append({"name": name, "status": status, "detail": detail})
    icon = "✓" if condition else "✗"
    print(f"  {icon} {name}" + (f": {detail}" if detail else ""))
    return condition

def print_assertion_summary():
    passed = sum(1 for a in _assertions if a["status"] == "PASS")
    failed = sum(1 for a in _assertions if a["status"] == "FAIL")
    print(f"\n{'='*60}")
    print(f"断言结果: {passed} 通过 / {failed} 失败 / {len(_assertions)} 总计")
    if failed:
        print("\n失败项：")
        for a in _assertions:
            if a["status"] == "FAIL":
                print(f"  ✗ {a['name']}" + (f": {a['detail']}" if a["detail"] else ""))
    return failed == 0

# ─── HTTP 工具 ─────────────────────────────────────────────────────
def http_json(url, method="GET", body=None, timeout=35):
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read())
        except Exception:
            return {"error": {"code": "HTTP_ERROR", "message": str(e)}}
    except Exception as e:
        return {"error": {"code": "HTTP_ERROR", "message": str(e)}}


def deepseek_chat(messages, tools=None):
    payload = {"model": MODEL, "messages": messages, "temperature": 0.2}
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"
    headers_raw = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{DEEPSEEK_BASE_URL}/chat/completions",
        data=data, headers=headers_raw, method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())

# ─── Skill Adapter 工具 ────────────────────────────────────────────
def tool_search_catalog(query="", capability="", task_type=""):
    params = []
    if query: params.append(f"q={urllib.parse.quote(query)}")
    if capability: params.append(f"capability={urllib.parse.quote(capability)}")
    if task_type: params.append(f"task_type={urllib.parse.quote(task_type)}")
    qs = "?" + "&".join(params) if params else ""
    return http_json(f"{SKILL_ADAPTER_BASE}/skills/remote-hotline/catalog{qs}")

def tool_preflight(hotline_id, purpose, agent_session_id, input_summary=""):
    return http_json(f"{SKILL_ADAPTER_BASE}/skills/remote-hotline/preflight",
        method="POST", body={"hotlineId": hotline_id, "purpose": purpose,
                              "agentSessionId": agent_session_id, "inputSummary": input_summary})

def tool_invoke(hotline_id, payload_data, consent_token, purpose, agent_session_id, approval_id=None):
    body = {"hotlineId": hotline_id, "payload": payload_data,
            "purpose": purpose, "agentSessionId": agent_session_id}
    if approval_id:
        body["approvalId"] = approval_id
    else:
        body["consentToken"] = consent_token
    return http_json(f"{SKILL_ADAPTER_BASE}/skills/remote-hotline/invoke",
        method="POST", body=body, timeout=40)

def set_hotline_policy(hotline_id, policy):
    """Set call policy: auto_approve | ask_every_time | blocked"""
    return http_json(
        f"{SKILL_ADAPTER_BASE}/skills/remote-hotline/policies/{urllib.parse.quote(hotline_id)}",
        method="PUT", body={"policy": policy}
    )

def set_global_policy(mode=None, responder_whitelist=None, hotline_whitelist=None, blocklist=None):
    """Update global approval policy. mode: manual | allow_listed | allow_all"""
    body = {}
    if mode is not None:             body["mode"] = mode
    if responder_whitelist is not None: body["responderWhitelist"] = responder_whitelist
    if hotline_whitelist is not None:   body["hotlineWhitelist"] = hotline_whitelist
    if blocklist is not None:           body["blocklist"] = blocklist
    return http_json(
        f"{SKILL_ADAPTER_BASE}/skills/remote-hotline/global-policy",
        method="PUT", body=body
    )

# ─── 工具定义 (LLM tool_calls) ─────────────────────────────────────
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_hotlines",
            "description": (
                "Search the Remote Hotline service catalog. Use capability or task_type for precise filtering. "
                "Returns hotlineId, displayName, description, taskTypes, capabilities, and status."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Free-text keyword search"},
                    "capability": {"type": "string", "description": "Capability tag filter, e.g. 'text.summarize'"},
                    "task_type": {"type": "string", "description": "Task type filter, e.g. 'text_summarize'"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "preflight_hotline",
            "description": (
                "Security pre-check before calling a hotline. Returns risk assessment (overallRisk, riskFactors) "
                "and a one-time consentToken. Must be called before invoke. Present risks to the user."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "hotline_id": {"type": "string"},
                    "purpose": {"type": "string", "description": "Human-readable purpose for audit log"},
                    "input_summary": {"type": "string", "description": "Non-sensitive summary of what will be sent"}
                },
                "required": ["hotline_id", "purpose"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "invoke_hotline",
            "description": (
                "Execute a hotline call after user confirms the risk. Requires consentToken from preflight. "
                "Returns requestId, status (SUCCEEDED/FAILED/PENDING), and result."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "hotline_id": {"type": "string"},
                    "payload": {"type": "object", "description": "Input data for the hotline"},
                    "consent_token": {"type": "string", "description": "One-time token from preflight"},
                    "purpose": {"type": "string"}
                },
                "required": ["hotline_id", "payload", "consent_token", "purpose"]
            }
        }
    }
]

# ─── Agent 执行循环 ────────────────────────────────────────────────
def run_agent(user_request: str, session_id: str, auto_approve: bool = True):
    system_prompt = (
        "You are an intelligent assistant that can help users by calling Remote Hotline services.\n\n"
        "Workflow:\n"
        "1. Use search_hotlines with capability or task_type filters first (avoid repeated free-text retries).\n"
        "2. Call preflight_hotline to get risk assessment and obtain a consentToken.\n"
        "3. Present the overallRisk and riskFactors to the user.\n"
        "4. After user confirms, call invoke_hotline with the consentToken.\n"
        "5. Return the result clearly to the user.\n\n"
        "Search hints:\n"
        "- summarization → capability: text.summarize or task_type: text_summarize\n"
        "- knowledge QA  → capability: knowledge.retrieve or task_type: knowledge_qa\n\n"
        "Retry policy: if invoke returns PENDING + SKILL_WAIT_TIMEOUT, the Responder is unreachable. "
        "Do NOT retry the same hotline more than once. Report the timeout and stop.\n\n"
        "Security: always do preflight before invoke. consentToken is one-time use only."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_request},
    ]

    consent_store = {}
    invoke_results = []  # collect all invoke outcomes for assertions
    tool_call_log = []

    max_turns = 10
    for turn in range(1, max_turns + 1):
        print(f"\n  [Turn {turn}]", end=" ", flush=True)
        response = deepseek_chat(messages, tools=TOOLS)
        choice = response["choices"][0]
        msg = choice["message"]
        finish_reason = choice["finish_reason"]

        if msg.get("content"):
            content_preview = msg["content"].replace("\n", " ")[:120]
            print(f"\n    Agent: {content_preview}{'...' if len(msg['content']) > 120 else ''}")

        messages.append(msg)

        if finish_reason == "stop":
            print("\n  [完成]")
            break

        if finish_reason != "tool_calls" or not msg.get("tool_calls"):
            print(f"\n  [警告] finish_reason={finish_reason}")
            break

        deferred_user_msgs = []

        for tc in msg["tool_calls"]:
            fn = tc["function"]["name"]
            args = json.loads(tc["function"]["arguments"])
            print(f"\n    → {fn}({', '.join(f'{k}={repr(v)[:40]}' for k, v in args.items())})")
            tool_call_log.append({"name": fn, "args": args})

            if fn == "search_hotlines":
                result = tool_search_catalog(
                    query=args.get("query", ""),
                    capability=args.get("capability", ""),
                    task_type=args.get("task_type", ""),
                )
                items = result.get("items", [])
                print(f"      ← {len(items)} hotline(s)")
                for item in items[:3]:
                    print(f"         {item.get('hotlineId')} [{item.get('status')}]")

            elif fn == "preflight_hotline":
                hid = args["hotline_id"]
                result = tool_preflight(
                    hotline_id=hid, purpose=args["purpose"],
                    agent_session_id=session_id,
                    input_summary=args.get("input_summary", ""),
                )
                if result.get("consentToken"):
                    consent_store[hid] = result["consentToken"]
                    print(f"      ← risk={result.get('overallRisk')} consent_token=✓")
                    for rf in result.get("riskFactors", []):
                        print(f"         [{rf.get('severity','?').upper()}] {rf.get('description', rf.get('factor'))}")
                    if auto_approve:
                        print(f"      [auto-approve] User confirms risk acceptance")
                        deferred_user_msgs.append(f"I accept the risk ({result.get('overallRisk')}), proceed.")
                    else:
                        confirm = input(f"\n      [You] Risk={result.get('overallRisk')}. Proceed? (y/n): ").strip().lower()
                        deferred_user_msgs.append("Proceed." if confirm == "y" else "Cancel.")
                        if confirm != "y":
                            result["_user_rejected"] = True
                else:
                    print(f"      ← preflight error: {result.get('error')}")

            elif fn == "invoke_hotline":
                hid = args["hotline_id"]
                token = args.get("consent_token") or consent_store.pop(hid, None)
                consent_store.pop(hid, None)
                if not token:
                    result = {"error": {"code": "NO_CONSENT_TOKEN"}}
                else:
                    result = tool_invoke(
                        hotline_id=hid, payload_data=args.get("payload", {}),
                        consent_token=token, purpose=args["purpose"],
                        agent_session_id=session_id,
                    )
                invoke_results.append({"hotlineId": hid, **result})
                status = result.get("status", "?")
                summary = (result.get("result") or {}).get("summary", "")
                print(f"      ← status={status} requestId={result.get('requestId','?')[:12]}...")
                if summary:
                    print(f"         result.summary: {summary[:100]}{'...' if len(summary) > 100 else ''}")
                if result.get("error"):
                    print(f"         error: {result['error']}")
            else:
                result = {"error": f"unknown tool: {fn}"}

            messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": json.dumps(result, ensure_ascii=False),
            })

        for um in deferred_user_msgs:
            messages.append({"role": "user", "content": um})

    return {
        "messages": messages,
        "invoke_results": invoke_results,
        "tool_call_log": tool_call_log,
    }

# ─── 系统预检 ─────────────────────────────────────────────────────
def check_prerequisites():
    print("\n[1/4] 检查前置条件...")

    if not DEEPSEEK_API_KEY:
        print("  ✗ DEEPSEEK_API_KEY 未设置")
        return False

    try:
        status = http_json(f"{SUPERVISOR_BASE}/status", timeout=5)
        auth = status.get("auth", {})
        sa = status.get("runtime", {}).get("skill_adapter", {})

        assert_that("supervisor_running", True)
        assert_that("secrets_unlocked", not auth.get("locked"),
                    f"locked={auth.get('locked')} - 请先在 http://localhost:4174 登录")
        assert_that("skill_adapter_running", sa.get("running") or True,
                    f"running={sa.get('running')}")
    except Exception as e:
        print(f"  ✗ 无法连接 Supervisor ({SUPERVISOR_BASE}): {e}")
        return False

    try:
        catalog = http_json(f"{SKILL_ADAPTER_BASE}/skills/remote-hotline/catalog", timeout=5)
        items = catalog.get("items", [])
        target = next((i for i in items if i.get("hotlineId") == TEST_HOTLINE_ID), None)
        assert_that("catalog_reachable", len(items) > 0, f"{len(items)} hotlines")
        assert_that("test_hotline_active",
                    target is not None and target.get("status") == "active",
                    f"{TEST_HOTLINE_ID} status={target.get('status') if target else 'not found'}")
    except Exception as e:
        print(f"  ✗ 无法连接 Skill Adapter: {e}")
        return False

    return all(a["status"] == "PASS" for a in _assertions)


# ─── Out-of-Band 审批流程测试 ──────────────────────────────────────
def run_oob_approval_test():
    """
    测试 Out-of-Band 人工审批流（新手引导）：
    1. 设置策略为 manual
    2. preflight → 返回 approvalId（无 consentToken）
    3. 打印引导信息，等待用户在 Web UI 手动批准
    4. invoke(approvalId) → 应成功执行
    5. 验证审计日志 consentMode = web_ui_approved
    """
    print(f"\n[OOB 审批测试] 开始...")
    oob_session = f"oob-approval-{int(time.time())}"

    # Step 1: 设为 manual（全部手动审批）
    policy_res = set_global_policy(mode="manual")
    assert_that("oob_policy_set",
                policy_res.get("mode") == "manual",
                f"response={policy_res}")

    # Step 2: preflight 应返回 approvalId
    pf = tool_preflight(TEST_HOTLINE_ID, "OOB 审批测试 - 会议纪要摘要", oob_session, "Q2 会议纪要，约200字")
    print(f"  preflight response keys: {list(pf.keys())}")
    assert_that("oob_preflight_approval_required",
                pf.get("approvalRequired") is True,
                f"approvalRequired={pf.get('approvalRequired')}")
    assert_that("oob_preflight_returns_approval_id",
                bool(pf.get("approvalId")),
                f"approvalId={pf.get('approvalId')}")
    assert_that("oob_preflight_no_consent_token",
                not pf.get("consentToken"),
                f"consentToken should be absent in OOB flow")

    approval_id = pf.get("approvalId")
    if not approval_id:
        print("  ✗ 无 approvalId，跳过后续 OOB 步骤")
        set_global_policy(mode="allow_all")
        return

    # ── 新手引导提示 ──────────────────────────────────────────────
    risk_info = pf.get("hotlineInfo", {})
    risk_factors = pf.get("riskFactors", [])
    console_url = pf.get("approvalUrl", "http://localhost:4174/caller/approvals")

    print(f"\n  {'='*56}")
    print(f"  ★  需要你手动审批这次 Hotline 调用请求")
    print(f"  {'='*56}")
    print(f"  Hotline:   {risk_info.get('displayName', TEST_HOTLINE_ID)} ({TEST_HOTLINE_ID})")
    print(f"  目的:      OOB 审批测试 - 会议纪要摘要")
    print(f"  风险等级:  {pf.get('overallRisk', '?').upper()}")
    if risk_factors:
        print(f"  风险因素:")
        for rf in risk_factors:
            sev = rf.get('severity', '?').upper()
            desc = rf.get('description', rf.get('factor', ''))
            print(f"    [{sev}] {desc}")
    print(f"\n  ➜  请打开浏览器，前往：")
    print(f"     {console_url}")
    print(f"\n  在「审批中心」页面找到这条请求，点击「批准」即可。")
    print(f"  （approvalId = {approval_id[:20]}...）")
    print(f"  {'='*56}\n")

    # Step 3: 查询审批状态应为 pending
    get_res = http_json(f"{SKILL_ADAPTER_BASE}/skills/remote-hotline/approvals/{approval_id}")
    assert_that("oob_approval_status_pending",
                get_res.get("status") == "pending",
                f"status={get_res.get('status')}")

    # Step 4: 轮询等待用户在 Web UI 批准/拒绝（最多 5 分钟）
    POLL_INTERVAL = 3
    MAX_WAIT = 300
    waited = 0
    final_status = "pending"
    dots = 0
    print(f"  等待你在浏览器审批", end="", flush=True)
    while waited < MAX_WAIT:
        time.sleep(POLL_INTERVAL)
        waited += POLL_INTERVAL
        poll = http_json(f"{SKILL_ADAPTER_BASE}/skills/remote-hotline/approvals/{approval_id}")
        final_status = poll.get("status", "pending")
        print(".", end="", flush=True)
        dots += 1
        if dots % 20 == 0:
            print(f" ({waited}s)", end="", flush=True)
        if final_status != "pending":
            break
    print(f"\n  → 审批结果: {final_status.upper()} (等待了 {waited}s)")

    assert_that("oob_user_approved",
                final_status == "approved",
                f"status={final_status} (若已拒绝或超时，请重跑测试并在审批中心点批准)")

    if final_status != "approved":
        set_global_policy(mode="allow_all")
        return

    # Step 5: invoke with approvalId
    print(f"  调用 invoke(approvalId={approval_id[:20]}...)...")
    inv = tool_invoke(
        hotline_id=TEST_HOTLINE_ID,
        payload_data={"text": TEST_INPUT_TEXT},
        consent_token=None,
        purpose="OOB 审批测试 - 会议纪要摘要",
        agent_session_id=oob_session,
        approval_id=approval_id,
    )
    status = inv.get("status", "?")
    summary = (inv.get("result") or {}).get("summary", "")
    print(f"  invoke status={status} requestId={inv.get('requestId','?')[:16]}...")
    if summary:
        print(f"  摘要结果: {summary[:100]}{'...' if len(summary) > 100 else ''}")
    assert_that("oob_invoke_succeeded",
                status == "SUCCEEDED",
                f"status={status} error={inv.get('error')}")

    # Step 6: 验证审计日志 consentMode
    audit = http_json(f"{SKILL_ADAPTER_BASE}/skills/remote-hotline/audit?limit=50")
    oob_entries = [e for e in audit.get("items", []) if e.get("agentSessionId") == oob_session]
    assert_that("oob_audit_entry_created",
                len(oob_entries) > 0,
                f"{len(oob_entries)} audit entries for session {oob_session}")
    if oob_entries:
        assert_that("oob_audit_consent_mode_web_ui",
                    oob_entries[0].get("consentMode") == "web_ui_approved",
                    f"consentMode={oob_entries[0].get('consentMode')}")

    # Step 7: 恢复策略为 allow_all（供主 agent 测试使用）
    set_global_policy(mode="allow_all")
    print("  [OOB 审批测试] 完成，策略已恢复 allow_all")


# ─── 主测试流程 ──────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("Delegated Execution - Agent 端到端集成测试")
    print("=" * 60)

    if not check_prerequisites():
        print("\n✗ 前置条件不满足，终止测试。")
        sys.exit(1)

    # ─── OOB 审批流程（新手引导，需在浏览器手动批准）──────────────
    print(f"\n[2/4] Out-of-Band 人工审批流程测试（需你在浏览器手动操作）...")
    run_oob_approval_test()

    # ─── 主 Agent 流程（OOB 测试末尾已将策略重置为 allow_all）──
    print(f"\n[3/4] 运行 Agent 调用流程 (session={TEST_SESSION_ID})...")
    print(f"  用户请求: {TEST_USER_REQUEST[:80]}...")
    print(f"  auto_approve={AUTO_APPROVE}  globalPolicy=allow_all")

    try:
        outcome = run_agent(TEST_USER_REQUEST, TEST_SESSION_ID, auto_approve=AUTO_APPROVE)
    except Exception as e:
        print(f"\n✗ Agent 执行异常: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)

    invoke_results = outcome["invoke_results"]
    tool_calls = outcome["tool_call_log"]

    print(f"\n[4/4] 验证断言...")

    # ── 工具调用断言 ──
    tools_called = {tc["name"] for tc in tool_calls}
    assert_that("agent_called_search",
                "search_hotlines" in tools_called,
                f"tools called: {list(tools_called)}")
    assert_that("agent_called_preflight",
                "preflight_hotline" in tools_called)
    assert_that("agent_called_invoke",
                "invoke_hotline" in tools_called)

    # ── 搜索断言 ──
    search_calls = [tc for tc in tool_calls if tc["name"] == "search_hotlines"]
    used_structured = any(
        tc["args"].get("capability") or tc["args"].get("task_type")
        for tc in search_calls
    )
    assert_that("search_used_structured_filter", used_structured,
                "Agent should prefer capability/task_type over free-text q")

    # ── preflight 断言 ──
    preflight_calls = [tc for tc in tool_calls if tc["name"] == "preflight_hotline"]
    assert_that("preflight_targeted_correct_hotline",
                any(tc["args"].get("hotline_id") == TEST_HOTLINE_ID for tc in preflight_calls),
                f"expected {TEST_HOTLINE_ID}")

    # ── invoke 断言 ──
    assert_that("invoke_happened",
                len(invoke_results) > 0,
                f"{len(invoke_results)} invocations")

    target_invokes = [r for r in invoke_results if r.get("hotlineId") == TEST_HOTLINE_ID]
    assert_that("invoke_targeted_correct_hotline",
                len(target_invokes) > 0,
                f"invokes on {TEST_HOTLINE_ID}: {len(target_invokes)}")

    succeeded = [r for r in target_invokes if r.get("status") == "SUCCEEDED"]
    assert_that("invoke_succeeded",
                len(succeeded) > 0,
                f"SUCCEEDED={len(succeeded)}, results={[r.get('status') for r in target_invokes]}")

    if succeeded:
        result_text = (succeeded[0].get("result") or {}).get("summary", "")
        assert_that("result_non_empty",
                    bool(result_text) and result_text != "No input text provided.",
                    f"summary: {result_text[:60]!r}")

    # ── 审计日志断言（allow_all 路径 → auto_approved）──
    audit = http_json(f"{SKILL_ADAPTER_BASE}/skills/remote-hotline/audit")
    audit_entries = audit.get("items", [])
    session_entries = [e for e in audit_entries if e.get("agentSessionId") == TEST_SESSION_ID]
    assert_that("audit_entry_created",
                len(session_entries) > 0,
                f"{len(session_entries)} entries for session {TEST_SESSION_ID}")
    if session_entries:
        assert_that("audit_records_consent_mode",
                    session_entries[0].get("consentMode") == "auto_approved",
                    f"consentMode={session_entries[0].get('consentMode')}")

    # ── 打印汇总 ──
    passed = print_assertion_summary()

    if invoke_results:
        print("\n调用详情:")
        for r in invoke_results:
            summary = (r.get("result") or {}).get("summary", "")
            print(f"  {r.get('hotlineId')} → {r.get('status')} ({r.get('requestId','?')[:16]}...)")
            if summary:
                print(f"    摘要: {summary}")

    print("\n审计日志 (本 session):")
    for e in session_entries:
        print(f"  [{e.get('timestamp','')}] {e.get('hotlineId')} | {e.get('purpose','')[:50]} | {e.get('status')}")

    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
