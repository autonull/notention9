const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
    reset: "\x1b[0m",
    blue: "\x1b[34m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m"
};

function log(prefix, data, color) {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
        if (line.trim()) {
            console.log(`${color}[${prefix}]${colors.reset} ${line}`);
        }
    });
}

function runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, {
            cwd,
            shell: true,
            stdio: 'inherit'
        });

        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command ${command} ${args.join(' ')} failed with code ${code}`));
        });
    });
}

async function start() {
    console.log(`${colors.cyan}Starting Notention System...${colors.reset}`);
    // 2. Start Servers

    console.log(`${colors.cyan}Starting Agent and UI...${colors.reset}`);

    const agent = spawn('npm', ['run', 'dev', '-w', '@notention/agent'], {
        cwd: process.cwd(),
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    const ui = spawn('npm', ['run', 'dev', '-w', '@notention/ui'], {
        cwd: process.cwd(),
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    // Pipe outputs
    agent.stdout.on('data', data => log('AGENT', data, colors.blue));
    agent.stderr.on('data', data => log('AGENT', data, colors.red));

    ui.stdout.on('data', data => log('UI', data, colors.green));
    ui.stderr.on('data', data => log('UI', data, colors.red));

    // Handle process termination
    const cleanup = () => {
        console.log(`\n${colors.cyan}Shutting down services...${colors.reset}`);

        // On Windows, tree-kill might be needed, but for Linux handling SIGINT on parent should be enough 
        // if we didn't detach. However, with shell:true we might need to be careful.
        // But basic kill should propagate if we are lucky or we just take down the group.
        // Actually, spawn with shell:true creates a new shell. 
        // The robust way is to use tree-kill or negative PID for process group.

        try {
            process.kill(-agent.pid, 'SIGTERM');
        } catch (e) {
            // fallback if group kill fails, try direct kill
            agent.kill();
        }

        try {
            process.kill(-ui.pid, 'SIGTERM');
        } catch (e) {
            ui.kill();
        }

        process.exit(0);
    };

    // Prepare for group kill by setting pgid? 
    // Actually, simple spawn in node usually keeps them in same group unless detached.
    // simpler cleanup:

    const simpleCleanup = () => {
        console.log(`\n${colors.yellow}Stopping servers...${colors.reset}`);
        if (!agent.killed) agent.kill();
        if (!ui.killed) ui.kill();
        process.exit();
    };

    process.on('SIGINT', simpleCleanup);
    process.on('SIGTERM', simpleCleanup);
    process.on('exit', simpleCleanup);

    // If one fails, kill the other?
    agent.on('close', (code) => {
        console.log(`${colors.red}Agent exited with code ${code}${colors.reset}`);
        simpleCleanup();
    });

    ui.on('close', (code) => {
        console.log(`${colors.red}UI exited with code ${code}${colors.reset}`);
        simpleCleanup();
    });
}

start();
