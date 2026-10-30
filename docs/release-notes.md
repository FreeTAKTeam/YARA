YARA v1.0.0-alpha.1 is the first alpha of the redesigned YARA. It bundles LXMF-rs at commit `1e0e7ef1d6a4e7a5e5832bee1e139a1e15673f45`: [v0.16.0](https://github.com/FreeTAKTeam/LXMF-rs/releases/tag/v0.16.0) plus the interface-discovery and display-name API from [LXMF-rs #713](https://github.com/FreeTAKTeam/LXMF-rs/pull/713), which is not yet merged upstream.

What's new:

- **New look and name.** The UI uses the REM "Night ops" design with bundled Rajdhani and Chakra Petch fonts, a new mesh "Y" logo and icons, and a new splash screen. The app is named YARA throughout; About keeps the Reticulum MeshChat credit and MIT notice.
- **Simpler navigation.** A left rail with Messages, Settings and About. The window title bar and menu bar are replaced by YARA's own top bar (press Alt for the menu).
- **Settings → Interfaces.** Interfaces first, then Transport with a forwarding status pill and a folded list of discovered replication nodes you can connect to over TCP.
- **Settings → Propagation.** Pick a propagation node from the announced ones (or enter an address) and sync from the same page; the header **Node** button opens it.
- **Renames are announced at once.** Changing your display name updates the name the daemon announces, without a restart.
- **Fixes.** Closing and immediately reopening YARA no longer reports "port in use", and the daemon stops when YARA is closed or signalled. Linux launchers show the YARA icon.

Portable assets:

- Windows x64: portable `.exe`
- macOS Intel: `.zip` containing YARA.app
- macOS Apple Silicon: `.zip` containing YARA.app
- Raspberry Pi OS 64-bit desktop: Linux ARM64 `.AppImage`

The daemon and frontend are bundled. No Python or Node.js installation is needed on the target machine. See the [setup guide](https://github.com/FreeTAKTeam/YARA/blob/v1.0.0-alpha.1/docs/rust-poc.md).

This is an alpha. These builds are unsigned; Windows SmartScreen and macOS Gatekeeper may require an explicit user override. Voice calls and NomadNet are outside YARA's scope. Interface discovery is off by default; transport, discovery and newly connected interfaces take effect after a restart. LXMF-rs does not yet establish production resource stability or multi-hour delivery acceptance; see upstream [issues #663](https://github.com/FreeTAKTeam/LXMF-rs/issues/663) and [#678](https://github.com/FreeTAKTeam/LXMF-rs/issues/678). Hardware and cross-platform chat behavior require checks on the corresponding devices.
