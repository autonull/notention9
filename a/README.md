# Notention - The Decentralized Super App

Notention is a "Tool for Thought" that evolves into a **Universal Action Agent**. It starts as a private semantic notebook where you organize your ideas, and scales into an active operating system that can execute tasks, research information, and coordinate with the real world on your behalf.

It bridges the gap between **thinking** (Notes) and **doing** (Actions).

## Core Philosophy

1.  **Everything is a Note:** A project, a task, a product for sale, a job offer - all are just Notes.
2.  **Semantic Properties:** We use a simple syntax to make text machine-readable (`[role:is:Engineer]`, `[budget < 500]`).
3.  **From Thought to Action:** Your notes aren't just static text. They are instructions. The system understands your intent and executes it using its integrated Agent capabilities.

## Features

### 📝 Semantic Editor
Just type naturally. The editor automatically parses your intent.
-   **Properties:** `[key:op:value]` (e.g., `[status:is:Active]`)
-   **Logic:** `[budget < 500]`, `[deadline > 2025-01-01]`
-   **Tags:** `#project`, `#idea`

### ⚡️ Universal Action Agent
Notention doesn't just store your tasks; it helps complete them. Powered by the **VoltAgent** architecture and **MoltBot** skills, the system acts as a digital extension of yourself.
-   **Semantic Automation:** Write "Find 3-bedroom, 2-bath houses in Austin under $600k", and the agent will understand the criteria, search real estate platforms, and import the results as structured notes.
-   **Browser Automations:** The agent can navigate the web, fill forms, and interact with sites to execute complex workflows like booking tickets or applying for jobs.
-   **Real-Time Feedback:** Watch the agent work in real-time as it navigates, researches, and updates your workspace.

### 🧠 Active Knowledge
Your workspace gets smarter the more you use it.
-   **Memory & RAG:** The system indexes your notes and documents, allowing you to ask complex questions that require synthesizing information from across your entire knowledge base.
-   **Evolving Ontology:** The system learns from your usage, automatically inferring relationships and types to keep your knowledge organized without manual grooming.

### 🌐 P2P Coordination (Nostr)
Publish your intent to the censorship-resistant Nostr network to find matches outside your personal workspace.
-   **Publish:** Turn a private request note into a public offer or job posting with one click.
-   **Match:** Connect with peers offering exactly what you need, based on semantic compatibility, not keyword spam.

## Getting Started

1.  **Write:** Create a note. Type `[task:is:Research]` query: `best hiking boots 2026`.
2.  **Act:** Watch the Agent pick up the task, browse the web, and populate your note with a comparison table of top-rated boots.
3.  **Refine:** Add constraints like `[price < 200]` and ask the agent to filter the results.
4.  **Connect:** Publish your final choice to the network to find local sellers or groups.

## Tech Stack
-   **Frontend:** React, Vite, TailwindCSS
-   **Agent Core:** VoltAgent SDK, Playwright (Browser Automation)
-   **Network:** Nostr (`nostr-tools`)
-   **Storage:** LocalForage & LibSQL
-   **AI:** OpenAI / custom LLM integrations

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for a deep dive into the matching logic, parser details, and agent protocols.
