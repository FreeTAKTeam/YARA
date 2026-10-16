YARA v0.1.0-poc.4 bundles the [LXMF-rs interface-management test release](https://github.com/FreeTAKTeam/LXMF-rs/releases/tag/reticulumd-test-0.14.0-meshchat.1) at commit `a8e500e88610210582e8dd8869df8b510e1e75fc` with the MeshChat-compatible UI.

The **Interfaces** page can manage several saved interfaces: add, edit, enable, disable, delete, import, and export. It also has a **Transport mode** control for forwarding traffic between interfaces. Changes are saved in `~/.yara/managed-config.toml` (`%USERPROFILE%\.yara\managed-config.toml` on Windows) and take effect after restarting YARA. Existing generated interface settings are migrated once, leaving the old configuration file untouched. A fresh installation starts with TCP to `rmap.world:4242`.

Portable assets:

- Windows x64: portable `.exe`
- macOS Intel: `.zip` containing YARA.app
- macOS Apple Silicon: `.zip` containing YARA.app
- Raspberry Pi OS 64-bit desktop: Linux ARM64 `.AppImage`

The daemon and frontend are bundled. No Python or Node.js installation is needed on the target machine. See the [setup guide](https://github.com/FreeTAKTeam/YARA/blob/main/docs/rust-poc.md).

These unsigned builds are for interoperability testing. Windows SmartScreen and macOS Gatekeeper may require an explicit user override. Voice calls and NomadNet are outside this proof of concept. Hardware and cross-platform chat behavior require checks on the corresponding devices.
