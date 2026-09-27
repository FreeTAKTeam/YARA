# Rust backend proof of concept

This is a local text-chat trial of the existing MeshChat frontend with the
`reticulumd` MeshChat API in a sibling
[FreeTAKTeam/LXMF-rs](https://github.com/FreeTAKTeam/LXMF-rs) checkout. It uses
an isolated identity and database in `storage/rust-poc/`, so it does not migrate
or modify Python MeshChat storage. TCP and RNode use the same identity when
switched.

## Build and run TCP

Place `YARA` and `LXMF-rs` in the same parent directory. Clone `LXMF-rs` only
if that sibling checkout does not already exist. From this checkout:

```bash
git clone https://github.com/FreeTAKTeam/LXMF-rs.git ../LXMF-rs
npm ci
npm run build-frontend
(cd ../LXMF-rs && cargo build -p reticulumd --bin reticulumd)
./scripts/run-rust-poc.sh tcp
```

Open `http://127.0.0.1:9337`. The generated TCP configuration connects to
`rmap.world:4242`. Use the UI to announce and exchange text with another LXMF
peer. The Interfaces page shows the daemon's configured interface. Stop the
daemon with Ctrl+C before changing the interface.

The launcher uses the saved profile display name at startup for LXMF
announces. After changing the name in the UI, restart the app before announcing
again. Set `RUST_POC_DISPLAY_NAME` to override the saved name.

To run the local Electron shell instead, use `npm run electron:rust-poc` after
building `reticulumd`. It starts the same launcher in TCP mode. No installer is
built.

## Switch to serial RNode

The connected RNode is at `/dev/ttyUSB1`. The current login must have read and
write access to that device. Set `DEVICE=/dev/ttyUSB1` and the matching
`FREQUENCY_HZ`, `BANDWIDTH_HZ`, `SPREADING_FACTOR`, `CODING_RATE`, and
`TX_POWER_DBM` to the confirmed values, then run:

```bash
RUST_POC_RNODE_PORT="$DEVICE" \
RUST_POC_RNODE_FREQUENCY="$FREQUENCY_HZ" \
RUST_POC_RNODE_BANDWIDTH="$BANDWIDTH_HZ" \
RUST_POC_RNODE_SPREADING_FACTOR="$SPREADING_FACTOR" \
RUST_POC_RNODE_CODING_RATE="$CODING_RATE" \
RUST_POC_RNODE_TX_POWER="$TX_POWER_DBM" \
./scripts/run-rust-poc.sh rnode
```

Confirm the device path before starting. Use
`MESHCHAT_RUST_POC_MODE=rnode npm run electron:rust-poc` with the same RNode
environment variables for Electron. The launcher writes
`storage/rust-poc/generated-config.toml` on each start. RNode uses strict
interface startup so invalid radio settings or an unavailable device fail
visibly. TCP keeps the UI available while a temporarily unavailable server
reconnects; check the interface status before treating it as connected.

For the current 915 MHz trial, set `DEVICE=/dev/ttyUSB1`,
`FREQUENCY_HZ=915000000`, `BANDWIDTH_HZ=500000`, `SPREADING_FACTOR=10`,
`CODING_RATE=5` (4/5), and `TX_POWER_DBM=22`. The RNode reports 18 preamble
symbols at these settings. Its firmware computes this value; the host does not
provide an override for the requested 20 symbols.
The launcher derives the radio bitrate from bandwidth, spreading factor, and
coding rate (3,906 bps for these settings) and limits forwarded announces to
2% of that bitrate. This keeps public TCP announce traffic from occupying a
large share of the LoRa channel in bridge mode.

To run TCP and RNode together as a Reticulum transport node, use the same
RNode environment variables with `./scripts/run-rust-poc.sh bridge`, or set
`MESHCHAT_RUST_POC_MODE=bridge` when launching Electron. Bridge mode connects
to `rmap.world:4242` and includes `[reticulum] enable_transport = true` in the
generated configuration. Both interfaces appear in the Interfaces page.
Bridge mode allows the TCP client to retry when the public server is temporarily
unavailable; check that both interfaces show online before testing forwarding.

## Chat check for each interface

1. Confirm the interface is enabled and a peer announce appears in Messages.
2. Announce this identity and exchange a short text message in both directions.
3. Check that the outbound message reaches a terminal delivery state, or record
   the actual failure; an accepted send alone does not prove delivery.
4. Restart the backend and confirm that the conversation reloads from history.

Record TCP and RNode results separately. The Rust mode hides controls for
voice calls, NomadNet, outbound audio recording, and interface editing.
Interfaces are configured in the generated TOML for this trial.

For messages queued at a propagation node, click **Node** in the header and
enter that node's 32-character destination hash, then click **Sync Messages**.
This manual fetch uses the POC identity and stores retrieved messages in the
same conversation history. The node setting persists across restarts. A node's
display name alone is insufficient to target a fetch. Automatic sync and
cancelling an active fetch are not included in this trial.

On 2026-09-27, a fetch from Beleth LXMD PN
(`4cce8a55cc0f232fb0946b392a73fa92`) failed while activating the remote
link over a seven-hop route. A fetch from the nearer announced node
`ce76297d9bb990797c159e52b80274b4` succeeded and delivered two previously
missing images from Columba. That nearer node is selected in the saved POC
profile; a subsequent manual sync completed with zero new inbox messages.

File attachments are accepted through the existing send-message API and exposed
in conversation history as downloadable files. The combined message and file
size is limited to 900 KB for this proof of concept; transport delivery still
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
is outside this POC.
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
