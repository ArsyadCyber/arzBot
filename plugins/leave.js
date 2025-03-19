
const config = require('../config.js');

module.exports = {
    name: 'leave',
    description: 'Mengeluarkan bot dari grup',
    category: 'Grup',
    usage: '.leave',
    execute: async (arz, sender, args, m) => {
        try {
            // Cek apakah pesan dikirim dari grup
            if (!m.key.remoteJid.endsWith('@g.us')) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Perintah ini hanya dapat digunakan di dalam grup!' },
                    { quoted: m }
                );
            }

            // Dapatkan info grup
            const groupMetadata = await arz.groupMetadata(sender);
            const isAdmin = groupMetadata.participants.find(p => p.id === m.key.participant)?.admin === 'admin';
            const isSuperAdmin = groupMetadata.participants.find(p => p.id === m.key.participant)?.admin === 'superadmin';
            const isOwner = m.key.participant === config.ownerNumber;

            // Cek apakah pengirim adalah admin grup atau owner bot
            if (!isAdmin && !isSuperAdmin && !isOwner) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Perintah ini hanya dapat digunakan oleh admin grup atau owner bot!' },
                    { quoted: m }
                );
            }

            // Kirim pesan perpisahan
            await arz.sendMessage(
                sender,
                { text: '👋 Selamat tinggal! Bot akan keluar dari grup ini.' },
                { quoted: m }
            );

            // Keluar dari grup
            await arz.groupLeave(sender);

        } catch (error) {
            console.error('Error in leave command:', error);
            await arz.sendMessage(
                sender,
                { text: '❌ Terjadi kesalahan saat mencoba keluar dari grup.' },
                { quoted: m }
            );
        }
    }
};
