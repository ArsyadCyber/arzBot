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

// Clean up orphaned processes
function cleanOrphanedProcesses() {
    try {
        // On Unix-like systems
        if (process.platform !== 'win32') {
            spawn('pkill', ['-f', 'node index.js']);
        }
    } catch (err) {
        log(`Failed to clean orphaned processes: ${err.message}`);
    }
}

// Function to start the bot with memory limits
function startBot() {
    log('Starting WhatsApp bot...');
    
    // Clean orphaned processes
    cleanOrphanedProcesses();
    
    // Update restart tracking
    restartCount++;
    lastRestartTime = Date.now();
    
    // Check if we're restarting too frequently
    if (isRestartingTooFrequently() && restartCount > MAX_RESTARTS) {
        log(`Too many restarts (${restartCount}). Waiting for 5 minutes before trying again.`);
        setTimeout(startBot, 300000); // Wait 5 minutes
        return;
    }
    
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
            NODE_OPTIONS: '--max-old-space-size=512'
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
    
    // Monitor memory usage
    let lastMemCheck = Date.now();
    const memCheckInterval = setInterval(() => {
        try {
            const memUsage = process.memoryUsage();
            const memUsageMB = Math.round(memUsage.rss / (1024 * 1024));
            
            // Log memory usage every hour
            const now = Date.now();
            if (now - lastMemCheck > 3600000) { // 1 hour
                log(`Memory usage: ${memUsageMB} MB`);
                lastMemCheck = now;
            }
            
            // If memory usage is too high, restart the bot
            if (memUsageMB > 450) { // Over 450MB
                log(`Memory usage too high (${memUsageMB} MB). Restarting bot...`);
                clearInterval(memCheckInterval);
                bot.kill('SIGTERM');
                setTimeout(startBot, 5000);
            }
        } catch (err) {
            log(`Error checking memory: ${err.message}`);
        }
    }, 60000); // Check every minute
    
    // Clean up interval on bot exit
    bot.on('exit', () => {
        clearInterval(memCheckInterval);
    });
}

// Start the bot
log('Wrapper script started');
startBot();