import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function sanitizeToken(value) {
  return String(value)
    .replace(/\.mjs$/u, "")
    .replace(/^tools\//u, "")
    .replace(/[^A-Za-z0-9._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

export function fixtureKey(relativeScript, args = []) {
  const tokens = [path.basename(relativeScript, ".mjs")];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--json") continue;
    if (value === "--output") {
      index += 1;
      continue;
    }
    if (String(value).startsWith("--output=")) continue;
    tokens.push(sanitizeToken(value));
  }
  return tokens.filter(Boolean).join("__");
}

function maybeWriteFixtureSideEffects({ relativeScript, args, body }) {
  if (!relativeScript.endsWith("deployability-handoff.mjs")) return;
  const outputIndex = args.indexOf("--output");
  const outputPath =
    outputIndex >= 0
      ? args[outputIndex + 1]
      : args.find((value) => String(value).startsWith("--output="))?.slice("--output=".length);
  if (!outputPath) return;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const profile = body?.profile_filter?.resolved || "public_stack";
  fs.writeFileSync(
    outputPath,
    `# Deployability Handoff\n\n## Profile Filter\n\nResolved: ${profile}\n\nFixture handoff report for deployability tests.\n`,
    "utf8"
  );
}

export function runJsonSource({
  root,
  relativeScript,
  args = [],
  env = process.env,
  maxBuffer = 20 * 1024 * 1024,
  okMode = "parse"
}) {
  const fixtureDir = env.DELEXEC_JSON_SOURCE_FIXTURE_DIR;
  if (fixtureDir) {
    const filePath = path.join(fixtureDir, `${fixtureKey(relativeScript, args)}.json`);
    let body = null;
    try {
      body = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      return {
        ok: false,
        exit_code: 1,
        stderr: [`fixture ${filePath} could not be read: ${error instanceof Error ? error.message : String(error)}`],
        body: null,
        parse_error: "fixture did not emit valid JSON"
      };
    }
    maybeWriteFixtureSideEffects({ relativeScript, args, body });
    return {
      ok: okMode === "not_false" ? body?.ok !== false : body != null,
      exit_code: 0,
      stderr: [],
      body,
      parse_error: null
    };
  }

  const result = spawnSync(process.execPath, [path.join(root, relativeScript), ...args], {
    cwd: root,
    encoding: "utf8",
    env,
    maxBuffer
  });
  let body = null;
  try {
    body = result.stdout.trim() ? JSON.parse(result.stdout) : null;
  } catch (error) {
    body = null;
  }
  return {
    ok: okMode === "not_false" ? result.status === 0 && body != null && body.ok !== false : body != null,
    exit_code: result.status,
    stderr: result.stderr.trim().split("\n").filter(Boolean),
    body,
    parse_error: body == null ? "source did not emit valid JSON" : null
  };
}
