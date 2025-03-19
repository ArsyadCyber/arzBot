const fs = require('fs');
const path = require('path');

class RateLimiter {
    constructor() {
        this.dbPath = path.join(__dirname, 'db', 'rate.json');
        this.ensureDbExists();
        
        const data = this.loadData();
        this.commandUsage = new Map(Object.entries(data.commandUsage || {}));
        this.lastMessageTimestamp = new Map(Object.entries(data.lastMessageTimestamp || {}));
        
        this.globalMessageTimestamps = data.globalMessageTimestamps || [];
        this.hourlyMessageCount = data.hourlyMessageCount || 0;
        this.hourlyMessageStartTime = data.hourlyMessageStartTime || Date.now();
        
        // Clean up old data on startup
        this.cleanOldData();
        
        // Setup periodic saving
        this.saveInterval = setInterval(() => this.saveData(), 60000); // Save every minute
    }
    
    ensureDbExists() {
        const dbDir = path.join(__dirname, 'db');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        if (!fs.existsSync(this.dbPath)) {
            this.saveData({
                commandUsage: {},
                lastMessageTimestamp: {},
                globalMessageTimestamps: [],
                hourlyMessageCount: 0,
                hourlyMessageStartTime: Date.now()
            });
        }
    }
    
    loadData() {
        try {
            const data = fs.readFileSync(this.dbPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading rate limiter data:', error);
            return {
                commandUsage: {},
                lastMessageTimestamp: {},
                globalMessageTimestamps: [],
                hourlyMessageCount: 0,
                hourlyMessageStartTime: Date.now()
            };
        }
    }
    
    saveData(customData = null) {
        try {
            const data = customData || {
                commandUsage: Object.fromEntries(this.commandUsage),
                lastMessageTimestamp: Object.fromEntries(this.lastMessageTimestamp),
                globalMessageTimestamps: this.globalMessageTimestamps,
                hourlyMessageCount: this.hourlyMessageCount,
                hourlyMessageStartTime: this.hourlyMessageStartTime
            };
            
            fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            console.error('Error saving rate limiter data:', error);
        }
    }
    
    cleanOldData() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // Clean up command usage data
        for (const [userId, timestamps] of this.commandUsage.entries()) {
            const recentCommands = timestamps.filter(timestamp => timestamp > oneMinuteAgo);
            if (recentCommands.length === 0) {
                this.commandUsage.delete(userId);
            } else {
                this.commandUsage.set(userId, recentCommands);
            }
        }
        
        // Clean up old message timestamps
        const oneHourAgo = now - 3600000;
        for (const [userId, timestamp] of this.lastMessageTimestamp.entries()) {
            if (timestamp < oneHourAgo) {
                this.lastMessageTimestamp.delete(userId);
            }
        }
        
        // Clean up global message timestamps
        this.globalMessageTimestamps = this.globalMessageTimestamps.filter(
            timestamp => timestamp > oneMinuteAgo
        );
        
        // Reset hourly counter if needed
        if (now - this.hourlyMessageStartTime >= 3600000) {
            this.resetHourlyCount();
        }
        
        // Save cleaned data
        this.saveData();
    }

    canExecuteCommand(userId) {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        if (!this.commandUsage.has(userId)) {
            this.commandUsage.set(userId, []);
        }
        
        const userCommands = this.commandUsage.get(userId);
        
        const recentCommands = userCommands.filter(timestamp => timestamp > oneMinuteAgo);
        this.commandUsage.set(userId, recentCommands);
        
        if (recentCommands.length >= 5) {
            return false;
        }
        
        recentCommands.push(now);
        this.commandUsage.set(userId, recentCommands);
        
        return true;
    }

    canSendMessage(userId) {
        const now = Date.now();
        
        if (!this.canSendGlobalMessage()) {
            return false;
        }
        
        const lastTimestamp = this.lastMessageTimestamp.get(userId) || 0;
        const elapsedTime = now - lastTimestamp;
        
        if (elapsedTime < 3000) {
            return false;
        }
        
        this.lastMessageTimestamp.set(userId, now);
        this.trackGlobalMessage();
        
        return true;
    }
    
    canSendGlobalMessage() {
        const now = Date.now();
        
        if (this.hourlyMessageCount >= 100) {
            const hourElapsed = now - this.hourlyMessageStartTime;
            if (hourElapsed < 3600000) {
                return false;
            }
            this.resetHourlyCount();
        }
        
        const oneSecondAgo = now - 1000;
        this.globalMessageTimestamps = this.globalMessageTimestamps.filter(
            timestamp => timestamp > oneSecondAgo
        );
        
        return this.globalMessageTimestamps.length < 10;
    }
    
    trackGlobalMessage() {
        const now = Date.now();
        this.globalMessageTimestamps.push(now);
        this.hourlyMessageCount++;
    }
    
    resetHourlyCount() {
        this.hourlyMessageCount = 0;
        this.hourlyMessageStartTime = Date.now();
    }
    
    getMessageCooldown(userId) {
        const now = Date.now();
        const lastTimestamp = this.lastMessageTimestamp.get(userId) || 0;
        const elapsedTime = now - lastTimestamp;
        
        if (elapsedTime >= 3000) {
            return 0;
        }
        
        return 3000 - elapsedTime;
    }
    
    getCommandCooldown(userId) {
        if (!this.commandUsage.has(userId)) {
            return 0;
        }
        
        const now = Date.now();
        const userCommands = this.commandUsage.get(userId);
        
        const recentCommands = userCommands.filter(timestamp => timestamp > now - 60000);
        
        if (recentCommands.length < 5) {
            return 0;
        }
        
        const oldestCommand = Math.min(...recentCommands);
        const expiryTime = oldestCommand + 60000;
        const waitTime = Math.ceil((expiryTime - now) / 1000);
        
        return waitTime;
    }
    
    getGlobalMessageRateStatus() {
        const now = Date.now();
        const oneSecondAgo = now - 1000;
        
        const recentMessages = this.globalMessageTimestamps.filter(
            timestamp => timestamp > oneSecondAgo
        );
        
        return {
            currentPerSecond: recentMessages.length,
            maxPerSecond: 10,
            currentPerHour: this.hourlyMessageCount,
            maxPerHour: 100,
            hourlyResetIn: Math.ceil((this.hourlyMessageStartTime + 3600000 - now) / 1000 / 60)
        };
    }
}

// Create and export a single instance
const rateLimiter = new RateLimiter();

// Cleanup on exit
process.on('exit', () => {
    if (rateLimiter.saveInterval) {
        clearInterval(rateLimiter.saveInterval);
    }
    rateLimiter.saveData();
});

// Handle unexpected shutdowns
process.on('SIGINT', () => {
    rateLimiter.saveData();
    process.exit(0);
});

process.on('SIGTERM', () => {
    rateLimiter.saveData();
    process.exit(0);
});

module.exports = rateLimiter;