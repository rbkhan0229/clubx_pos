# Finish Harness

Use this harness at the end of a task so the work is not left only on a local machine.

```bash
npm run finish:harness -- --message "fix(pos): describe the task"
```

Default behavior:

1. If the current branch is `main` or `master`, create a `codex/*` branch.
2. Run `npm run build`.
3. Stage all changes with `git add -A`.
4. Commit staged changes.
5. Push the branch to `origin`.
6. Merge the branch into `main`.
7. Push `main`.
8. Verify that `origin/main` contains the committed work.

Useful options:

```bash
npm run finish:harness -- --message "fix(pos): example" --branch codex/example
npm run finish:harness -- --message "fix(pos): example" --no-build
npm run finish:harness -- --message "fix(pos): example" --no-merge-main
npm run finish:harness -- --verify-main
```

Notes:

- `--no-merge-main` still pushes the branch, then fails if the commit is not already in `origin/main`.
- Use `--verify-main` after a pull request or manual merge to confirm the current commit reached `origin/main`.
- If GitHub branch protection blocks direct `main` pushes, use `--no-merge-main`, merge through GitHub, then rerun with `--verify-main`.
- The harness is intentionally local Git based. It does not deploy Vercel or check production caches.
