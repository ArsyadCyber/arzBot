const { exec } = require('child_process');
const config = require('../config.js');

module.exports = {
    name: 'restart',
    description: 'Melakukan restart bot WhatsApp',
    category: 'Owner', 
    ownerOnly: true, // Command ini hanya bisa digunakan oleh owner
    execute: async (arz, sender, args, m) => { // Tambahkan parameter m
        // Cek apakah yang mengirim pesan adalah owner
        if (sender !== config.ownerNumber) {
            return await arz.sendMessage(
                sender, 
                { text: '❌ Maaf, perintah ini hanya dapat digunakan oleh owner bot.' },
                { quoted: m } // Tambahkan quoted message
            );
        }

        try {
            // Kirim pesan bahwa bot akan di-restart
            await arz.sendMessage(
                sender, 
                { text: '🔄 Bot sedang melakukan restart...\nMohon tunggu sebentar.' },
                { quoted: m } // Tambahkan quoted message
            );

            console.log('⚠️ Bot restart dimulai oleh owner');

            // Tunggu sebentar agar pesan terkirim
            setTimeout(() => {
                // Lakukan restart menggunakan process manager seperti PM2 jika tersedia
                if (process.env.PM2_HOME) {
                    exec('pm2 restart index', (error) => {
                        if (error) {
                            console.error('Gagal restart dengan PM2:', error);
                            process.exit(1); // Fallback ke exit process
                        }
                    });
                } else {
                    // Jika tidak menggunakan PM2, gunakan exit code khusus
                    // yang dapat dideteksi oleh script wrapper
                    process.exit(42);
                }
            }, 2000);
        } catch (error) {
            console.error('Error dalam command restart:', error);
            await arz.sendMessage(
                sender, 
                { text: '❌ Terjadi kesalahan saat melakukan restart bot.' },
                { quoted: m } // Tambahkan quoted message
            );
        }
    }
};