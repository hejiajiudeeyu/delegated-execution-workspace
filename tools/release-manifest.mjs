// Release manifest: the workspace's canonical record of which cross-repo
// combination is certified, and the drift check against what is actually
// running (ADR-002 / A-09, FR-080..FR-083).
//
// Authority model: this repository FREEZES manifests; owning services only
// REPORT observed build facts via GET /buildz. Services never generate a
// second canonical cross-repo manifest, and this tool never rewrites a frozen
// one — corrections ship as a new release id so rollbacks are recorded.
//
// Subcommands:
//   generate <release_id>   freeze a manifest from the current submodule state
//   promote  <release_id>   point releases/current.yaml at a frozen manifest
//   verify                  manifest integrity + pointer + workspace agreement
//   probe    <base_url>     read observed build facts from a running stack
//   check    <base_url>     verify, then block on observed-vs-canonical drift

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import YAML from "yaml";

const ROOT = process.cwd();
const RELEASES_DIR = path.join(ROOT, "releases");
const MANIFESTS_DIR = path.join(RELEASES_DIR, "manifests");
const CURRENT_POINTER = path.join(RELEASES_DIR, "current.yaml");
const TAG = "[release-manifest]";

const SUBMODULES = Object.freeze({
  protocol: "repos/protocol",
  client: "repos/client",
  platform: "repos/platform",
  brand_site: "repos/brand-site"
});

// Components the drift check probes. `path` is appended to the probed base url.
const COMPONENTS = Object.freeze([
  { component: "platform-api", path: "/platform/buildz", image: "rsp-platform" },
  { component: "transport-relay", path: "/relay/buildz", image: "rsp-relay" },
  { component: "platform-console-gateway", path: "/gateway/buildz", image: "rsp-gateway" }
]);

/**
 * What a running service should be reporting for this combination.
 *
 * A service reports the release_id baked in when its IMAGE was built, so the
 * honest comparison is against the image tag this manifest declares — not the
 * combination's name. They are usually the same string, and were always
 * assumed to be, until a client-only release (same images, new npm package)
 * needed a combination name of its own and every service instantly read as
 * drifted while running exactly the images the manifest named.
 *
 * Comparing against the declared image is also STRICTER: it answers "is
 * production running the image this combination certifies", which is the
 * question the gate exists to ask.
 */
function expectedReleaseFor(manifest, component) {
  const imageName = COMPONENTS.find((entry) => entry.component === component)?.image;
  const declaredTag = imageName ? manifest.images?.[imageName] : null;
  return declaredTag || manifest.release_id;
}

