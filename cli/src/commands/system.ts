import chalk from 'chalk';
import boxen from 'boxen';

/**
 * System commands - exit, quit, help, status
 */

export const handleStatus = async (session: any, mcpUrl: string, enableSim: boolean): Promise<boolean> => {
    const conf = session.getConfig();
    const statusText = `
${chalk.bold('Provider:')}    ${chalk.blue(conf.provider)}
${chalk.bold('Model:')}       ${chalk.green(conf.model)}
${chalk.bold('Server URL:')}  ${chalk.cyan(mcpUrl)}
${chalk.bold('Simulation:')}  ${enableSim ? chalk.green('Enabled') : chalk.gray('Disabled')}
${chalk.bold('Context:')}     ${session.getActiveContext() ? chalk.yellow(session.getActiveContext().title) : chalk.gray('None')}
    `.trim();

    console.log('\n' + boxen(statusText, {
        padding: 1,
        margin: 0,
        borderStyle: 'round',
        borderColor: 'blue',
        title: chalk.bold('System Status'),
        titleAlignment: 'center'
    }));
    return true;
};

export const handleExit = async (): Promise<boolean> => {
    console.warn("Goodbye.");
    process.exit(0);
};

export const handleHelp = async (): Promise<boolean> => {
    console.log(chalk.gray(`
Commands:
  ${chalk.white('/help')}                  - Show this help
  ${chalk.white('/status')}                - Show current system status
  ${chalk.white('/config')}                - View current LLM configuration
  ${chalk.white('/providers')}             - List available LLM providers
  ${chalk.white('/provider <name>')}       - Switch to a different provider
  ${chalk.white('/tools')}                 - List available MCP tools
  ${chalk.white('/setup')}                 - Run the configuration wizard
  ${chalk.white('/save [path]')}           - Save chat history to file
  ${chalk.white('/load [path]')}           - Load chat history from file
  ${chalk.white('/security scan')}         - Scan notes for exposed secrets
  ${chalk.white('/extract <text>')}        - Extract semantic properties
  ${chalk.white('/open <id>')}             - Set active context to a note
  ${chalk.white('/close')}                 - Clear active context
  ${chalk.white('/clear')}                 - Clear the screen and history
  ${chalk.white('/quit')}                  - Exit the CLI
            `));
    return true;
};
