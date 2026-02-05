import { CliClient } from './client.js';

export async function handleSlashCommand(input: string, cli: CliClient, tools: any[]): Promise<boolean> {
    const [cmd, ...args] = input.split(' ');
    switch (cmd) {
        case '/exit':
        case '/quit':
            console.log("Goodbye.");
            await cli.close();
            process.exit(0);
            return true;
        case '/clear':
            console.clear();
            return true;
        case '/tools':
            console.log("Tools:", tools.map(t => t.name).join(", "));
            return true;
        case '/scenarios':
            try {
                const result = await cli.callTool('list_scenarios', {});
                const content = (result as any).content;
                const scenarios = JSON.parse((content[0] as any).text);
                console.log("Scenarios:");
                scenarios.forEach((s: any) => console.log(` - ${s.id}: ${s.name}`));
            } catch (e: unknown) {
                console.error("Failed to list scenarios:", e instanceof Error ? e.message : String(e));
            }
            return true;
        case '/run':
            if (args.length === 0) {
                console.log("Usage: /run <scenario_id>");
            } else {
                const id = args[0];
                console.log(`Running scenario '${id}'...`);
                try {
                    const result = await cli.callTool('run_scenario', { id });
                    const content = (result as any).content;
                    const runResult = JSON.parse((content[0] as any).text);
                    console.log(`Success: ${runResult.success}`);
                    runResult.steps.forEach((step: any) => {
                        const icon = step.success ? '✅' : '❌';
                        console.log(` ${icon} ${step.name} ${step.error ? `(${step.error})` : ''}`);
                    });
                } catch (e: unknown) {
                    console.error("Failed to run scenario:", e instanceof Error ? e.message : String(e));
                }
            }
            return true;
        case '/help':
            console.log(`
Commands:
  /help    - Show this help
  /tools   - List available MCP tools
  /scenarios - List available test scenarios
  /run <id>  - Run a specific scenario
  /clear   - Clear the screen
  /quit    - Exit the CLI
            `);
            return true;
        default:
            console.log("Unknown command. Type /help.");
            return true;
    }
}
