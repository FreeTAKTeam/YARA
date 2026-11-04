# YARA

**Yet Another Reticulum Application**

YARA is a superfast, lightweight Reticulum chat client.

It talks LXMF over Reticulum through the FreeTAKTeam Rust stack (`reticulum-rs` and `LXMF-rs`), which ships inside the app. There is no Python runtime to install, it starts in seconds, and it stays out of your way: conversations, peers, and the few network settings you need.

## Principles

- **Fast.** A native Rust daemon does the networking; the UI only renders what the daemon reports.
- **Lightweight.** One small app per platform, a handful of screens, no background services beyond its own daemon.
- **Simple (KISS).** Chat comes first. Secondary features live behind contextual entry points, never as new top-level screens.
- **Compatible.** YARA speaks the same LXMF as MeshChat, Sideband, Columba, Pixys, and RatDeck, and keeps MeshChat's REST/WebSocket contract so the same UI can run against a compatible daemon.

The structure is:

```text
YARA UI
        |
 REST / WebSocket (MeshChat-compatible)
        |
 LXMF-rs daemon (reticulumd)
        |
   LXMF-rs / RNS
```

Protocol rules and message state stay in the daemon; the UI never re-implements them.

## Scope

YARA covers what a chat client needs:

- identity and display name, with announces;
- peer discovery through announces;
- text conversations with history and delivery state;
- attachments and images where the daemon supports them;
- interfaces, transport and replication-node discovery;
- propagation node selection and sync.

Calls, NomadNet browsing, and other application-heavy features are out of scope. YARA does not automatically inherit every MeshChat feature.

## Relationship with MeshChat

YARA is derived from [Reticulum MeshChat](https://github.com/liamcottle/reticulum-meshchat) by Liam Cottle and keeps its public behaviour and API contract as a compatibility target.

Where YARA reuses or derives source code from MeshChat, the original copyright and MIT license notices are retained as the upstream license requires, and the app credits MeshChat on its About screen.

## Maintenance rule

Before adding a feature, ask:

> Does this make chatting over Reticulum faster or simpler?

If the answer is no, leave it out. YARA stays small on purpose.

## Get started

Download a build from [YARA releases](https://github.com/FreeTAKTeam/YARA/releases).
The application includes the Rust daemon and frontend; Python, Node.js, and a
separate daemon installation are not required. Builds are available for Windows
x64, macOS Intel and Apple Silicon, Linux x64 (Debian package), and 64-bit
Raspberry Pi OS desktop.

Start YARA, open **Interfaces** to check the default TCP connection or add an
interface, and restart YARA after changing interfaces or transport. In
**Messages**, use **Announces** to discover a peer or **Compose** to enter an
LXMF address. See the [usage and build guide](docs/rust-poc.md) for setup,
messaging, RNode, storage, and source-build instructions.

Beta 2 offers to import a MeshChat identity and message history, keeping your LXMF
address. It checks standard and adjacent portable folders and lets you choose
a custom folder. Existing matching YARA identities can recover missing history
after Beta 1. See [MeshChat migration](docs/rust-poc.md#moving-from-meshchat) for
source locations, consent and limitations.

## Current integration

The first implementation imports the MeshChat source at commit `df5aea9`
plus the local Rust compatibility changes. Its Python backend and unused
application features remain in the source snapshot for now; Rust mode hides
features outside this trial. This import is a starting point for testing the
daemon API, not a commitment to maintain every upstream feature.

## Related projects

- [LXMF-rs](https://github.com/FreeTAKTeam/LXMF-rs)
- [Reticulum MeshChat](https://github.com/liamcottle/reticulum-meshchat)
