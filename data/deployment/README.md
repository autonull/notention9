# Notention 3-Relay Deployment Recipe

This directory contains the deployment configuration for running a 3-relay Nostr network for the Notention pilot.

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Three relay keypairs (generate with `pnpm cli relay generate`)
- A contact email/npub for relay metadata

### Generate Relay Keys

```bash
# Generate 3 relay keypairs
for i in 1 2 3; do
  pnpm cli relay generate > relay-${i}.key
  echo "Relay $i: $(cat relay-${i}.key)"
done
```

### Configure Environment

```bash
cp .env.example .env
# Edit .env with your relay pubkeys and contact info
```

### Start Relays

```bash
# Start all 3 relays + local relay
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Verify Relays

```bash
# Test each relay
wscat -c ws://localhost:7001
wscat -c ws://localhost:7002
wscat -c ws://localhost:7003

# Or use the CLI
pnpm cli relay test --url ws://localhost:7001
```

## Relay Configuration

Each relay is configured with:
- Unique port (7001, 7002, 7003)
- Persistent SQLite storage
- NIP-11 relay information document
- Health check endpoint

## Network Invite Generation

Use the Notention CLI or UI to generate a network invite that includes all 3 relays:

```bash
# Generate invite for the 3-relay network
pnpm cli network create \
  --name "Pilot Network" \
  --relays "ws://relay1:7001,ws://relay2:7002,ws://relay3:7003" \
  --output invite.json
```

The invite can be shared as:
- JSON file
- QR code
- NIP-19 encoded string

## Chaos Drills

See `chaos-drills/` for automated failure scenario tests:
- Relay loss (single, multiple)
- Network partition
- Sensor poisoning
- Key compromise
- Battery death (simulated)

Run drills:
```bash
pnpm test:chaos
```

## Monitoring

Each relay exposes:
- Health check: `http://localhost:700{1,2,3}/health`
- NIP-11 info: `http://localhost:700{1,2,3}/`
- Prometheus metrics (if enabled): `http://localhost:700{1,2,3}/metrics`

## Offline Manual

See `OFFLINE_MANUAL.md` for operating without internet connectivity.