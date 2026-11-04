# MeshChat Profile Import Implementation Plan

**Intent:** A Windows user with YARA and MeshChat on the Desktop can choose to bring their identity and message history into YARA, including repairing Beta 1's identity-only import.
**Current Behavior:** The launcher silently copies one discovered identity, checks only home/portable-env/source paths, then reports that messages were omitted.
**Expected Outcome:** Discover profiles beside the original executable and in known storage folders; recognize `.reticulum/config` as a network-config hint; ask before importing; show the source and message count; allow folder selection. Existing matching identities can merge history without replacement.
**Target-Perspective Output:** The import dialog precedes writes; accepted import shows old conversations, text and embedded attachments after restart; declined/cancelled import leaves source and target history unchanged.
**Truth Owner:** The Rust MessagesStore owns SQLite validation and history writes. Electron owns discovery, consent and process orchestration. Source MeshChat files remain read-only.
**Contract Boundary:** A bundled `meshchat-import` native CLI inspects a selected identity/profile and imports into the selected native database. It emits only summary JSON, never key or message contents. No Python runtime or new dependency is required.
**Cutover:** Remove automatic identity-copy behavior from launch preparation; use the consent flow before normal daemon startup. Headless imports require an explicit source environment variable. Retain the existing atomic identity-copy helper behind consent.
**Displaced Path:** The identity-only startup notice and implicit copy are replaced, not supplemented by another automatic migration path.
**Value Density:** Reuse native SQLite, identity derivation, message storage, Electron dialogs and existing launcher tests.
**Acceptance Evidence:** Discovery/consent regressions; native rollback, deduplication, wrong-identity and no-resend tests; fixture import using real CLI and daemon; API/browser history and attachment checks before/after restart; source file hashes unchanged.
**Evidence Lane:** Isolated fixture profiles only. Linux native execution plus Windows path/dialog contract tests; no claim of Windows packaged qualification.
**Kill Criteria:** Do not ship a launcher that promises history import without the native binary. Keep the backend patch pinned and fail packaging if it no longer applies; replace the patch with an upstream pin when published.
**Architecture Slice:** `electron/meshchat-identity.js`, new cohesive `electron/meshchat-import.js` and tests, launcher/main integration, native storage import module, native CLI, existing history projection and pagination, YARA build workflow/backend patch, migration docs.
**Plan Review Gate:** Requires PRE review before execution.

## Scope and invariants

- Detect `.reticulum` beside the Windows original executable (portable DIR/FILE environment, executable path, Desktop fallback); it is a discovery hint, not permission to treat Reticulum transport keys as a MeshChat identity. Profile candidates are explicit identities and known MeshChat/storage roots, including `.reticulum` only when it actually contains a valid MeshChat profile.
- Prefer a detected adjacent profile in the offered list, allow folder selection for custom locations, and never guess among different private identities. Source selection is explicit.
- Prompt before copying a key or importing rows. Import, skip and cancel are distinct; record a successful/declined offer so startup does not repeatedly nag. A different YARA identity cannot be replaced by this flow.
- For Beta 1 recovery, offer only profiles matching the current YARA private identity. Merge missing hashes transactionally, leave existing native rows unchanged, and retain existing YARA settings.
- Open legacy SQLite read-only with a consistent snapshot; derive `identities/<identity hash>/database.db` using the selected key. Validate schema, addresses, direction, hashes, timestamp and fields. Malformed rows fail with an actionable error and roll back all imported rows.
- Preserve message IDs, text/title, addresses, direction, named attachment fields and original historical metadata. Mark imported outbound runtime records non-retryable; never submit history to send/inbound delivery APIs.
- Preserve chronological pagination when old imports merge with newer native messages. Existing REST/WebSocket envelopes remain compatible.
- The source is never modified. Do not operate on the user's installed profile, overwrite keys, copy a foreign database over the native one, or run two daemons against the target profile.
- Network-interface conversion, contacts/favourites, remote peer/radio tests, release publication and installation are outside this change. A `.reticulum/config` hint must not be described as imported network settings.

## Ordered tasks

1. **Native importer and contract.** Main agent; modify only targeted LXMF-rs storage import/pagination files, `meshchat-api` history projection, a new native CLI and focused tests. Read existing schema/identity primitives. Verify package tests, formatting and targeted lint. Gate: transaction rollback, non-overwrite, no-resend, matching identity and exact history projection. Sequential.
2. **Consent and discovery.** Main agent; modify YARA Electron import/launcher/main and their tests, preserving existing shutdown changes and icon fix. Use the native inspector, native dialogs, folder picker and explicit headless source. Gate: Windows Desktop/portable discovery, `.reticulum` hint, accept/decline/cancel, conflict/matching recovery, import failure/retry, prompt before mutations. Depends on CLI contract. Sequential.
3. **Reproducible packaging and docs.** Main agent; add a YARA-owned patch against pinned LXMF-rs, build/stage native importer in existing workflow, update README and rust-poc guide. Validate patch against the pinned backend using an isolated Git index (no extra checkout/worktree). Do not change backend pin to an unpublished commit. Depends on native implementation. Sequential.
4. **Acceptance and review.** Main agent runs real fixture import/daemon/API/browser/restart checks and records concise evidence here. Reviewer checks correctness, POST alignment and maintenance; verifier independently checks artifacts/evidence. Fix important findings before final response. No commits, pushes or releases without a request.

## Execution record

PRE review: aligned, no blockers. The CLI uses `--source-identity`; absent history
is reported explicitly as identity-only. Cancel aborts launch; Skip records a
declined offer in the target profile, and successful import records completion.
Failures leave the offer retryable. Include WAL-backed source snapshots and
chronological pagination after merging with newer native messages. Checking a
patch against the pinned Git index does not establish a tested pinned build.

Completed: native implementation, consent/discovery, build integration and
fixture acceptance. POST/correctness/maintenance reviews and independent
verification accepted the local change. See [EVIDENCE.md](EVIDENCE.md) for exact
checks and remaining Windows/pinned-build limits. No commits/pushes/releases.

Execution: main agent implements sequentially using Krypton Execution. Source
databases/keys and unrelated launcher/icon work are protected. Native CLI plus
fixture daemon/browser evidence is required before completion.

Scope adjustment from review: add an imported-history label and hide active
Cancel/Retry actions for archived messages in ConversationViewer's existing
template. This changes three presentation conditions; it adds no script logic
or responsibility to the large conversation component.

Design evidence: SQLite read transactions preserve a committed snapshot
([transaction documentation](https://www.sqlite.org/lang_transaction.html));
rusqlite provides explicit read-only flags and scoped transactions
([Connection documentation](https://docs.rs/rusqlite/latest/rusqlite/struct.Connection.html)).
Use those existing primitives rather than copying databases or introducing
another JavaScript database writer.

## Authorized release promotion

On 4 November 2026 the user requested commit/push of both the custom-icon and
MeshChat-migration fixes, release CI and publication as `v1.0.0-beta.2`. Use the
existing build/publish workflows and publish only from the verified candidate.
Exclude the pre-existing daemon-shutdown work; preserve it in the worktree.
Do not publish changes to the unrelated LXMF-rs development branch: the exact
reviewed native delta ships through the pinned YARA backend patch.
