
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

// Format the timestamp
function formatTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return chalk.gray(`[${hours}:${minutes}:${seconds}.${milliseconds}]`);
}

// The main logger function
function log(level, message, ...args) {
    const logLevel = LOG_LEVELS[level] || LOG_LEVELS.INFO;
    const timestamp = formatTimestamp();
    const formattedLevel = logLevel.color(`[${logLevel.label}]`);
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
    const consoleMessage = `${timestamp} ${icon} ${formattedLevel} ${logLevel.color(message)}${formattedArgs}`;
    console.log(consoleMessage);
    
    // Format for log file (without colors)
    const isoTimestamp = new Date().toISOString();
    const fileMessage = `[${isoTimestamp}] [${logLevel.label}] ${message}${args.length > 0 ? ' ' + util.inspect(args, { depth: null }) : ''}`;
    
    // Write to log file with limits
    const logFile = getLogFileName();
    limitLogSize(logFile);
    
    try {
        fs.appendFileSync(logFile, `${fileMessage}\n`);
    } catch (error) {
        console.error(`Failed to write to log: ${error.message}`);
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
        console.log('\n' + chalk.cyan('┌──────────────────────────────────────────────────┐'));
        console.log(chalk.cyan('│') + chalk.bold.green('                WhatsApp Bot Started                ') + chalk.cyan('│'));
        console.log(chalk.cyan('│') + chalk.yellow('             ' + new Date().toLocaleString() + '             ') + chalk.cyan('│'));
        console.log(chalk.cyan('└──────────────────────────────────────────────────┘') + '\n');
    }
};

module.exports = logger;
