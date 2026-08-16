import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import YAML from "yaml";
import { assertOriginReachable, shaIsProvablyAbsent } from "./lib/origin-reachable.mjs";

const FROZEN_FIELDS = ["change_id", "protocol_sha", "client_sha", "platform_sha"];
const SKIPPED = process.env.SKIP_ORIGIN_REACHABILITY === "1" || process.env.OFFLINE === "1";

function readHeadVersion(relPath) {
  const result = spawnSync("git", ["show", `HEAD:${relPath}`], { encoding: "utf8" });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout;
}

// Git's own default abbreviation, and the length of every short hash a person
// copies out of `git log --oneline`.
const SHORT_HASH_LENGTH = 7;

function commonPrefixLength(left, right) {
  let index = 0;
  while (index < left.length && index < right.length && left[index] === right[index]) {
    index += 1;
  }
  return index;
}

function isFrozen(body) {
  return body.contracts_check === "passed" && body.integration_check === "passed";
}

const ROOT = process.cwd();
const changesDir = path.join(ROOT, "changes");
const submoduleMap = {
  protocol_sha: "repos/protocol",
  client_sha: "repos/client",
  platform_sha: "repos/platform"
};
const required = [
  "change_id",
  "goal",
  "protocol_sha",
  "client_sha",
  "platform_sha",
  "owner",
  "risk_level",
  "affected_scope",
  "contracts_check",
  "integration_check",
  "notes"
];

if (!fs.existsSync(changesDir)) {
  console.error("[validate-change-bundle] changes/ missing");
  process.exit(1);
}

const files = fs.readdirSync(changesDir).filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"));
if (files.length === 0) {
  console.error("[validate-change-bundle] no change bundle files found");
  process.exit(1);
}

// A change bundle is a historical snapshot of a verified (protocol, client, platform)
// combination. Two rules apply:
//
//   1. A bundle is a snapshot iff its own body is passed/passed. Snapshot SHAs
//      are the historical record. We do NOT compare snapshot SHAs to current
//      submodule heads. This covers both long-archived bundles and freshly
//      added archival entries.
//
//   2. A bundle is a candidate iff its own body is NOT passed/passed (i.e.
//      at least one of contracts_check / integration_check is not "passed").
//      Candidate SHAs MUST equal the current submodule heads, because this is
//      the combination being validated right now.
//
// Additionally, any bundle that was already passed/passed in HEAD is frozen:
// its change_id and SHA fields may not be rewritten in the working tree.
// The fix for a mistake in a frozen bundle is to open a new CHG, not edit it.
//
// With one exception, which exists because the two rules above collided: a
// frozen bundle recording a SHA that exists NOWHERE — not locally, not on
// origin — can never satisfy the reachability rule below, and opening a new
// CHG does not clear it, because reachability is checked over every bundle in
// the directory. Freezing protects a certified combination from being quietly
// re-pointed at different work; a SHA that was never a commit is not a
// certified fact, it is a typo. So a frozen SHA may be corrected exactly when
// its recorded value can be PROVEN absent, which needs origin reachable and
// the bypass off. Record the correction in a new CHG anyway: the edit fixes
// the ledger, the new bundle says why it was wrong.

