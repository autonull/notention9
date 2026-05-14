import chalk from 'chalk';

/**
 * System commands - exit, quit, help
 */

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
