# Multiple YARA Identities Implementation Plan

**Intent:** Let a person import a Reticulum identity, including MeshChat, switch between identities, or explicitly replace their current profile after warnings.
**Current Behavior:** The startup importer rejects a different identity and the launcher uses one state directory.
**Expected Outcome:** Separate, selectable profiles keep their own identity, messages and settings; importing a different key never silently overwrites a profile. Replacing the active profile requires a non-default warning and retains its previous data as a backup.
**Target-Perspective Output:** A user can choose a MeshChat folder or a raw private identity file, preview the source, import and activate it, switch back to another profile, and see the same identity and associated history after restart.
**Truth Owner:** Electron's native launcher owns local profile selection and safe file lifecycle; the existing native importer owns identity validation and message database import. The daemon owns all message state.
**Contract Boundary:** The renderer requests the native identity manager without file paths or key bytes; native dialogs and the importer perform selection, validation, consent and storage.
**Cutover:** The startup migration offers distinct identities instead of rejecting them, and startup resolves the active profile before launching the daemon. Existing root profile remains usable without migration.
**Displaced Path:** Remove the blanket different-key rejection from interactive import; preserve strict matching for history merge into an existing profile.
**Value Density:** Reuse the existing launcher, consent dialog, key copy, importer and native settings; avoid a new database or dependency.
**Acceptance Evidence:** Automated tests for identity matching, different-key selection, import, switching, cancellation, non-default warnings, backup/recovery, failure paths, and restart; real importer/daemon fixture checks where available; build and launcher suite.
**Evidence Lane:** Isolated temporary profiles; Linux local runtime where practical, plus Windows path/interaction contracts. No operations on the user's profiles.
**Kill Criteria:** No silent replacement, sharing a message DB between identities, exposing key bytes to the renderer, changing source files, losing the old profile on failure, or changing live profile files while a daemon may be writing.
**Architecture Slice:** Electron identity/profile storage and import modules; launch selection and narrow IPC; one contextual My Identity action; launcher tests and usage documentation. Preserve unrelated dirty launcher changes and LXMF-rs work.
**Plan Review Gate:** PRE self-review before execution; inspect failure and recovery paths before accepting implementation.

## Ordered work

1. Map startup, daemon lifecycle and storage boundaries. Define and test a durable profile registry that preserves the existing root as the default profile, validates selected paths, and selects a profile before daemon launch.
2. Extend interactive import to inspect any supported identity, preserve matching-profile history merge, offer separate-profile import and explicitly warned replacement, retain old data for recovery, and maintain source read-only. Reuse the native import contract and never switch the running daemon in place.
3. Add a contextual identity manager via a narrow Electron bridge for profile selection, identity-file or MeshChat-folder import, and restart/next-launch behavior. Keep identity and database isolated. Test cancellation, failures, races and non-default actions.
4. Update user documentation, run the launcher and UI builds, exercise a real native fixture and profile restart where feasible, and report platform and live-peer limits. No commit, push, release, or alteration of installed profiles without a request.

## PRE self-review

- A single database cannot safely serve different identities; each imported identity gets a separate directory, including settings and history. The existing root remains an intact profile.
- Replacement is a non-default, explicit second confirmation: the previous profile is retained and marked as a backup; no key or database is overwritten. Switching is a registry update, never a live-daemon mutation.
- Import into an isolated directory must finish before atomic registry publication; a failed import must not select a partial profile or alter the source. Validation remains in the bundled native importer.
- Startup migration may change the selected directory, so both desktop and headless launchers must use the resolved profile for daemon arguments. Headless operation cannot approve replacing a different identity.
- The manager is available only through the app's existing preload, accepts no path from the renderer, and uses native file/folder pickers. The existing marker suppresses startup prompts but not an explicit manager request.

## Verification record

- Launcher suite: 51 tests passed, including distinct identities, backup warning,
  cancelled and failed imports, existing-profile selection, startup cutover,
  missing-key and malformed-registry protection, and the restricted IPC entry.
- `npm run build-frontend` and the existing five profile-icon tests passed.
- An isolated Linux fixture used the local native importer and daemon to import a
  different MeshChat identity and three messages, start with that LXMF address,
  then select the original and start with its address. Source key and database
  hashes and the original key hash stayed unchanged. This used local development
  binaries, not a rebuilt release candidate.
- Native Electron dialogs and the full graphical flow were not exercised on
  Windows, macOS or Linux in this session. Treat that user-facing path as
  implemented but not yet proven by a native GUI test. No real user profiles
  were touched and no release, commit or push was performed.
