# @notention/cli

The Agentic Text UI for Notention. This CLI allows you to interact with your knowledge graph, execute skills, and run simulations using natural language.

## Features

- **Agentic Interaction**: Chat with an AI agent that can manage your notes, run simulations, and execute tools.
- **Auto-Server Mode**: Automatically starts an embedded Agent Server if one is not running locally.
- **Context Awareness**: Focus on specific notes using `/open` and `/close` for seamless interaction.
- **Persistent History**: Command history is saved across sessions (`~/.notention_cli_history`).
- **Tab Autocomplete**: Easily discover slash commands.
- **Rich Output**: Markdown rendering and colorful logs.

## Installation

```bash
npm install -g @notention/cli
```

## Usage

Start the CLI:

```bash
notention
```

### Commands

- `/help`: Show available commands.
- `/status`: View current system status (provider, model, server).
- `/open <id>`: Open a note as the active context.
- `/close`: Clear the active context.
- `/extract <text>`: Extract semantic properties from text.
- `/run <scenario_id>`: Run a specific simulation scenario.
- `/security scan`: Scan notes for secrets.
- `/provider <name>`: Switch LLM provider (e.g., `ollama`, `openai`).
- `/clear`: Clear the screen.

### Configuration

The CLI supports multiple LLM providers. By default, it tries to use `ollama`.

To configure via environment variables:

```bash
export LLM_PROVIDER=openai
export LLM_API_KEY=your-api-key
export LLM_MODEL=gpt-4o
notention
```

Or interactively inside the CLI:

```
/provider openai
```

### Development

Run from source:

```bash
npm start
```

Run with verbose logging:

```bash
npm start -- --verbose
```
