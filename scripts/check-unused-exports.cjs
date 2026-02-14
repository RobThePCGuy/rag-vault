#!/usr/bin/env node

/**
 * Unused exports checker script
 * Filters out "(used in module)" from ts-prune output to show only truly unused exports
 */

const { spawnSync } = require("child_process");

function runTsPrune() {
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

  // Note: --ignore is a regex. Consider anchoring it if you see over-matching.
  const ignorePattern = "src/index.ts|__tests__|test|vitest";

  const args = [
    "ts-prune",
    "--project",
    "tsconfig.json",
    "--ignore",
    ignorePattern,
  ];

  const res = spawnSync(npxCmd, args, { encoding: "utf8" });

  if (res.error) {
    throw res.error;
  }

  // ts-prune typically writes findings to stdout; keep stderr around for debugging.
  return {
    stdout: res.stdout || "",
    stderr: res.stderr || "",
    status: typeof res.status === "number" ? res.status : 0,
  };
}

function analyze(output) {
  const lines = output.split("\n").map((l) => l.trim()).filter(Boolean);

  const results = {
    usedInModule: [],
    trulyUnused: [],
    total: 0,
  };

  for (const line of lines) {
    // ts-prune lines usually look like: path:line - exportName ...
    if (!line.includes(" - ")) continue;

    results.total++;
    if (line.includes("(used in module)")) {
      results.usedInModule.push(line);
    } else {
      results.trulyUnused.push(line);
    }
  }

  return results;
}

function print(results) {
  console.log("=== Unused Exports Analysis ===\n");

  if (results.trulyUnused.length > 0) {
    console.log("Truly unused exports: " + results.trulyUnused.length);
    console.log("-".repeat(50));
    results.trulyUnused.forEach((line) => console.log(line));
    console.log("");
  } else {
    console.log("No truly unused exports found\n");
  }

  if (results.usedInModule.length > 0) {
    console.log("Used only in module (unnecessary exports): " + results.usedInModule.length);
    console.log("-".repeat(50));
    results.usedInModule.forEach((line) => console.log(line));
    console.log("");
  } else {
    console.log("No unnecessary internal exports found\n");
  }

  console.log("=== Summary ===");
  console.log("Total flagged exports: " + results.total);
  console.log("|- Truly unused: " + results.trulyUnused.length + " (delete immediately)");
  console.log("`- Used in module only: " + results.usedInModule.length + " (remove export keyword)");

  // Exit code: fail CI only on truly unused exports
  process.exit(results.trulyUnused.length > 0 ? 1 : 0);
}

try {
  const { stdout, stderr } = runTsPrune();

  // If you want, you can surface stderr when ts-prune prints warnings.
  // if (stderr.trim()) console.error(stderr.trim());

  const results = analyze(stdout);
  print(results);
} catch (error) {
  console.error("Error occurred: " + (error && error.message ? error.message : String(error)));
  process.exit(1);
}
