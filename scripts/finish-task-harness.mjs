#!/usr/bin/env node

import { spawnSync } from "node:child_process";

function usage() {
  console.log(`
Usage:
  npm run finish:harness -- --message "commit message"

Options:
  -m, --message <text>       Commit message. Default: chore(pos): finish task
  -b, --branch <name>        Branch name to create when currently on main.
  --no-build                 Skip npm run build.
  --no-merge-main            Push the branch but do not merge into main.
  --verify-main              Only verify that the final commit is already in origin/main.

Default behavior:
  1. If currently on main, create a codex/* branch.
  2. Run npm run build.
  3. Stage all changes.
  4. Commit if there are staged changes.
  5. Push the branch.
  6. Merge the branch into main and push main.
  7. Verify origin/main contains the branch commit.
`);
}

function parseArgs(argv) {
  const options = {
    branch: "",
    message: "chore(pos): finish task",
    runBuild: true,
    mergeMain: true,
    verifyOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "-h" || arg === "--help") {
      usage();
      process.exit(0);
    }
    if (arg === "-m" || arg === "--message") {
      options.message = argv[index + 1] ?? options.message;
      index += 1;
      continue;
    }
    if (arg === "-b" || arg === "--branch") {
      options.branch = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--no-build") {
      options.runBuild = false;
      continue;
    }
    if (arg === "--no-merge-main") {
      options.mergeMain = false;
      continue;
    }
    if (arg === "--verify-main") {
      options.verifyOnly = true;
      options.mergeMain = false;
    }
  }

  return options;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    const message = [command, ...args].join(" ");
    if (options.allowFailure) return result;
    throw new Error(`Command failed: ${message}`);
  }

  return result;
}

function output(command, args) {
  return run(command, args, { capture: true }).stdout.trim();
}

function hasStagedChanges() {
  return run("git", ["diff", "--cached", "--quiet"], { allowFailure: true }).status !== 0;
}

function isAncestor(commit, ref) {
  return run("git", ["merge-base", "--is-ancestor", commit, ref], {
    allowFailure: true,
  }).status === 0;
}

function defaultBranchName() {
  const stamp = new Date()
    .toISOString()
    .replaceAll(":", "")
    .replace(/\..+$/, "")
    .replace("T", "-");
  return `codex/finish-${stamp}`;
}

function ensureNoUncommittedChanges() {
  const dirty = output("git", ["status", "--porcelain"]);
  if (dirty) {
    throw new Error("Working tree is not clean after commit. Resolve changes before merging main.");
  }
}

const options = parseArgs(process.argv.slice(2));

try {
  run("git", ["fetch", "origin", "main"]);

  let branch = output("git", ["branch", "--show-current"]);
  if (!branch) throw new Error("Could not determine current branch.");

  if (options.verifyOnly) {
    const commit = output("git", ["rev-parse", "HEAD"]);
    run("git", ["fetch", "origin", "main"]);
    if (!isAncestor(commit, "origin/main")) {
      throw new Error(`Commit ${commit} is not merged into origin/main yet.`);
    }
    console.log(`Verified: ${commit} is included in origin/main.`);
    process.exit(0);
  }

  if (branch === "main" || branch === "master") {
    branch = options.branch || defaultBranchName();
    run("git", ["switch", "-c", branch]);
  }

  if (options.runBuild) {
    run("npm", ["run", "build"]);
  }

  run("git", ["add", "-A"]);

  if (hasStagedChanges()) {
    run("git", ["commit", "-m", options.message]);
  } else {
    console.log("No staged changes found. Reusing current HEAD.");
  }

  const branchCommit = output("git", ["rev-parse", "HEAD"]);
  run("git", ["push", "-u", "origin", branch]);

  if (!options.mergeMain) {
    run("git", ["fetch", "origin", "main"]);
    if (!isAncestor(branchCommit, "origin/main")) {
      throw new Error(
        `Branch pushed, but ${branchCommit} is not in origin/main. Merge it, then rerun with --verify-main.`,
      );
    }
    console.log(`Verified: ${branchCommit} is included in origin/main.`);
    process.exit(0);
  }

  ensureNoUncommittedChanges();
  run("git", ["fetch", "origin", "main"]);
  run("git", ["switch", "main"]);
  run("git", ["pull", "--ff-only", "origin", "main"]);
  run("git", ["merge", "--no-ff", branch, "-m", `Merge ${branch}`]);
  run("git", ["push", "origin", "main"]);
  run("git", ["fetch", "origin", "main"]);

  if (!isAncestor(branchCommit, "origin/main")) {
    throw new Error(`Merge verification failed: ${branchCommit} is not in origin/main.`);
  }

  console.log(`Done. Branch ${branch} was pushed and ${branchCommit} is merged into origin/main.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
