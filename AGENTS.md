# AGENTS.md - YARA

## Product and source boundaries

YARA is a small MeshChat-compatible reference/interoperability client for the
Rust Reticulum/LXMF daemon API, not another general-purpose chat product.
Read README.md and docs/rust-poc.md before changing its scope or launch behavior.

Read and apply [Frontend engineering principles](FRONTEND_ENGINEERING_PRINCIPLES.md)
before JavaScript/TypeScript UI design, implementation, refactoring, or review.
Its repository appendix gives the reviewed source boundaries and local checks.
Business/domain authority stays in the designated backend or native runtime;
stores, hooks, composables, and frontend services are not alternative owners.
This supplements the existing architecture, safety, toolchain, and workflow rules.

## Repository map

- `src/frontend/`: existing Vue JavaScript UI and its adapters/helpers.
- `electron/`: desktop launcher, narrow preload bridge, and native settings.
- `src/backend/`, `meshchat.py`, and `database.py`: retained Python comparison path.
- `scripts/run-rust-poc.sh`: documented Rust-daemon launch flow.
- `src/frontend/public/`: static assets, including vendored flasher dependencies.

Keep domain/protocol rules and authoritative message state in the selected
daemon. Views own presentation and draft interaction. Do not reimplement the
daemon in JavaScript stores/services or in the Electron launcher. Preserve
compatible REST/WebSocket semantics and explicit unsupported-capability states.
Retain upstream copyright and license notices in reused source.

## Safe work and Git

Inspect root, branch, status, relevant tests, and existing instructions first.
Use the canonical checkout and existing development branch (`main`). Preserve
staged, unstaged, untracked, and ignored user files. Stage only task-owned paths.
Do not create additional branches, worktrees, copied checkouts, or PRs unless
explicitly authorized. Do not stash, reset, force-push, delete data, or publish
releases as incidental work. Commit/push only when requested; a push is not a
release promotion. Resolve conflicts locally without discarding unrelated work.

## Local validation

Use the existing npm manifest and lockfile; inspect scripts before running them.
Reuse installed dependencies. Do not change the module format, introduce a new
package manager, or convert the app to TypeScript as incidental cleanup.

`npm run build-frontend` checks the existing UI build. `npm run test:launcher`
checks the launcher, not the Vue UI or daemon interoperability. The current
manifest has no general UI unit-test/lint/typecheck script. Use focused tests
and real affected UI flows when code changes. Claims about send/receive,
delivery, reconnect, or restart require a real compatible daemon test.

Documentation-only changes need document/link/diff checks, not an app build.
Report exact checks and limitations, commits/push status, and remaining local
changes. Never claim device, native, release, or runtime coverage from mock or
build-only evidence. Do not add optional features or broad refactors just to
apply the principles.