function fail(message) {
  console.error(`${TAG} ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`${TAG} ${message}`);
}

function canonicalize(value) {
  // Stable serialization so a manifest hash depends on content, not key order
  // or formatting. Sorting keys keeps the hash reproducible across writers.
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
}

export function manifestHash(manifest) {
  const body = { ...manifest };
  delete body.manifest_sha256;
  return crypto.createHash("sha256").update(JSON.stringify(canonicalize(body))).digest("hex");
}

function readSubmoduleSha(relPath) {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: path.join(ROOT, relPath),
    encoding: "utf8"
  });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.trim();
}

function readManifest(releaseId) {
  const file = path.join(MANIFESTS_DIR, `${releaseId}.yaml`);
  if (!fs.existsSync(file)) {
    return null;
  }
  return YAML.parse(fs.readFileSync(file, "utf8"));
}

function readPointer() {
  if (!fs.existsSync(CURRENT_POINTER)) {
    return null;
  }
  return YAML.parse(fs.readFileSync(CURRENT_POINTER, "utf8"));
}

function isReleaseId(value) {
  // Constrains the id to a safe filename and keeps ids sortable.
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value);
}

function latestBundleId() {
  const changesDir = path.join(ROOT, "changes");
  if (!fs.existsSync(changesDir)) {
    return null;
  }
  // Only real numbered bundles; CHG-template.yaml is a scaffold and would
  // otherwise win an alphabetical sort.
  const ids = fs
    .readdirSync(changesDir)
    .filter((file) => /^CHG-\d{4}-\d+\.ya?ml$/.test(file))
    .map((file) => file.replace(/\.ya?ml$/, ""))
    .sort();
  return ids.length > 0 ? ids[ids.length - 1] : null;
}

// ---------------------------------------------------------------- generate

function commandGenerate(releaseId, options = {}) {
  if (!isReleaseId(releaseId)) {
    fail("generate requires a release id matching [A-Za-z0-9][A-Za-z0-9._-]{0,63}");
  }
  if (readManifest(releaseId) && !options.force) {
    fail(`manifest ${releaseId} already exists and is immutable; use a new release id`);
  }

  const components = {};
  for (const [name, relPath] of Object.entries(SUBMODULES)) {
    const sha = readSubmoduleSha(relPath);
    if (!sha) {
      fail(`cannot read submodule HEAD for ${relPath}`);
    }
    components[name] = { sha, path: relPath };
  }

  const manifest = {
    release_id: releaseId,
    created_at: options.createdAt || new Date().toISOString(),
    components,
    change_bundle: options.changeBundle || latestBundleId(),
    images: options.images || {},
    packages: options.packages || {},
    notes: options.notes || ""
  };
  manifest.manifest_sha256 = manifestHash(manifest);

  fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(MANIFESTS_DIR, `${releaseId}.yaml`), YAML.stringify(manifest), "utf8");
  ok(`froze manifest ${releaseId} sha256=${manifest.manifest_sha256.slice(0, 12)}`);
  return manifest;
}

// ----------------------------------------------------------------- promote

function commandPromote(releaseId) {
  const manifest = readManifest(releaseId);
  if (!manifest) {
    fail(`unknown release id ${releaseId}; freeze it with generate first`);
  }
  const expected = manifestHash(manifest);
  if (manifest.manifest_sha256 !== expected) {
    fail(`manifest ${releaseId} hash mismatch; refusing to promote a tampered manifest`);
  }
  fs.writeFileSync(
    CURRENT_POINTER,
    YAML.stringify({ release_id: releaseId, manifest_sha256: manifest.manifest_sha256 }),
    "utf8"
  );
  ok(`current -> ${releaseId}`);
  return manifest;
}

// ------------------------------------------------------------------ verify

export function verifyWorkspace() {
  const problems = [];
  const pointer = readPointer();
  if (!pointer) {
    return { ok: false, problems: ["releases/current.yaml is missing"], manifest: null };
  }
  if (!pointer.release_id || !pointer.manifest_sha256) {
    return { ok: false, problems: ["current.yaml needs release_id and manifest_sha256"], manifest: null };
  }

  const manifest = readManifest(pointer.release_id);
  if (!manifest) {
    return { ok: false, problems: [`current points at unknown release ${pointer.release_id}`], manifest: null };
  }

  const actualHash = manifestHash(manifest);
  if (manifest.manifest_sha256 !== actualHash) {
    problems.push(`manifest ${pointer.release_id} was modified after freezing (hash mismatch)`);
  }
  if (pointer.manifest_sha256 !== actualHash) {
    problems.push(`current.yaml hash does not match manifest ${pointer.release_id}`);
  }

  // The certified combination must still describe the checked-out submodules.
  for (const [name, relPath] of Object.entries(SUBMODULES)) {
    const declared = manifest.components?.[name]?.sha;
    const actual = readSubmoduleSha(relPath);
    if (!declared) {
      problems.push(`manifest is missing component ${name}`);
      continue;
    }
    if (actual && declared !== actual) {
      problems.push(`${name} drift: manifest ${declared.slice(0, 12)} vs worktree ${actual.slice(0, 12)}`);
    }
  }

  return { ok: problems.length === 0, problems, manifest };
}

// ------------------------------------------------------------------- probe

// `overrides` maps component -> absolute url. Needed because the public edge
// deliberately does not expose the relay (its business routes are
// unauthenticated), so a production drift check runs on-host against the
// internal ports rather than through the edge.
async function fetchBuildFacts(baseUrl, overrides = {}, timeoutMs = 10_000) {
  const observed = [];
  for (const target of COMPONENTS) {
    const url = overrides[target.component] || `${baseUrl.replace(/\/$/, "")}${target.path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        observed.push({ component: target.component, url, error: `HTTP ${response.status}` });
        continue;
      }
      observed.push({ component: target.component, url, facts: await response.json() });
    } catch (error) {
      observed.push({ component: target.component, url, error: error.message || String(error) });
    } finally {
      clearTimeout(timer);
    }
  }
  return observed;
}

