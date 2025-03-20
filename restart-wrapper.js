const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure log directory exists
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
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

// Improved logging with rotating files
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    
    // Write to log file with limits
    const logFile = getLogFileName();
    limitLogSize(logFile);
    
    try {
        fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
    } catch (error) {
        console.error(`Failed to write to log: ${error.message}`);
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

// Function to start the bot with memory limits
function startBot() {
    log('Starting WhatsApp bot...');
    
    // Update restart tracking
    restartCount++;
    lastRestartTime = Date.now();
    
    // Check if we're restarting too frequently
    if (isRestartingTooFrequently() && restartCount > MAX_RESTARTS) {
        log(`Too many restarts (${restartCount}). Waiting for 5 minutes before trying again.`);
        setTimeout(startBot, 300000); // Wait 5 minutes
        return;
    }
    
    // Start with memory limits
    // Use --max-old-space-size to limit memory usage
    const bot = spawn('node', ['--max-old-space-size=512', 'index.js'], {
        stdio: 'inherit',
        detached: false,
        env: {
            ...process.env,
            NODE_OPTIONS: '--max-old-space-size=512' // Limit to 512MB
        }
    });
    
    // Handle exit event
    bot.on('exit', (code) => {
        log(`Bot exited with code ${code}`);
        
        if (code === 42) {
            // Code 42 is special restart code
            log('Restarting bot as requested...');
            setTimeout(startBot, 1000);
        } else if (code !== 0) {
            // Crash or error - wait longer before restarting
            log('Bot crashed. Restarting in 10 seconds...');
            setTimeout(startBot, 10000);
        }
    });
    
    // Handle error event
    bot.on('error', (err) => {
        log(`Bot process error: ${err.message}`);
        // Let the exit handler deal with restarting
    });
}

// Start the bot
log('Wrapper script started');
startBot();