for (const file of files) {
  if (file.toLowerCase().includes("template")) {
    continue;
  }
  const fullPath = path.join(changesDir, file);
  const body = YAML.parse(fs.readFileSync(fullPath, "utf8"));
  for (const key of required) {
    if (!(key in body)) {
      console.error(`[validate-change-bundle] ${file} missing ${key}`);
      process.exit(1);
    }
  }
  if (!Array.isArray(body.affected_scope) || body.affected_scope.length === 0) {
    console.error(`[validate-change-bundle] ${file} affected_scope must be a non-empty array`);
    process.exit(1);
  }

  const relPath = path.posix.join("changes", file);
  const headText = readHeadVersion(relPath);
  if (!headText && SKIPPED && isFrozen(body)) {
    console.error(
      `[validate-change-bundle] ${file} is new and recorded as passed/passed, but origin reachability was skipped in this run. Re-run without SKIP_ORIGIN_REACHABILITY/OFFLINE before recording it, or leave the checks pending.`
    );
    process.exit(1);
  }

  if (headText) {
    let headBody;
    try {
      headBody = YAML.parse(headText);
    } catch {
      headBody = null;
    }
    if (headBody && isFrozen(headBody)) {
      for (const frozenField of FROZEN_FIELDS) {
        if (headBody[frozenField] === body[frozenField]) {
          continue;
        }
        const submodulePath = submoduleMap[frozenField];
        const phantom = submodulePath
          ? shaIsProvablyAbsent(path.join(ROOT, submodulePath), headBody[frozenField])
          : { absent: false, reason: "change_id is not a SHA" };
        if (!phantom.absent) {
          console.error(
            `[validate-change-bundle] ${file} is frozen (contracts_check=passed, integration_check=passed in HEAD); ${frozenField} must not be rewritten from ${headBody[frozenField]} to ${body[frozenField]}. Open a new CHG instead. (${phantom.reason})`
          );
          process.exit(1);
        }
        // Proving the old value absent licenses a correction, not a free hand.
        // Without this the exception would be a way to re-point a certified
        // combination at different work by first writing a SHA that names
        // nothing. The correction has to be the same short hash, expanded
        // properly — which is the mistake this exception exists for. Anything
        // else is a different claim and belongs in a new CHG.
        const sharedPrefix = commonPrefixLength(String(headBody[frozenField]), String(body[frozenField]));
        if (sharedPrefix < SHORT_HASH_LENGTH) {
          console.error(
            `[validate-change-bundle] ${file} ${frozenField} names no commit anywhere, but ${body[frozenField]} is not it expanded correctly — they agree on ${sharedPrefix} characters, fewer than the ${SHORT_HASH_LENGTH} of a short hash. Correcting a mistyped SHA is allowed; re-pointing a frozen bundle at other work is not. Open a new CHG.`
          );
          process.exit(1);
        }
        console.warn(
          `[validate-change-bundle] ${file} ${frozenField} corrected from ${headBody[frozenField]}, which names no commit anywhere (${phantom.reason}), to ${body[frozenField]}`
        );
      }
    }

    // A bundle claims passed/passed on the strength of a validation run. This
    // one was skipped, so it cannot be the run that earns the claim — which is
    // exactly how a hand-expanded SHA reached a frozen bundle: every check that
    // would have caught it was bypassed, and the bundle was written green.
    if (SKIPPED && isFrozen(body) && headText !== fs.readFileSync(fullPath, "utf8")) {
      console.error(
        `[validate-change-bundle] ${file} is recorded as passed/passed but origin reachability was skipped in this run. Re-run without SKIP_ORIGIN_REACHABILITY/OFFLINE before recording it, or leave the checks pending.`
      );
      process.exit(1);
    }
  }

  // Origin-reachability hygiene: every SHA referenced in any bundle must
  // exist on origin. Snapshot bundles can otherwise drift into "phantom
  // history" recording SHAs that never made it past one developer's clone.
  for (const [field, submodulePath] of Object.entries(submoduleMap)) {
    const submoduleRoot = path.join(ROOT, submodulePath);
    if (!fs.existsSync(path.join(submoduleRoot, ".git"))) {
      console.error(`[validate-change-bundle] ${submodulePath} is not initialized`);
      process.exit(1);
    }
    assertOriginReachable(submoduleRoot, body[field], `${file} ${field}`);
  }

  if (isFrozen(body)) {
    continue;
  }

  for (const [field, submodulePath] of Object.entries(submoduleMap)) {
    const submoduleRoot = path.join(ROOT, submodulePath);
    const actualSha = execFileSync("git", ["-C", submoduleRoot, "rev-parse", "HEAD"], {
      encoding: "utf8"
    }).trim();
    if (body[field] !== actualSha) {
      console.error(
        `[validate-change-bundle] ${file} ${field}=${body[field]} does not match current ${submodulePath} SHA ${actualSha}`
      );
      process.exit(1);
    }
  }
}

if (SKIPPED) {
  console.log("[validate-change-bundle] ok (origin reachability skipped)");
} else {
  console.log("[validate-change-bundle] ok");
}
