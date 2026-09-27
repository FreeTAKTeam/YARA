#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
rust_root=${RUST_POC_LXMF_RS_ROOT:-"$repo_root/../LXMF-rs"}
state_dir=${RUST_POC_STATE_DIR:-"$repo_root/storage/rust-poc"}
bind=${RUST_POC_BIND:-127.0.0.1:9337}
mode=${1:-tcp}

if [[ ! "$bind" =~ ^127\.0\.0\.1:[0-9]+$ ]]; then
    echo "RUST_POC_BIND must use 127.0.0.1:port" >&2
    exit 2
fi
if [[ ! -f "$repo_root/public/index.html" ]]; then
    echo "Build the frontend first: npm ci && npm run build-frontend" >&2
    exit 2
fi
binary="$rust_root/target/debug/reticulumd"
if [[ ! -x "$binary" ]]; then
    echo "Build reticulumd first: (cd $rust_root && cargo build -p reticulumd --bin reticulumd)" >&2
    exit 2
fi

umask 077
mkdir -p "$state_dir"
config="$state_dir/generated-config.toml"
display_name_toml=$(node - "$state_dir/reticulum.meshchat.json" "${RUST_POC_DISPLAY_NAME:-}" <<'NODE'
const fs = require('fs');
let name = process.argv[3];
if (!name && fs.existsSync(process.argv[2])) {
    name = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).config?.display_name;
}
process.stdout.write(JSON.stringify(name || 'Rust MeshChat POC'));
NODE
)
printf 'display_name = %s\n' "$display_name_toml" > "$config"

case "$mode" in
    tcp)
        cat >> "$config" <<'TOML'
interfaces = [
  { type = "TCPClientInterface", enabled = true, name = "meshchat-tcp", target_host = "rmap.world", target_port = 4242 }
]
TOML
        ;;
    rnode|bridge)
        : "${RUST_POC_RNODE_PORT:?Set RUST_POC_RNODE_PORT to the RNode serial device path}"
        : "${RUST_POC_RNODE_FREQUENCY:?Set RUST_POC_RNODE_FREQUENCY in Hz}"
        : "${RUST_POC_RNODE_BANDWIDTH:?Set RUST_POC_RNODE_BANDWIDTH in Hz}"
        : "${RUST_POC_RNODE_SPREADING_FACTOR:?Set RUST_POC_RNODE_SPREADING_FACTOR}"
        : "${RUST_POC_RNODE_CODING_RATE:?Set RUST_POC_RNODE_CODING_RATE}"
        : "${RUST_POC_RNODE_TX_POWER:?Set RUST_POC_RNODE_TX_POWER in dBm}"
        if [[ ! "$RUST_POC_RNODE_PORT" =~ ^/dev/[a-zA-Z0-9_./-]+$ ]] || [[ ! -c "$RUST_POC_RNODE_PORT" ]]; then
            echo "RUST_POC_RNODE_PORT must point to a serial character device" >&2
            exit 2
        fi
        if [[ ! -r "$RUST_POC_RNODE_PORT" || ! -w "$RUST_POC_RNODE_PORT" ]]; then
            echo "This login needs read and write access to $RUST_POC_RNODE_PORT" >&2
            exit 2
        fi
        for value in "$RUST_POC_RNODE_FREQUENCY" "$RUST_POC_RNODE_BANDWIDTH" "$RUST_POC_RNODE_SPREADING_FACTOR" "$RUST_POC_RNODE_CODING_RATE" "$RUST_POC_RNODE_TX_POWER"; do
            if [[ ! "$value" =~ ^[0-9]+$ ]]; then
                echo "RNode radio settings must be unsigned integers" >&2
                exit 2
            fi
        done
        rnode_bitrate=$((RUST_POC_RNODE_SPREADING_FACTOR * RUST_POC_RNODE_BANDWIDTH * 4 / ((1 << RUST_POC_RNODE_SPREADING_FACTOR) * RUST_POC_RNODE_CODING_RATE)))
        if [[ "$mode" == "bridge" ]]; then
            cat >> "$config" <<'TOML'
interfaces = [
  { type = "TCPClientInterface", enabled = true, name = "meshchat-tcp", target_host = "rmap.world", target_port = 4242 },
TOML
        else
            printf 'interfaces = [\n' >> "$config"
        fi
        cat >> "$config" <<TOML
  { type = "RNodeInterface", enabled = true, name = "meshchat-rnode", port = "$RUST_POC_RNODE_PORT", frequency = $RUST_POC_RNODE_FREQUENCY, bandwidth = $RUST_POC_RNODE_BANDWIDTH, spreadingfactor = $RUST_POC_RNODE_SPREADING_FACTOR, codingrate = $RUST_POC_RNODE_CODING_RATE, txpower = $RUST_POC_RNODE_TX_POWER, bitrate = $rnode_bitrate, announce_cap = 2, outgoing = true }
]
TOML
        if [[ "$mode" == "bridge" ]]; then
            cat >> "$config" <<'TOML'

[reticulum]
enable_transport = true
TOML
        fi
        ;;
    *)
        echo "Usage: $0 tcp|rnode|bridge" >&2
        exit 2
        ;;
esac

echo "Rust MeshChat proof of concept: $mode on http://$bind"
echo "Config: $config"
strict_args=()
if [[ "$mode" == "rnode" ]]; then
    strict_args+=(--strict-interface-startup)
fi
exec "$binary" \
    --db "$state_dir/reticulum.db" \
    --identity "$state_dir/identity" \
    --config "$config" \
    --rpc-unix "$state_dir/rpc.sock" \
    "${strict_args[@]}" \
    --meshchat-bind "$bind" \
    --meshchat-assets "$repo_root/public"
