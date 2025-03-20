const os = require('os');
// Store start time
const startTime = new Date();

// Cached system info with refresh interval
let cachedSystemInfo = null;
let lastInfoUpdate = 0;

// Function to get formatted system info
function getSystemInfo() {
    const now = Date.now();
    // Only update every 60 seconds to reduce overhead
    if (!cachedSystemInfo || now - lastInfoUpdate > 60000) {
        cachedSystemInfo = {
            platform: os.platform(),
            version: os.version(),
            memory: `${Math.round(os.freemem() / (1024 * 1024))}MB / ${Math.round(os.totalmem() / (1024 * 1024))}MB`,
            uptime: getUptime(startTime)
        };
        lastInfoUpdate = now;
    } else {
        // Just update the uptime
        cachedSystemInfo.uptime = getUptime(startTime);
    }
    return cachedSystemInfo;
}

// Uptime calculation
function getUptime(startTime) {
    const diff = Date.now() - startTime;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    let uptimeString = '';
    if (days > 0) uptimeString += `${days} hari `;
    if (hours > 0) uptimeString += `${hours} jam `;
    if (minutes > 0) uptimeString += `${minutes} menit `;
    if (seconds > 0) uptimeString += `${seconds} detik`;

    return uptimeString.trim();
}

module.exports = {
    name: 'about',
    description: 'Menampilkan informasi tentang bot dan waktu berjalannya',
    category: 'Informasi',
    execute: async (arz, sender, args, m) => {
        try {
            // Get system info (cached)
            const info = getSystemInfo();
            
            // Create the message
            const aboutMessage = `*📱 INFO BOT*\n\n` +
                `*🕒 Bot Uptime:* ${info.uptime}\n` +
                `*💻 Platform:* ${info.platform}\n` +
                `*🔧 Version:* ${info.version}\n` +
                `*💾 Memory:* ${info.memory}\n\n` +
                `*🤖 Dibuat dengan Baileys WhatsApp API*\n` +
                `*👨‍💻 Gunakan perintah .ping untuk mengecek bot aktif*`;

            // Send message
            await arz.sendMessage(
                sender, 
                { text: aboutMessage },
                { quoted: m }
            );

        } catch (error) {
            console.error('Error dalam command about:', error);
            await arz.sendMessage(
                sender, 
                { text: '❌ Terjadi kesalahan saat mendapatkan informasi bot.' },
                { quoted: m }
            );
        }
    }
};