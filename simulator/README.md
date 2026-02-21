
# Notention Simulator

The Notention Simulator creates a multi-agent environment to test interaction metaphors, matching logic, and emergent behavior in a decentralized social network context.

## 🎬 Movie Studio UI

The simulator now includes a web-based **Movie Studio** for easy scenario management and visualization.

### Getting Started

1.  **Build the Simulator & UI**
    ```bash
    npm run build -w simulator
    ```

2.  **Start the Movie UI Server**
    ```bash
    npm start -w simulator -- --ui-server
    ```
    This will launch the web interface at `http://localhost:3000`.

### Features

*   **Studio:** Configure and launch simulations. Choose from pre-defined scenarios (like 'Gig Economy') or generate random agent interactions with custom parameters.
*   **Live Preview:** Watch the simulation unfold in real-time. The interface embeds the multi-agent dashboard, showing agent screens and system logs side-by-side.
*   **Movie Library:** Automatically record simulations as MP4 videos. Preview, download, and manage your recordings directly from the browser.

### CLI Usage (Legacy)

You can still run simulations via the command line:

```bash
# Run a specific scenario
npm start -w simulator -- --scenario=gig-economy

# Run in Movie Mode (headless recording)
npm start -w simulator -- --movie --scenario=gig-economy

# Generate a random scenario
npm start -w simulator -- --generate=10 --duration=60
```