// Compare observed facts against the canonical manifest. Missing facts are
// reported as "unknown", never as agreement: a service that cannot state its
// build must not be able to pass a drift gate by staying silent.
export function compareObserved(manifest, observed) {
  const problems = [];
  const unknown = [];

  for (const entry of observed) {
    if (entry.error) {
      problems.push(`${entry.component}: unreachable (${entry.error})`);
      continue;
    }
    const facts = entry.facts || {};
    if (facts.component && facts.component !== entry.component) {
      problems.push(`${entry.component}: reports component ${facts.component}`);
    }
    const expectedRelease = expectedReleaseFor(manifest, entry.component);
    if (!facts.release_id) {
      unknown.push(`${entry.component}: no release_id injected`);
    } else if (facts.release_id !== expectedRelease) {
      problems.push(`${entry.component}: release ${facts.release_id} vs manifest ${expectedRelease}`);
    }
    if (facts.manifest_sha256 && facts.manifest_sha256 !== manifest.manifest_sha256) {
      problems.push(`${entry.component}: manifest hash mismatch`);
    }
    const declaredSha = manifest.components?.platform?.sha;
    if (facts.git_sha && declaredSha && !declaredSha.startsWith(facts.git_sha) && !facts.git_sha.startsWith(declaredSha)) {
      problems.push(`${entry.component}: git sha ${facts.git_sha.slice(0, 12)} vs manifest ${declaredSha.slice(0, 12)}`);
    }
    if (!facts.git_sha) {
      unknown.push(`${entry.component}: no git_sha injected`);
    }
  }

  return { ok: problems.length === 0, problems, unknown };
}

// -------------------------------------------------------------------- main

// `--images rsp-gateway=v0.2.0,rsp-relay=v0.1.2` style options. Artifacts must
// be freezable in one shot: hand-editing a frozen manifest and rehashing it
// would defeat the immutability ADR-002 relies on.
function parseKeyValueOption(raw) {
  if (!raw) {
    return {};
  }
  const entries = {};
  for (const pair of raw.split(",")) {
    const index = pair.indexOf("=");
    if (index <= 0) {
      fail(`malformed key=value pair: ${pair}`);
    }
    entries[pair.slice(0, index).trim()] = pair.slice(index + 1).trim();
  }
  return entries;
}

function parseArgs(args) {
  const positional = [];
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith("--")) {
      const [flag, inlineValue] = arg.slice(2).split(/=(.*)/s);
      options[flag] = inlineValue !== undefined ? inlineValue : args[++index];
    } else {
      positional.push(arg);
    }
  }
  return { positional, options };
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { positional: args, options } = parseArgs(rest);

  if (command === "generate") {
    commandGenerate(args[0], {
      notes: options.notes || args[1],
      images: parseKeyValueOption(options.images),
      packages: parseKeyValueOption(options.packages),
      changeBundle: options.bundle
    });
    return;
  }

  if (command === "promote") {
    commandPromote(args[0]);
    return;
  }

  if (command === "verify") {
    const result = verifyWorkspace();
    if (!result.ok) {
      for (const problem of result.problems) {
        console.error(`${TAG} ${problem}`);
      }
      fail("workspace release state is inconsistent");
    }
    ok(`ok release=${result.manifest.release_id} sha256=${result.manifest.manifest_sha256.slice(0, 12)}`);
    return;
  }

  if (command === "probe" || command === "check") {
    const baseUrl = args[0];
    if (!baseUrl) {
      fail(`${command} requires a base url`);
    }
    const state = verifyWorkspace();
    if (command === "check" && !state.ok) {
      for (const problem of state.problems) {
        console.error(`${TAG} ${problem}`);
      }
      fail("workspace release state is inconsistent; fix it before probing runtime");
    }

    const observed = await fetchBuildFacts(baseUrl, parseKeyValueOption(options.component));
    for (const entry of observed) {
      if (entry.error) {
        console.log(`${TAG} observed ${entry.component}: ERROR ${entry.error}`);
      } else {
        const facts = entry.facts || {};
        console.log(
          `${TAG} observed ${entry.component}: version=${facts.version || "-"} release=${facts.release_id || "-"} git=${
            facts.git_sha ? facts.git_sha.slice(0, 12) : "-"
          }${facts.console_asset_hash ? ` asset=${facts.console_asset_hash}` : ""}`
        );
      }
    }

    if (command === "probe") {
      return;
    }

    const comparison = compareObserved(state.manifest, observed);
    for (const item of comparison.unknown) {
      console.log(`${TAG} unknown ${item}`);
    }
    if (!comparison.ok) {
      for (const problem of comparison.problems) {
        console.error(`${TAG} drift ${problem}`);
      }
      fail("runtime drifted from the certified manifest");
    }
    if (comparison.unknown.length > 0) {
      // Deliberately not a pass: silence is not agreement.
      fail("runtime could not state its build facts; drift is undetermined");
    }
    ok(`runtime matches release ${state.manifest.release_id}`);
    return;
  }

  console.error(`${TAG} usage: release-manifest <generate|promote|verify|probe|check> [args]`);
  console.error(`${TAG}   generate <id> [--images k=v,..] [--packages k=v,..] [--notes text] [--bundle CHG-..]`);
  console.error(`${TAG}   probe|check <base_url> [--component transport-relay=http://127.0.0.1:28090/buildz]`);
  process.exit(1);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  await main();
}

export { commandGenerate, commandPromote, readManifest, readPointer, COMPONENTS, SUBMODULES };
