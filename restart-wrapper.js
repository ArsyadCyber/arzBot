const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Install chalk if not already installed
try {
    require.resolve('chalk');
} catch (e) {
    console.log('Installing chalk package for colorful logging...');
    require('child_process').execSync('npm install chalk@4.1.2');
    console.log('Chalk installed successfully!');
}

const chalk = require('chalk');

// Ensure log directory exists
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Simple inline logger (no external file dependency)
const logger = {
    info: (message) => {
        const timestamp = formatTimestamp();
        console.log(`${timestamp} ${chalk.blue('ℹ')} ${chalk.blue('[INFO]')} ${message}`);
        writeToLogFile('INFO', message);
    },
    success: (message) => {
        const timestamp = formatTimestamp();
        console.log(`${timestamp} ${chalk.green('✓')} ${chalk.green('[SUCCESS]')} ${message}`);
        writeToLogFile('SUCCESS', message);
    },
    warn: (message) => {
        const timestamp = formatTimestamp();
        console.log(`${timestamp} ${chalk.yellow('⚠')} ${chalk.yellow('[WARNING]')} ${message}`);
        writeToLogFile('WARNING', message);
    },
    error: (message) => {
        const timestamp = formatTimestamp();
        console.log(`${timestamp} ${chalk.red('✗')} ${chalk.red('[ERROR]')} ${message}`);
        writeToLogFile('ERROR', message);
    },
    system: (message) => {
        const timestamp = formatTimestamp();
        console.log(`${timestamp} ${chalk.magenta('⚙')} ${chalk.magenta('[SYSTEM]')} ${message}`);
        writeToLogFile('SYSTEM', message);
    },
    connection: (message) => {
        const timestamp = formatTimestamp();
        console.log(`${timestamp} ${chalk.blueBright('⟳')} ${chalk.blueBright('[CONNECTION]')} ${message}`);
        writeToLogFile('CONNECTION', message);
    },
    startupBanner: () => {
        console.log('\n' + chalk.cyan('┌──────────────────────────────────────────────────┐'));
        console.log(chalk.cyan('│') + chalk.bold.green('                WhatsApp Bot Started                ') + chalk.cyan('│'));
        console.log(chalk.cyan('│') + chalk.yellow('             ' + new Date().toLocaleString() + '             ') + chalk.cyan('│'));
        console.log(chalk.cyan('└──────────────────────────────────────────────────┘') + '\n');
    }
};

// Format the timestamp
function formatTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return chalk.gray(`[${hours}:${minutes}:${seconds}.${milliseconds}]`);
}

// Write to log file
function writeToLogFile(level, message) {
    const logFile = getLogFileName();
    limitLogSize(logFile);
    
    try {
        const isoTimestamp = new Date().toISOString();
        fs.appendFileSync(logFile, `[${isoTimestamp}] [${level}] ${message}\n`);
    } catch (error) {
        console.error(`Failed to write to log: ${error.message}`);
    }
}

// Get log file name with date
function getLogFileName() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(logDir, `bot-log-${date}.txt`);
}

// Limit log file size
function limitLogSize(filePath, maxSize = 10 * 1024 * 1024) { // 10MB max
    try {
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.size > maxSize) {
                // Backup old log and start new one
                const backupPath = `${filePath}.old`;
                if (fs.existsSync(backupPath)) {
                    fs.unlinkSync(backupPath);
                }
                fs.renameSync(filePath, backupPath);
            }
        }
    } catch (error) {
        console.error(`Error managing log file: ${error.message}`);
    }
}

// Track restart attempts
let restartCount = 0;
const MAX_RESTARTS = 10;
let lastRestartTime = Date.now();

// Function to check if we're restarting too frequently
function isRestartingTooFrequently() {
    const now = Date.now();
    const timeSinceLastRestart = now - lastRestartTime;
    
    // If we've restarted more than 5 times in the last 5 minutes, it's too frequent
    if (restartCount > 5 && timeSinceLastRestart < 300000) {
        return true;
    }
    
    // Reset counter if it's been more than 10 minutes since last restart
    if (timeSinceLastRestart > 600000) {
        restartCount = 0;
    }
    
    return false;
}

