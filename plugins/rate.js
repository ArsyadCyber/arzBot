const rateLimiter = require('../rate-limiter.js');

module.exports = {
    name: 'rate',
    description: 'Melihat status rate limiting',
    category: 'Informasi',
    usage: '.rate',
    execute: async (arz, sender, args, m) => {
        try {
            const userId = m.key.participant || sender;
            
            const commandCooldown = rateLimiter.getCommandCooldown(userId);
            const messageCooldown = rateLimiter.getMessageCooldown(userId);
            
            const commandsUsed = 5 - (commandCooldown > 0 ? 5 : rateLimiter.commandUsage.get(userId)?.length || 0);
            const maxCommands = 5;
            
            const globalStatus = rateLimiter.getGlobalMessageRateStatus();
            
            const statusMessage = `*📊 Status Rate Limiting*\n\n` +
                `*👤 Pengguna:* ${userId.split('@')[0]}\n\n` +
                `*🔢 Perintah digunakan:* ${commandsUsed}/${maxCommands} per menit\n` +
                `*⏳ Cooldown perintah:* ${commandCooldown > 0 ? `${commandCooldown} detik` : 'Tidak ada'}\n\n` +
                `*💬 Cooldown pesan:* ${messageCooldown > 0 ? `${Math.ceil(messageCooldown/1000)} detik` : 'Tidak ada'}\n\n` +
                `*🌐 Global Limits:*\n` +
                `- Pesan per detik: ${globalStatus.currentPerSecond}/${globalStatus.maxPerSecond}\n` +
                `- Pesan per jam: ${globalStatus.currentPerHour}/${globalStatus.maxPerHour}\n` +
                `- Reset jam dalam: ${globalStatus.hourlyResetIn} menit\n\n` +
                `*ℹ️ Info:*\n` +
                `- Maksimal 5 perintah per menit per pengguna\n` +
                `- Interval 3 detik antar pesan per pengguna\n` +
                `- Maksimal 10 pesan per detik secara global\n` +
                `- Maksimal 100 pesan per jam secara global`;
            
            await arz.sendMessage(
                sender,
                { text: statusMessage },
                { quoted: m }
            );
            
        } catch (error) {
            console.error('Error dalam command rate:', error);
            await arz.sendMessage(
                sender,
                { text: '❌ Terjadi kesalahan saat mendapatkan informasi rate limiting.' },
                { quoted: m }
            );
        }
    }
};