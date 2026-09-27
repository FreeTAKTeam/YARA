# YARA

**Yet Another Reticulum Application (MeshChat-RS)**

YARA is a lightweight MeshChat-compatible reference application for the FreeTAKTeam Rust Reticulum stack.

Its primary purpose is to exercise `reticulum-rs` and `LXMF-rs` through a real application, using the REST and WebSocket interfaces exposed by the Rust daemon. YARA is intended for interoperability testing, API validation, regression testing, and as a practical example for developers building applications on top of the Rust daemon.

## Project role

YARA is **not intended to compete with or replace Reticulum MeshChat**.

The project exists primarily as an interoperability and API reference implementation. Keeping that boundary is deliberate: YARA should remain small enough to maintain as part of the Rust Reticulum work rather than becoming another independent application product.

The target structure is:

```text
MeshChat-compatible UI
        |
 REST / WebSocket
        |
 LXMF-rs daemon API
        |
   LXMF-rs / RNS
```

This separation is useful beyond YARA itself. It demonstrates that Reticulum applications can use a daemon through a documented application API instead of embedding the Reticulum and LXMF implementation directly.

## What YARA should test

YARA should provide repeatable coverage for:

- REST API compatibility.
- WebSocket events and live message updates.
- RNS destination discovery and announces.
- LXMF message send, receive, history, and delivery state.
- Reconnection and daemon restart behaviour.
- Interoperability with the Python reference implementation and existing Reticulum applications such as MeshChat, Sideband, Columba, Pixys, and RatDeck where applicable.

The same UI should be usable against different compatible daemon implementations when possible. This makes YARA useful for comparing the Rust implementation with the Python reference without changing the application under test.

## Scope

The initial scope is intentionally narrow:

- basic identity handling;
- peer/destination discovery;
- text conversations;
- message history;
- message delivery state;
- REST access;
- WebSocket event delivery.

Features should only be added when they are needed to validate the Rust Reticulum/LXMF implementation or the public daemon API.

In particular, YARA should not automatically inherit every feature implemented by upstream MeshChat. Calls, advanced media features, propagation controls, favourites, or other application-specific features belong here only when they serve an interoperability or API-validation requirement.

## Relationship with MeshChat

YARA uses the public behaviour and API contract of [Reticulum MeshChat](https://github.com/liamcottle/reticulum-meshchat) as an important compatibility target.

Where YARA reuses or derives substantial source code from MeshChat, the original copyright and MIT license notices must be retained as required by the upstream license.

If an implementation is independently written against the documented REST/WebSocket contract, it should still acknowledge MeshChat as the source of the compatible application protocol and user-interface behaviour.

## Maintenance rule

Before adding a feature, ask:

> Does this help test, demonstrate, or validate the Rust Reticulum/LXMF daemon or its public API?

If the answer is no, it is probably outside YARA's scope.

The goal is to keep YARA useful as a real application while avoiding the maintenance cost of a second full chat product.

## Current proof of concept

The first implementation imports the MeshChat source at commit `df5aea9`
plus the local Rust compatibility changes. Its Python backend and unused
application features remain in the source snapshot for now; Rust mode hides
features outside this trial. This import is a starting point for testing the
daemon API, not a commitment to maintain every upstream feature.

Place a [FreeTAKTeam/LXMF-rs](https://github.com/FreeTAKTeam/LXMF-rs)
checkout beside YARA, then run:

```bash
npm ci
npm run build-frontend
(cd ../LXMF-rs && cargo build -p reticulumd --bin reticulumd)
./scripts/run-rust-poc.sh tcp
```

Open `http://127.0.0.1:9337`. See the [Rust POC guide](docs/rust-poc.md) for
serial RNode and TCP plus LoRa transport settings. No packaged YARA release
is available yet.

## Related projects

- [LXMF-rs](https://github.com/FreeTAKTeam/LXMF-rs)
- [Reticulum MeshChat](https://github.com/liamcottle/reticulum-meshchat)
