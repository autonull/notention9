import chalk from 'chalk';
import ora from 'ora';

export const log = {
    info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
    success: (msg: string) => console.log(chalk.green('✔'), msg),
    warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
    error: (msg: string, err?: unknown) => {
        console.error(chalk.red('✖'), msg);
        if (err) console.error(chalk.dim(err instanceof Error ? err.message : String(err)));
    },
    chat: (role: string, msg: string) => {
        const color = role === 'Agent' ? chalk.blue : chalk.green;
        console.log(`${color.bold(role)}: ${msg}`);
    }
};

export const withSpinner = async <T>(text: string, action: () => Promise<T>): Promise<T> => {
    const spinner = ora(text).start();
    try {
        const result = await action();
        spinner.succeed();
        return result;
    } catch (e) {
        spinner.fail();
        throw e;
    }
};
