# Notention Offline Manual

This guide covers operating Notention without internet connectivity.

## Core Principle

**Notention works offline by default.** Network is an enhancement, not a requirement.

## Offline Capabilities

### ✅ Fully Offline
- Create, edit, and organize notes
- Build biological manifests (profiles & groups)
- Run survival routing (local map data required)
- View match history and receipts
- Device-to-device via mesh bridge
- Export/import all data (JSON, QR, Markdown)

### 🔄 Requires Sync
- Publishing notes to network
- Receiving matches from others
- Multi-device convergence
- Relay health updates

## Offline Workflow

### 1. Prepare Before Going Offline
```bash
# Export current state for backup
pnpm cli export --output backup-$(date +%Y%m%d).json

# Pre-load map tiles for your area (if using map)
pnpm cli map cache --region "your-area" --zoom 10-14

# Ensure mesh bridge is paired (if using Meshtastic)
pnpm cli mesh pair --device /dev/ttyUSB0
```

### 2. During Offline Operation

#### Notes & Matches
- Create notes normally — they're stored locally first
- Matches are computed locally against your notes
- Outgoing matches queue in outbox (auto-flush on reconnect)
- Incoming matches from mesh appear immediately

#### Biological Manifests
- Create/edit profiles and groups fully offline
- QR codes work offline (scan with camera)
- Export manifests for sharing via mesh/QR

#### Survival Routing
- Requires pre-cached map data
- Run routing engine locally
- Export routes as GPX/GeoJSON for offline navigation

#### Mesh Bridge (Meshtastic)
```bash
# Start bridge (run on laptop/phone with Meshtastic device)
pnpm relay --port /dev/ttyUSB0 --ws-port 8080

# In Notention UI: Settings → Network → Mesh Bridge → Connect to ws://localhost:8080
```

### 3. Returning Online

#### Automatic
- Outbox drains automatically on reconnect
- Multi-device sync converges via replaceable events
- Relay health updates refresh

#### Manual (if needed)
```bash
# Force outbox flush
pnpm cli outbox flush

# Force network sync
pnpm cli network sync --network <network-id>

# Verify convergence
pnpm cli device status
```

## Data Export/Import

### Full State Export
```bash
pnpm cli export --output state.json --include keys,notes,manifests,receipts,devices
```

### Selective Export
```bash
# Just manifests for sharing
pnpm cli manifest export --group family --output family-manifest.json

# Just match receipts for verification
pnpm cli receipts export --match <match-id> --output receipt-chain.json
```

### Import
```bash
pnpm cli import --input state.json --merge-strategy newer-wins
```

## Mesh Bridge Setup

### Hardware Requirements
- Meshtastic device (T-Beam, Heltec, RAK, etc.)
- USB/Serial or Bluetooth connection
- Host device (laptop, phone, Raspberry Pi)

### Bridge Daemon
```bash
# Serial (USB)
pnpm relay --port /dev/ttyUSB0 --ws-port 8080 --baud 921600

# Bluetooth
pnpm relay --ble --ws-port 8080 --device "Meshtastic-XXXX"

# With custom TTL/priority
pnpm relay --port /dev/ttyUSB0 --ws-port 8080 --ttl 3600 --priority high
```

### Browser Connection
1. Open Notention in browser
2. Settings → Network → Mesh Bridge
3. Enter `ws://localhost:8080` (or bridge host IP)
4. Click Connect

### Verification
```bash
# Test mesh message
pnpm cli mesh send --text "Test from Notention" --channel 0

# Monitor bridge logs
pnpm relay --port /dev/ttyUSB0 --ws-port 8080 --verbose
```

## Troubleshooting

### Outbox Not Flushing
```bash
# Check queue
pnpm cli outbox status

# Manual flush
pnpm cli outbox flush --force

# Reset and retry
pnpm cli outbox reset
```

### Mesh Not Connecting
- Verify Meshtastic device firmware ≥ 2.5.0
- Check serial port permissions: `sudo usermod -a -G dialout $USER`
- Try lower baud rate: `--baud 115200`
- Check Bluetooth pairing (if BLE)

### Manifest QR Not Scanning
- Ensure QR code is not truncated (max ~3KB for reliable scanning)
- Use "Compact JSON" export for smaller QR codes
- Increase QR version in settings if needed

### Routing Fails Offline
- Verify map tiles cached: `pnpm cli map status`
- Check manifest has valid needs/tolerances
- Try compass fallback mode (always works)

## Emergency Procedures

### Key Loss
1. Use exported nsec backup: `pnpm cli identity import --file backup.nsec`
2. Or use passkey (if configured): `pnpm cli identity unlock --passkey`
3. Re-onboard devices: `pnpm cli device link --qr`

### Complete Data Loss
1. Import from latest backup: `pnpm cli import --input backup.json`
2. Re-join networks via invite QR
3. Re-link devices

### Relay Compromise
1. Revoke relay from network: `pnpm cli network revoke-relay <relay-url>`
2. Generate new invite with clean relays
3. Distribute new invite to members

## Quick Reference Card

| Task | Command | Offline? |
|------|---------|----------|
| Create note | UI or `cli note create` | ✅ |
| View matches | UI | ✅ |
| Create manifest | UI or `cli manifest create` | ✅ |
| Run routing | UI or `cli route calculate` | ✅* |
| Send via mesh | `cli mesh send` | ✅ |
| Publish to Nostr | Auto or `cli publish` | 🔄 |
| Sync devices | Auto or `cli device sync` | 🔄 |
| Export all | `cli export` | ✅ |
| Import all | `cli import` | ✅ |

*Requires pre-cached map data

## Support

- Built-in help: `pnpm cli --help`
- Offline docs: `file:///path/to/notention/docs/index.html` (bundled with PWA)
- Community: Nostr `#notention` or GitHub discussions