# MeshChat migration evidence — 4 November 2026

This records the implementation checks before Beta 2 release preparation. At
that stage no commit, push, installation or release publication was performed.
Existing launcher shutdown edits and the prior profile-icon fix were preserved. No real user MeshChat/YARA profile was migrated or modified.

## Verified behavior

- A synthetic Windows Desktop layout placed YARA beside `.reticulum/config`
  and a MeshChat storage folder. The actual native inspector found the key's
  matching `identities/<identity-hash>/database.db`. Separate tests cover portable
  executable directory/file variables, executable path and Desktop fallback.
- The dialog contract showed the source and three-message count before any key
  or history mutation. Accept, skip, cancel, folder selection, explicit headless
  import and opt-out have focused regressions. A source key replaced during
  confirmation was rejected before target publication.
- Real native imports succeeded for a new profile and for a simulated Beta 1
  profile that already had the same identity and one newer native message.
  Repeating each import added zero rows and skipped three duplicates.
- Source database/key SHA-256 checks stayed identical. Target identity bytes
  matched the selected source. Foreign identities are rejected without target
  database creation. Atomic key-publication race and disk-failure checks pass.
- The real daemon API and browser exposed all three restored messages plus the
  retained newer message in chronological order. Text/title, fractional
  timestamp, file bytes, image field and historical sending progress survived.
  Imported runtime rows have terminal `cancelled` status and do not enter the
  retry query. The UI labels them as imported history and hides Cancel/Retry.
- After the isolated daemon restarted, the LXMF address, all four messages,
  attachment fields, fractional timestamp and history label remained correct.
  The daemon used only a loopback test transport; no peer messages were sent.
- WAL-backed source import, corrupt JSON/progress rollback, deduplication,
  no-overwrite and ascending/descending cursor pages—including fractional
  timestamps arriving in a later import—have native regressions.

## Checks

| Check | Result |
| --- | --- |
| `npm run test:launcher` | 37 passed |
| Prior profile-icon regression | 5 passed |
| `npm run build-frontend` | Passed; existing Vite bundle warnings |
| RPC library full suite | 888 passed, 9 existing ignored tests |
| Latest native migration regression | 3 passed after validation/order fixes |
| `cargo test -p meshchat-api` | 29 passed |
| Native CLI identity/profile regression | 1 passed |
| Both native debug binaries | Built successfully |
| Targeted Clippy on RPC/API/daemon libraries/binaries, `-D warnings` | Passed; unrelated dependency warnings remain |
| `cargo fmt --all -- --check` | Passed |
| Both repository diff whitespace checks | Passed |
| Final build-workflow YAML parse | Passed |

The full RPC suite ran before the final stricter import validation; the focused
migration tests and both binaries were rerun afterward. No broader suite result
is claimed for changes made after that run.

The final ten-file backend patch was applied to the exact pinned commit
`1e0e7ef1d6a4e7a5e5832bee1e139a1e15673f45` using a temporary Git index. Nine
implementation/test files byte-match the reviewed local native source; the
storage module declaration intentionally excludes unrelated modules on the
newer development branch. The real worktree/index was untouched. CI now applies
that patch, builds/tests both binaries and requires the importer in packages.

## Review and limits

PRE and POST reviews were aligned. Correctness/maintenance review findings on
typed metadata, archived actions and source-key changes were fixed and checked.
An independent verifier repeated the pinned-patch comparison and inspected the
live fixture API, native statuses and unchanged source hashes.

Evidence artifacts are in `/tmp/yara-meshchat-migration-jvk8nq0t/` for this session
(consent, API, restart and browser captures). The browser was checked at desktop
and narrow sizes; the existing narrow-layout overflow was not redesigned.

This is Linux native/runtime fixture evidence plus simulated Windows
discovery/dialog contracts. Actual Windows dialogs, Windows package execution,
and compilation of the exact patched pinned backend were not performed.
Network configuration, display names, contacts and read markers are not
imported. No hardware, peer delivery or sustained-load qualification occurred.

## Beta 2 release preparation

The user subsequently authorized committing/pushing both fixes and publishing
`v1.0.0-beta.2`. The release candidate excludes the pre-existing shutdown patch.
Its exact staged startup source passes 29 launcher tests; the five icon tests
and six RNode-preset tests also pass, and the frontend builds. CI now runs the
icon tests explicitly alongside native importer and launcher checks. The
five-platform release workflow is the remaining packaging/publication gate.
