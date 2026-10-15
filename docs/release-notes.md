YARA proof-of-concept update with the LXMF-rs v0.14.0 Rust daemon and the
15 October 2026 development changes (`ad08517c57c7cab11f25a803b4dc4b649b27898a`).
This is an exact upstream commit, three commits after the v0.14.0 release.
The MeshChat-compatible UI is included.

Assets:

- Windows x64: portable `.exe`
- macOS Intel: `.zip` containing YARA.app
- macOS Apple Silicon: `.zip` containing YARA.app
- Raspberry Pi OS 64-bit desktop: Linux ARM64 `.AppImage`

The daemon and frontend are bundled. No Python or Node.js installation is
needed on the target machine. TCP defaults to `rmap.world:4242`. Use the
**Interfaces** page to select RNode or bridge mode and enter radio settings;
YARA saves them and restarts. Bridge mode enables Reticulum transport. The
settings are stored in `~/.yara/settings.json` (`%USERPROFILE%\.yara\settings.json`
on Windows). See the [setup guide](https://github.com/FreeTAKTeam/YARA/blob/main/docs/rust-poc.md).

The interface form sets frequency, bandwidth, spreading factor, coding rate,
and transmit power. It does not set the RNode preamble; configure and verify
the desired 20-symbol preamble on the RNode separately.

These unsigned builds are for interoperability testing. Windows SmartScreen
and macOS Gatekeeper may require an explicit user override. Voice calls and
NomadNet are outside this POC. Hardware and cross-platform chat behavior must
be verified on the corresponding devices.
