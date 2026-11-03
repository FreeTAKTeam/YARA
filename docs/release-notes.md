YARA v1.0.0-alpha.2 makes RNode interfaces easier to configure and includes the changes since alpha.1.

- **RNode presets.** Select Rural fallback (250 kHz, SF11, 4/5), Urban mesh (250 kHz, SF9, 4/5), Extreme range (125 kHz, SF11, 4/8), or Rural fast (500 kHz, SF10, 4/5). All use 915.000 MHz. The selector is available when adding or editing a radio, including each RNode Multi Interface subinterface. Serial port and transmit power stay unchanged; radio values remain editable, and custom settings are recognized automatically. Advanced users can still edit `managed-config.toml` by hand. Save and restart to apply interface changes.
- **MeshChat identity import.** First launch can copy an existing MeshChat identity while preserving its LXMF address. Existing YARA identities are never replaced. Messages and attachments are not imported; see the setup guide for custom paths and ambiguous-identity handling.
- **Linux x64 Debian package.** A `.deb` joins the existing portable assets. Its application command is `yara-reticulum`, so it can coexist with the YARA malware scanner. The release build checks package contents and installation, local daemon/UI startup, and removal on Ubuntu 22.04.
- **macOS window controls.** The app header leaves room for the native window controls.

The bundled daemon remains LXMF-rs commit `1e0e7ef1d6a4e7a5e5832bee1e139a1e15673f45`, the same revision as alpha.1. This release does not upgrade the daemon.

Downloads:

- Windows x64: portable `.exe`
- macOS Intel and Apple Silicon: one `.zip` per architecture, containing YARA.app
- Linux x64: Debian `.deb`
- Raspberry Pi OS 64-bit desktop: Linux ARM64 `.AppImage`

The daemon and frontend are bundled; no Python, Node.js, or separate daemon installation is required. See the [setup guide](https://github.com/FreeTAKTeam/YARA/blob/v1.0.0-alpha.2/docs/rust-poc.md).

This is an alpha with unsigned builds. Windows SmartScreen and macOS Gatekeeper may require an explicit override. Interface changes require a restart. Preset and launcher regression checks and the frontend build cover configuration behavior; they do not establish physical-radio delivery, range, or cross-platform hardware acceptance. No new physical RNode or sustained-load qualification was performed for this release. Voice calls and NomadNet remain outside YARA's scope.
