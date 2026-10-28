YARA v0.2.0 bundles [LXMF-rs v0.16.0](https://github.com/FreeTAKTeam/LXMF-rs/releases/tag/v0.16.0) at commit `45b5f5650b375ff418ec849cd9f99bf7f63a106c` with the MeshChat-compatible UI.

The **Interfaces** page manages multiple TCP and RNode interfaces and transport mode. Changes persist in `~/.yara/managed-config.toml` (`%USERPROFILE%\.yara\managed-config.toml` on Windows) and take effect after restarting YARA. Existing generated interface settings are migrated once, leaving the old configuration file untouched. A new profile starts with TCP to `rmap.world:4242`. The **About → App Info** page reports the bundled LXMF-rs version, and the Rust UI is titled YARA with attribution to Reticulum MeshChat.

Portable assets:

- Windows x64: portable `.exe`
- macOS Intel: `.zip` containing YARA.app
- macOS Apple Silicon: `.zip` containing YARA.app
- Raspberry Pi OS 64-bit desktop: Linux ARM64 `.AppImage`

The daemon and frontend are bundled. No Python or Node.js installation is needed on the target machine. See the [setup guide](https://github.com/FreeTAKTeam/YARA/blob/v0.2.0/docs/rust-poc.md).

These builds are unsigned. Windows SmartScreen and macOS Gatekeeper may require an explicit user override. Voice calls and NomadNet are outside YARA's current scope. LXMF-rs v0.16.0 does not yet establish production resource stability or multi-hour delivery acceptance; see upstream [issues #663](https://github.com/FreeTAKTeam/LXMF-rs/issues/663) and [#678](https://github.com/FreeTAKTeam/LXMF-rs/issues/678). Hardware and cross-platform chat behavior require checks on the corresponding devices.
