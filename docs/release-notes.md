YARA v1.0.0-beta.3 connects new profiles to the R3AKT backbone by default, adds Backbone Client interfaces and multiple identities, and fixes the interface actions menu.

- New profiles start with a Backbone Client to the R3AKT server (`134.122.46.48:37428`). Existing profiles keep their saved interfaces.
- Backbone Client is now an interface type you can add, edit and save. The bundled daemon accepts it through the interface API with the same host and port fields as a TCP client.
- The Community Interfaces list on **Add Interface** now matches REM's list of public TCP servers.
- Each interface card's **⋮** menu (Disable, Edit, Export, Delete) is no longer cut off, so existing interfaces can be edited again.
- **My identity → Edit identity → Manage identities** lets you keep several profiles, each with its own identity, messages, display name and network settings. You can import a Reticulum private identity file or a MeshChat storage folder as a separate profile, or replace the selected profile after a second warning; the previous profile is kept as a selectable backup. Close and reopen YARA to switch profiles.
- The RNode flasher's instructions now refer to YARA.

The release bundles LXMF-rs commit `1e0e7ef1d6a4e7a5e5832bee1e139a1e15673f45` with YARA's history-import and Backbone Client patches. No Python, Node.js, or separate daemon installation is required. See the [setup and migration guide](https://github.com/FreeTAKTeam/YARA/blob/v1.0.0-beta.3/docs/rust-poc.md).

Downloads:

- Windows x64: portable `.exe`
- macOS Intel and Apple Silicon: one `.zip` per architecture, containing YARA.app
- Linux x64: Debian `.deb` (`yara-reticulum`)
- Raspberry Pi OS 64-bit desktop: Linux ARM64 `.AppImage`

The identity manager has automated launcher coverage and an isolated Linux fixture test; its native dialogs have not been exercised on Windows or macOS. Back up your whole YARA directory before importing or replacing identities.

**Known issue:** the daemon may remain running after YARA closes. If a later launch reports that its local port is in use, check for a leftover YARA `reticulumd` process after closing the app.

This is an unsigned beta; Windows SmartScreen and macOS Gatekeeper may require an explicit override. Interface changes require a restart. Package and automated checks do not establish physical-radio delivery, range, sustained-load behavior, or cross-platform hardware acceptance. Voice calls and NomadNet are outside YARA's scope.
