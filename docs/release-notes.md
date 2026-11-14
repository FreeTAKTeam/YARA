YARA v1.0.0-beta.4 keeps running in the Windows tray when its window is closed and keeps contacts' names after they go offline.

- On Windows, closing the window now hides YARA in the notification-area tray instead of quitting, so it keeps receiving messages. Click the tray icon to reopen it, or right-click it and choose **Quit YARA** to exit. Minimizing to the taskbar works as before. Linux and macOS behave as before.
- Opening YARA while it is already running now brings back the existing window instead of failing because the local port is in use.
- Conversations keep a contact's last announced name when the contact is offline, instead of falling back to its address. A peer seen again without a name no longer replaces the name YARA already knows.

The release bundles LXMF-rs commit `1e0e7ef1d6a4e7a5e5832bee1e139a1e15673f45` with YARA's history-import, Backbone Client and contact-name patches. No Python, Node.js, or separate daemon installation is required. See the [setup and migration guide](https://github.com/FreeTAKTeam/YARA/blob/v1.0.0-beta.4/docs/rust-poc.md).

Downloads:

- Windows x64: portable `.exe`
- macOS Intel and Apple Silicon: one `.zip` per architecture, containing YARA.app
- Linux x64: Debian `.deb` (`yara-reticulum`)
- Raspberry Pi OS 64-bit desktop: Linux ARM64 `.AppImage`

The tray behavior has automated launcher coverage but has not yet been exercised on a Windows desktop. Names are remembered from the announces YARA still holds when beta.4 first runs; a contact whose announce had already been dropped shows its address until it announces again.

**Known issue:** the daemon may remain running after YARA quits. If a later launch reports that its local port is in use, check for a leftover YARA `reticulumd` process.

This is an unsigned beta; Windows SmartScreen and macOS Gatekeeper may require an explicit override. Interface changes require a restart. Package and automated checks do not establish physical-radio delivery, range, sustained-load behavior, or cross-platform hardware acceptance. Voice calls and NomadNet are outside YARA's scope.
