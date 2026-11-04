YARA v1.0.0-beta.1 is the first v1 beta of the lightweight Reticulum chat client. It repackages the committed alpha.2 functionality with a beta version number; there are no application or daemon changes since alpha.2.

The beta includes configurable RNode radio presets, MeshChat identity import, and the Linux x64 Debian package. It bundles LXMF-rs commit `1e0e7ef1d6a4e7a5e5832bee1e139a1e15673f45` and the frontend. No Python, Node.js, or separate daemon installation is required. See the [setup guide](https://github.com/FreeTAKTeam/YARA/blob/v1.0.0-beta.1/docs/rust-poc.md) for installation, identity import, and interface configuration.

Downloads:

- Windows x64: portable `.exe`
- macOS Intel and Apple Silicon: one `.zip` per architecture, containing YARA.app
- Linux x64: Debian `.deb` (`yara-reticulum`)
- Raspberry Pi OS 64-bit desktop: Linux ARM64 `.AppImage`

**Known issue:** the daemon may remain running after YARA closes, preventing a later launch from binding to the local port. Check for a leftover YARA `reticulumd` process if startup reports that the port is in use.

This is an unsigned beta; Windows SmartScreen and macOS Gatekeeper may require an explicit override. Interface changes require a restart. Package and automated checks do not establish physical-radio delivery, range, sustained-load behavior, or cross-platform hardware acceptance. Voice calls and NomadNet are outside YARA's scope.
