#!/usr/bin/env node

import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

function parseArgs(argv) {
  const args = {
    concurrency: Math.min(8, Math.max(1, os.cpus().length || 1)),
    files: []
  };
  const values = argv.slice(2);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--concurrency") {
      const next = values[index + 1];
      if (!next || next.startsWith("--")) throw new Error("missing value for --concurrency");
      args.concurrency = Number.parseInt(next, 10);
      if (!Number.isInteger(args.concurrency) || args.concurrency < 1) {
        throw new Error("--concurrency must be a positive integer");
      }
      index += 1;
      continue;
    }
    if (value.startsWith("--concurrency=")) {
      args.concurrency = Number.parseInt(value.slice("--concurrency=".length), 10);
      if (!Number.isInteger(args.concurrency) || args.concurrency < 1) {
        throw new Error("--concurrency must be a positive integer");
      }
      continue;
    }
    if (value.startsWith("--")) throw new Error(`unknown option ${value}`);
    args.files.push(value);
  }
  if (args.files.length === 0) throw new Error("at least one test file is required");
  return args;
}

function runFile(file) {
  return new Promise((resolve) => {
    const startedAt = process.hrtime.bigint();
    const child = spawn(process.execPath, [path.resolve(file)], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code, signal) => {
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      resolve({
        file,
        code,
        signal,
        stdout,
        stderr,
        elapsedMs
      });
    });
  });
}

async function runAll({ files, concurrency }) {
  const queue = [...files];
  const results = [];
  async function worker() {
    while (queue.length) {
      const file = queue.shift();
      const result = await runFile(file);
      results.push(result);
      if (result.stdout.trim()) process.stdout.write(result.stdout);
      if (result.stderr.trim()) process.stderr.write(result.stderr);
      const status = result.code === 0 ? "ok" : "failed";
      console.log(`[run-tests] ${status} ${file} ${Math.round(result.elapsedMs)}ms`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, () => worker()));
  return results;
}

try {
  const args = parseArgs(process.argv);
  const startedAt = process.hrtime.bigint();
  console.log(`[run-tests] files=${args.files.length} concurrency=${args.concurrency}`);
  const results = await runAll(args);
  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  const failed = results.filter((result) => result.code !== 0);
  console.log(`[run-tests] complete files=${results.length} failed=${failed.length} elapsed=${Math.round(elapsedMs)}ms`);
  if (failed.length) {
    for (const result of failed) {
      console.error(`[run-tests] failed ${result.file} exit=${result.code} signal=${result.signal || ""}`);
    }
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`[run-tests] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
