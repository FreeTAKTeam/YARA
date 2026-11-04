YARA v1.0.0-beta.2 fixes custom profile icon saving and adds consent-based MeshChat identity and message-history import.

- Custom profile icons and colours now save and remove correctly through the Rust config API, survive restart, and report actionable save errors.
- On Windows, YARA checks beside the original portable executable and on the Desktop for MeshChat storage and `.reticulum/config`. A folder picker supports other locations. Reticulum network configuration is a discovery hint; network settings are not imported.
- YARA asks before importing, shows the source and message count, and offers Skip or Cancel. If Beta 1 already imported your identity, Beta 2 can merge the missing history when the identities match.
- History imports retain existing YARA messages, skip duplicate hashes, preserve embedded attachments and historical metadata, and leave MeshChat's source files unchanged. Imported pending messages are labeled as history and are not resent. Close MeshChat before importing.

The release bundles LXMF-rs commit `1e0e7ef1d6a4e7a5e5832bee1e139a1e15673f45` with YARA's native history-import patch. No Python, Node.js, or separate daemon installation is required. See the [setup and migration guide](https://github.com/FreeTAKTeam/YARA/blob/v1.0.0-beta.2/docs/rust-poc.md).

Downloads:

- Windows x64: portable `.exe`
- macOS Intel and Apple Silicon: one `.zip` per architecture, containing YARA.app
- Linux x64: Debian `.deb` (`yara-reticulum`)
- Raspberry Pi OS 64-bit desktop: Linux ARM64 `.AppImage`

Contacts, display names, read markers and network interfaces are not imported. The migration has automated fixture, API, browser and restart coverage; these checks do not establish migration against every real MeshChat installation.

**Known issue:** the daemon may remain running after YARA closes. If a later launch reports that its local port is in use, check for a leftover YARA `reticulumd` process after closing the app.

This is an unsigned beta; Windows SmartScreen and macOS Gatekeeper may require an explicit override. Interface changes require a restart. Package and automated checks do not establish physical-radio delivery, range, sustained-load behavior, or cross-platform hardware acceptance. Voice calls and NomadNet are outside YARA's scope.