// Clean up orphaned processes
function cleanOrphanedProcesses() {
    try {
        // On Unix-like systems
        if (process.platform !== 'win32') {
            spawn('pkill', ['-f', 'node index.js']);
        }
    } catch (err) {
        logger.error(`Failed to clean orphaned processes: ${err.message}`);
    }
}

// Function to format memory usage
function formatMemoryUsage(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Function to start the bot with memory limits
function startBot() {
    logger.startupBanner();
    logger.system('Starting WhatsApp bot process...');
    
    // Clean orphaned processes
    cleanOrphanedProcesses();
    
    // Update restart tracking
    restartCount++;
    lastRestartTime = Date.now();
    
    // Check if we're restarting too frequently
    if (isRestartingTooFrequently() && restartCount > MAX_RESTARTS) {
        logger.warn(`Too many restarts (${restartCount}). Waiting for 5 minutes before trying again.`);
        setTimeout(startBot, 300000); // Wait 5 minutes
        return;
    }
    
    // Create logger.js file for the main bot process to use
    createLoggerFile();
    
    // Start with memory limits and garbage collection enabled
    const bot = spawn('node', [
        // Enable garbage collection
        '--expose-gc',
        // More aggressive memory management
        '--optimize-for-size',
        '--max-old-space-size=512',
        // Optimize V8 memory
        '--optimize_for_size',
        '--gc_interval=100',
        // Start the main process
        'index.js'
    ], {
        stdio: 'inherit',
        detached: false,
        env: {
            ...process.env,
            NODE_OPTIONS: '--max-old-space-size=512',
            FORCE_COLOR: '1'  // Force colored output in subprocesses
        }
    });
    
    // Handle exit event
    bot.on('exit', (code) => {
        if (code === 0) {
            logger.success(`Bot exited gracefully with code ${code}`);
        } else if (code === 42) {
            // Code 42 is special restart code
            logger.system('Restarting bot as requested...');
            setTimeout(startBot, 1000);
        } else {
            // Crash or error - wait longer before restarting
            logger.error(`Bot crashed with code ${code}. Restarting in 10 seconds...`);
            setTimeout(startBot, 10000);
        }
    });
    
    // Handle error event
    bot.on('error', (err) => {
        logger.error(`Bot process error: ${err.message}`);
        // Let the exit handler deal with restarting
    });
    
    // Monitor memory usage
    let lastMemCheck = Date.now();
    const memCheckInterval = setInterval(() => {
        try {
            const memUsage = process.memoryUsage();
            const memUsageMB = Math.round(memUsage.rss / (1024 * 1024));
            
            // Log memory usage every hour
            const now = Date.now();
            if (now - lastMemCheck > 3600000) { // 1 hour
                logger.system(`Memory usage stats:
                    - RSS: ${formatMemoryUsage(memUsage.rss)}
                    - Heap Total: ${formatMemoryUsage(memUsage.heapTotal)}
                    - Heap Used: ${formatMemoryUsage(memUsage.heapUsed)}
                    - External: ${formatMemoryUsage(memUsage.external)}`);
                lastMemCheck = now;
            }
            
            // If memory usage is too high, restart the bot
            if (memUsageMB > 450) { // Over 450MB
                logger.warn(`Memory usage too high (${memUsageMB} MB). Restarting bot...`);
                clearInterval(memCheckInterval);
                bot.kill('SIGTERM');
                setTimeout(startBot, 5000);
            }
        } catch (err) {
            logger.error(`Error checking memory: ${err.message}`);
        }
    }, 60000); // Check every minute
    
    // Clean up interval on bot exit
    bot.on('exit', () => {
        clearInterval(memCheckInterval);
    });
}

// Create the logger.js file for the main bot process
function createLoggerFile() {
    const loggerContent = `
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const util = require('util');

// Ensure log directory exists
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Configure log levels with colors and icons
const LOG_LEVELS = {
    INFO: { 
        color: chalk.blue, 
        icon: chalk.blue('ℹ'),
        label: 'INFO'
    },
    SUCCESS: { 
        color: chalk.green, 
        icon: chalk.green('✓'),
        label: 'SUCCESS'
    },
    WARNING: { 
        color: chalk.yellow, 
        icon: chalk.yellow('⚠'),
        label: 'WARNING'
    },
    ERROR: { 
        color: chalk.red, 
        icon: chalk.red('✗'),
        label: 'ERROR'
    },
    SYSTEM: { 
        color: chalk.magenta, 
        icon: chalk.magenta('⚙'),
        label: 'SYSTEM'
    },
    MESSAGE: { 
        color: chalk.cyan, 
        icon: chalk.cyan('✉'),
        label: 'MESSAGE'
    },
    COMMAND: { 
        color: chalk.green.bold, 
        icon: chalk.green.bold('⌘'),
        label: 'COMMAND'
    },
    CONNECTION: { 
        color: chalk.blueBright, 
        icon: chalk.blueBright('⟳'),
        label: 'CONNECTION'
    },
    DEBUG: { 
        color: chalk.gray, 
        icon: chalk.gray('🔍'),
        label: 'DEBUG'
    }
};

// Get log file name with date
function getLogFileName() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(logDir, \`bot-log-\${date}.txt\`);
}

// Limit log file size
function limitLogSize(filePath, maxSize = 10 * 1024 * 1024) { // 10MB max
    try {
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.size > maxSize) {
                // Backup old log and start new one
                const backupPath = \`\${filePath}.old\`;
                if (fs.existsSync(backupPath)) {
                    fs.unlinkSync(backupPath);
                }
                fs.renameSync(filePath, backupPath);
            }
        }
    } catch (error) {
        console.error(\`Error managing log file: \${error.message}\`);
    }
}

// Format the timestamp
function formatTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return chalk.gray(\`[\${hours}:\${minutes}:\${seconds}.\${milliseconds}]\`);
}

// The main logger function
function log(level, message, ...args) {
    const logLevel = LOG_LEVELS[level] || LOG_LEVELS.INFO;
    const timestamp = formatTimestamp();
    const formattedLevel = logLevel.color(\`[\${logLevel.label}]\`);
    const icon = logLevel.icon;
    
    // Format any additional arguments
    let formattedArgs = '';
    if (args.length > 0) {
        formattedArgs = ' ' + args.map(arg => {
            if (typeof arg === 'object') {
                return util.inspect(arg, { colors: true, depth: null });
            }
            return arg;
        }).join(' ');
    }
    
    // Format for console with colors
    const consoleMessage = \`\${timestamp} \${icon} \${formattedLevel} \${logLevel.color(message)}\${formattedArgs}\`;
    console.log(consoleMessage);
    
    // Format for log file (without colors)
    const isoTimestamp = new Date().toISOString();
    const fileMessage = \`[\${isoTimestamp}] [\${logLevel.label}] \${message}\${args.length > 0 ? ' ' + util.inspect(args, { depth: null }) : ''}\`;
    
    // Write to log file with limits
    const logFile = getLogFileName();
    limitLogSize(logFile);
    
    try {
        fs.appendFileSync(logFile, \`\${fileMessage}\\n\`);
    } catch (error) {
        console.error(\`Failed to write to log: \${error.message}\`);
    }
}

// Create convenience methods for each log level
const logger = {
    info: (message, ...args) => log('INFO', message, ...args),
    success: (message, ...args) => log('SUCCESS', message, ...args),
    warn: (message, ...args) => log('WARNING', message, ...args),
    error: (message, ...args) => log('ERROR', message, ...args),
    system: (message, ...args) => log('SYSTEM', message, ...args),
    message: (message, ...args) => log('MESSAGE', message, ...args),
    command: (message, ...args) => log('COMMAND', message, ...args),
    connection: (message, ...args) => log('CONNECTION', message, ...args),
    debug: (message, ...args) => log('DEBUG', message, ...args),
    
    // Helper for pretty starting banner
    startupBanner: () => {
        console.log('\\n' + chalk.cyan('┌──────────────────────────────────────────────────┐'));
        console.log(chalk.cyan('│') + chalk.bold.green('                WhatsApp Bot Started                ') + chalk.cyan('│'));
        console.log(chalk.cyan('│') + chalk.yellow('             ' + new Date().toLocaleString() + '             ') + chalk.cyan('│'));
        console.log(chalk.cyan('└──────────────────────────────────────────────────┘') + '\\n');
    }
};

module.exports = logger;
`;

    try {
        fs.writeFileSync(path.join(__dirname, 'logger.js'), loggerContent);
        logger.success('Created logger.js file for the main bot process');
    } catch (err) {
        logger.error(`Failed to create logger.js: ${err.message}`);
    }
}

// Start the bot
logger.info('Wrapper script started');
startBot();