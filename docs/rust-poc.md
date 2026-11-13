# Using YARA

YARA is a superfast, lightweight Reticulum chat client built on the LXMF-rs daemon.
The current release is **v1.0.0-beta.3**. It bundles the frontend and
LXMF-rs at commit `1e0e7ef1d6a4e7a5e5832bee1e139a1e15673f45`
(v0.16.0 plus the interface-discovery and display-name API from
[LXMF-rs #713](https://github.com/FreeTAKTeam/LXMF-rs/pull/713)). The daemon and
frontend communicate locally through the MeshChat-compatible API. The release
applies the bundled history-import, Backbone Client, and contact-name patches
to this pinned backend.

## Install and start

1. Download the matching asset from [YARA releases](https://github.com/FreeTAKTeam/YARA/releases):
   Windows x64 portable `.exe`, macOS Intel or Apple Silicon `.zip`, Linux x64
   `.deb`, or Linux ARM64 `.AppImage` for a 64-bit Raspberry Pi OS desktop.
2. Run the executable, extract and open `YARA.app` on macOS, or make the
   AppImage executable and open it. These test builds are unsigned; Windows
   SmartScreen or macOS Gatekeeper may require an explicit user override.
3. The application starts its bundled daemon and opens the UI. No Python,
   Node.js, or separate daemon is needed on the target machine.

To install the Linux x64 Debian package on Debian or Ubuntu, run
`sudo apt install ./YARA-<version>-linux-<arch>.deb`, then open YARA from the
applications menu. The command is `yara-reticulum`; it can coexist with the
unrelated YARA malware scanner's `yara` command.

The Raspberry Pi AppImage requires a 64-bit desktop. If FUSE 2 is unavailable,
run the AppImage with `--appimage-extract-and-run`. YARA uses
`127.0.0.1:9337` by default; close another local YARA or MeshChat instance
using that port if startup fails. The service binds to loopback, so it is not
available to remote browsers.

## Connect and send a message

A new profile starts with a Backbone Client to the R3AKT server at
`134.122.46.48:37428`. Open **Interfaces**
and check its status; the server can be unavailable and a saved interface is
not proof of a live connection. To use another network, choose **Add Interface**,
enter its settings, save it, and restart with **Restart Now** or close and reopen
YARA. You can also edit, enable, disable, delete, import, or export interfaces
on this page. Interface changes take effect when the daemon restarts.

Choose a display name under **My Identity** and save it; the same section shows
your LXMF address to share with a peer. Restart before announcing a changed
name, then use **Announce Now** to announce your LXMF
identity. Under **Messages**, select a peer from **Announces**, or use
**Compose** and enter its 32-character LXMF destination hash. Send a message
and check its delivery state: an accepted or queued send does not establish
that the recipient received it. Announcements and delivery depend on the peer
and the active network path.

To retrieve messages from a propagation node, choose **Node** in the header (or
**Settings → Propagation**), pick one of the announced nodes with **Use** or
enter its 32-character destination hash, then select **Sync now**. The node
selection persists. Automatic sync and cancelling an active fetch are outside
this trial.

## RNode and transport

Use **Settings → Interfaces → Add Interface → RNode Interface** to configure a radio.
Choose its serial device (for example `COM3`, `/dev/cu.*`, or `/dev/ttyUSB*`),
then select a **Radio preset**:

| Profile | Frequency | Bandwidth | Spreading factor | Coding rate |
| --- | --- | --- | --- | --- |
| Rural fallback | 915.000 MHz | 250 kHz | SF11 | 4/5 |
| Urban mesh | 915.000 MHz | 250 kHz | SF9 | 4/5 |
| Extreme range | 915.000 MHz | 125 kHz | SF11 | 4/8 |
| Rural fast | 915.000 MHz | 500 kHz | SF10 | 4/5 |

Presets fill only frequency, bandwidth, spreading factor, and coding rate;
choose the transmit power separately. All radio fields remain editable, and
the selector shows **Custom / manual settings** when those values do not match
a preset. Existing settings are preserved until you explicitly select a preset
or edit a value. Each RNode Multi Interface subinterface has the same selector.
Save the interface and restart YARA to apply it.

Advanced users can also edit `managed-config.toml` in their profile while YARA
is closed. Saved interfaces and hand-written configuration survive restarts.
The account must have access to the serial
port. Confirm the settings and local radio requirements before transmitting.
The launcher does not set the RNode preamble; firmware behavior varies.

To forward traffic between interfaces, configure and enable the interfaces,
select **Enable transport** under **Transport** on **Settings → Interfaces**,
then restart YARA. Check that each interface is online before testing
forwarding. Transport is not needed merely to use one interface for chat.

To find nodes to connect to, open **Discovered replication nodes** in the same
section. If discovery is off, select **Enable discovery** and restart; nodes
appear a few minutes after they announce. **Connect** adds one as a TCP
interface, which takes effect after a restart.

## Profile and configuration

The packaged app stores its original profile in `~/.yara/` (on Windows,
`%USERPROFILE%\.yara\`); additional profiles are in its `profiles/` directory.
Each has its own identity, message database, display name and network settings.
The identity determines your address. Back up the entire YARA directory before
moving or restoring profiles; it is separate from Python MeshChat storage.

Under **My identity → Edit identity → Manage identities**, choose an existing
profile, import a 64-byte Reticulum private identity file, or select a MeshChat
storage folder. Close and reopen YARA to use the selected profile. Importing a
different identity can create a separate profile or replace the selected profile
after a second warning. Replacement keeps the previous profile as a selectable
backup. Existing YARA messages and settings stay with their original identity;
they are not copied into a newly imported profile. Identity files are private
keys: keep them secret and back them up securely.

The managed config is created once. Later starts preserve saved interface and
transport changes. If an older `generated-config.toml` exists without a managed
config, the launcher migrates a copy and leaves the original in place. Startup
also updates the config's display name from the saved profile (or the
`RUST_POC_DISPLAY_NAME` override).

## Moving from MeshChat

Beta 2 adds the migration flow below. Beta 1 imported only identities
automatically and did not import message history.

Close MeshChat before starting the import. YARA asks before copying an identity
or merging messages, shows the source folder and message count, and offers a
folder picker for custom locations. **Skip import** continues without copying
anything; **Cancel** closes YARA. Successful or declined offers are recorded in
`meshchat-import.json` in YARA's profile so the question does not repeat.

On Windows it checks beside the original portable executable using its directory
or file environment variables, the executable path and the Windows Desktop
location. It also checks the home directory and source-checkout `storage/`.
Supported profile locations include `.reticulum-meshchat/identity` and
`storage/identity`. A `.reticulum/config` beside the executable is detected as a
network-config hint. A `.reticulum` folder is treated as a chat profile only if
it also contains the identity and its MeshChat database; a transport identity
alone is not automatically imported.

MeshChat stores history at
`<storage>/identities/<identity-hash>/database.db`, where the hash is derived from
the selected private key. The native importer reads that database without
modifying it, then transactionally inserts missing message hashes into YARA's
own database. Do not copy `database.db` over `reticulum.db`: their schemas differ.
If no matching message database is found, the dialog explicitly offers only the
identity. Text, title, incoming/outgoing direction, timestamps, historical status
and embedded image/audio/file fields are preserved. Imported history is never
queued for retransmission. Existing YARA messages with the same hash are kept.

If Beta 1 already copied your identity but omitted messages, the next launch
can offer the matching MeshChat profile's history. A different identity is offered
as a separate profile or, after explicit warnings, as a replacement with a
recoverable backup. A profile with a database and a missing identity requires
restoration of its original key. Contacts, display names and network interfaces
are not imported; configure those in YARA.

Set `YARA_MESHCHAT_IDENTITY` to a full identity-file path for an explicit source
or to retry an offer previously skipped. Its message database must be under the
same storage root, using the layout above. Desktop launches still ask for
confirmation. Headless/source CLI launches require this explicit source to
import and otherwise create/use their own identity. `YARA_IMPORT_MESHCHAT=0`
disables the offer and import. To test migration separately, use a new
`RUST_POC_STATE_DIR` and retain your original profile.

The source includes a migration patch for the pinned LXMF-rs backend and a
bundled `meshchat-import` binary. Both native binaries must be built from that
patched source. The release build stages both binaries in the application.

## Run from source

The source launcher requires Node.js 18+, npm, Git, Bash, and a Rust toolchain
and native build dependencies suitable for LXMF-rs. The following uses a
separate checkout of the daemon revision bundled in the release; it does not
change an existing `../LXMF-rs` checkout:

```bash
git clone https://github.com/FreeTAKTeam/LXMF-rs.git ../LXMF-rs-yara
git -C ../LXMF-rs-yara checkout 1e0e7ef1d6a4e7a5e5832bee1e139a1e15673f45
git -C ../LXMF-rs-yara apply "$(pwd)/patches/lxmf-rs-meshchat-import.patch"
git -C ../LXMF-rs-yara apply "$(pwd)/patches/lxmf-rs-backbone-client.patch"
git -C ../LXMF-rs-yara apply "$(pwd)/patches/lxmf-rs-peer-names.patch"
(cd ../LXMF-rs-yara && cargo build --locked -p reticulumd --bin reticulumd --bin meshchat-import)
npm ci
npm run build-frontend
RUST_POC_LXMF_RS_ROOT="$(pwd)/../LXMF-rs-yara" ./scripts/run-rust-poc.sh tcp
```

Open `http://127.0.0.1:9337` in a browser; Ctrl+C stops the daemon. To use
the Electron shell instead, run
`RUST_POC_LXMF_RS_ROOT="$(pwd)/../LXMF-rs-yara" npm run electron:rust-poc`.
The launcher normally looks for `../LXMF-rs/target/debug/reticulumd`;
`RUST_POC_RETICULUMD_BIN` can instead specify an executable directly.

Source launches default to `storage/rust-poc/`, separate from the packaged
profile. Set `RUST_POC_STATE_DIR` to choose another profile and
`RUST_POC_BIND=127.0.0.1:PORT` to choose another local port. The `tcp`, `rnode`,
and `bridge` launch modes only seed a new managed config; switching modes or
changing seed environment variables does not replace an existing config. Use
the Interfaces page to change an existing profile. For an initial RNode or
bridge profile, set `RUST_POC_RNODE_PORT`, `RUST_POC_RNODE_FREQUENCY`,
`RUST_POC_RNODE_BANDWIDTH`, `RUST_POC_RNODE_SPREADING_FACTOR`,
`RUST_POC_RNODE_CODING_RATE`, and `RUST_POC_RNODE_TX_POWER` before launching;
bridge also seeds TCP and enables transport. These settings must match the
actual device and network. TCP defaults can be changed on first launch with
`RUST_POC_TCP_HOST` and `RUST_POC_TCP_PORT`.

## Scope and testing

This is an interoperability trial, not full Python MeshChat API parity. Voice
calls, NomadNet, outbound audio recording, automatic propagation sync, and
propagation-fetch cancellation are outside the trial. File and image transfer,
inbound audio, and manual propagation fetch are included, but delivery depends
on the peer, its limits, and the path. For each interface, check an announce,
exchange messages in both directions, inspect delivery states, and restart to
check that history reloads. Do not infer radio or cross-platform delivery from a
successful build alone.

## Historical field-trial notes (2026-09-27)

The following observations describe earlier tests, not acceptance of every
current build, device, or network path.

The RNode trial used `/dev/ttyUSB1`, 915 MHz, 500 kHz bandwidth, spreading
factor 10, coding rate 4/5, and 22 dBm. Its firmware reported 18 preamble
symbols; the launcher did not provide the requested 20-symbol override. The
launcher-derived radio bitrate was 3,906 bps, with forwarded announces capped
at 2% for that seeded bridge configuration. These are trial values, not
settings to copy without checking the device and local requirements.

On 2026-09-27, a fetch from Beleth LXMD PN
(`4cce8a55cc0f232fb0946b392a73fa92`) failed while activating the remote
link over a seven-hop route. A fetch from the nearer announced node
`ce76297d9bb990797c159e52b80274b4` succeeded and delivered two previously
missing images from Columba. That nearer node is selected in the saved trial
profile; a subsequent manual sync completed with zero new inbox messages.

File attachments are accepted through the existing send-message API and exposed
in conversation history as downloadable files. The combined message and file
size is limited to 900 KB for this client; transport delivery still
depends on the recipient's LXMF size limit and the active interface.
Image fields are also mapped for sending and display. A previously received
14,741-byte JPEG now renders in the conversation. A synthetic 271,102-byte
file arrived intact over local TCP. A similarly sized file sent to a public
peer failed after API acceptance; the daemon recorded `resource transfer timed
out`. This does not establish whether the limiting factor was the public path,
the receiving peer, or transport behavior on that route. A second local Rust
identity could not connect concurrently to `rmap.world:4242`, so the same-size
public route test could not be completed without the remote peer.

Incoming LXMF audio field `7` is mapped to the existing player. Sideband's
Opus-in-Ogg mode `0x10` is available for playback; outgoing audio recording
is outside this client.
A small PNG image field also transferred intact between the two local Rust
identities.

Two temporary Rust identities exchanged small text files in both directions
over a local TCP server. Both senders reached `delivered`, and both receivers'
conversation histories contained the expected filenames and exact bytes. The
temporary peers were stopped after the check. File transfer over the public TCP
server and RNode is still to be checked with another device.

## Initial TCP test (2026-09-27)

The TCP interface connected to `rmap.world:4242`. The Rust daemon received
public announces, and the Messages tab displayed them after the compatibility
frontend was made tolerant of unnamed peers and Unix timestamps. A temporary
second Rust client resolved this app's LXMF address through the server and
received its announce with the configured profile name. A text message reached
this app, and a reply sent with the browser UI reached the second client; both
messages reached a delivered state. A further browser send updated from
outbound to delivered without reloading. The temporary client has been stopped.

An ordinary repeated announce from this app was not observed by the second
client before its explicit path request. The daemon did report sending it, so
this test establishes targeted reachability and chat delivery, but does not
establish that every repeat announce is broadcast to every peer on the public
server.

## Initial RNode test (2026-09-27)

The RNode on `/dev/ttyUSB1` reported online with the settings above. The Rust
daemon recorded 6,423 received bytes, 4,867 transmitted bytes, and eight
received announces during the radio test. Its history contained incoming text
messages and delivered outgoing text messages with silkedeck, corvodeck, and
raphydeck. This confirms two-way LXMF text chat over LoRa. File transfer over
LoRa and forwarding between LoRa and TCP remain separate checks.

## Combined transport trial (2026-09-27)

`bridge` mode starts TCP and RNode together with Reticulum transport enabled.
The TCP client initially received a connection refusal from `rmap.world:4242`,
then reconnected while the RNode stayed online. In one live snapshot, the TCP
interface had received 47 announces and the RNode had transmitted 17. These
counters are consistent with TCP-to-LoRa announce forwarding. An incoming LoRa
announce and its corresponding TCP transmission are still needed to verify the
reverse direction. A separate direct connection probe was refused while the
daemon's existing TCP connection continued receiving traffic.

After reports of inconsistent delivery to silkedeck
(`18b5d44a7f0220e0439c4773090fe198`), the bridge path check showed a
one-hop RNode route to that destination and a four-hop TCP route to Columba.
The RNode reported 3,906 bps, while announce pacing had used the generic
62,500 bps interface default. Before correction, 741 announces had been sent
over LoRa and recent radio transmit airtime was about 18%. With the configured
radio bitrate and 2% announce cap, a later sample showed 46 TCP announces
received, three RNode announces sent, and 3.6% recent radio transmit airtime.
This reduces channel load; a repeated Columba-to-silkedeck delivery trial is
needed to establish whether it fixes the intermittent messages. A manual fetch
from the selected remote propagation node imported 12 messages in 71 seconds.
The daemon is not itself running a local propagation node.
After the pacing change, the user confirmed that messages could be sent and
received. The bridge remained connected on TCP and online on RNode, with a
one-hop RNode path to silkedeck and about 3.5% recent transmit airtime. This
confirms working exchange in the new configuration; a timed series of messages
is still needed to measure whether the earlier sporadic failures are resolved.
Columba later submitted three more messages to silkedeck. Columba showed all
three as in propagation, while the bridge's RNode receive counter did not
increase during the observation window. Their arrival at silkedeck has not
been confirmed; the receiver's propagation node choice and fetch result are
needed to trace the remaining leg.
A fresh path request from the bridge went out over LoRa, followed by a new
silkedeck announce on the RNode interface, confirming radio reachability. The
propagation node selected by silkedeck, its fetch result, and receipt of the
three queued messages remain unconfirmed. The Rust app's own successful fetch
uses a different LXMF identity and does not retrieve silkedeck's queue.

The bridge was left idle without test messages for about four minutes. From
17:05 to 17:09 UTC, TCP remained connected without new close or error events,
the RNode remained online, and the one-hop RNode path to silkedeck stayed in
the path table. After that idle interval, the user sent a message and reported
it delivered. This confirms one successful post-idle delivery; it does not
establish the fate of Columba's three earlier messages in propagation or a
sustained delivery rate.
