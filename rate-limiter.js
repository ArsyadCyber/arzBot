class RateLimiter {
    constructor() {
        this.commandUsage = new Map();
        this.lastMessageTimestamp = new Map();
        
        this.globalMessageCount = 0;
        this.globalMessageTimestamps = [];
        this.hourlyMessageCount = 0;
        this.hourlyMessageStartTime = Date.now();
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

module.exports = new RateLimiter();