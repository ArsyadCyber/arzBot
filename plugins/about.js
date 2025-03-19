const os = require('os');
// Variabel untuk menyimpan waktu start bot
const startTime = new Date();

module.exports = {
    name: 'about',
    description: 'Menampilkan informasi tentang bot dan waktu berjalannya',
    category: 'Informasi',
    execute: async (arz, sender, args, m) => { // Tambahkan parameter args dan m
        try {
            // Hitung uptime
            const uptime = getUptime(startTime);
            // Ambil informasi sistem
            const platform = os.platform();
            const version = os.version();
            const memory = Math.round(os.freemem() / (1024 * 1024)) + 'MB / ' + 
                           Math.round(os.totalmem() / (1024 * 1024)) + 'MB';
            // Buat pesan informasi bot
            const aboutMessage = `*📱 INFO BOT*\n\n` +
                `*🕒 Bot Uptime:* ${uptime}\n` +
                `*💻 Platform:* ${platform}\n` +
                `*🔧 Version:* ${version}\n` +
                `*💾 Memory:* ${memory}\n\n` +
                `*🤖 Dibuat dengan Baileys WhatsApp API*\n` +
                `*👨‍💻 Gunakan perintah .ping untuk mengecek bot aktif*`;

            // Tambahkan quoted message
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
                { quoted: m } // Tambahkan quoted message untuk error juga
            );
        }
    }
};

// Fungsi untuk menghitung uptime
function getUptime(startTime) {
    const currentTime = new Date();
    const diff = currentTime - startTime;
    // Konversi milliseconds ke format yang lebih mudah dibaca
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