const config = require('../config.js');

module.exports = {
    name: 'open',
    description: 'Mengatur grup agar semua anggota dapat mengirim pesan',
    category: 'Grup',
    usage: '.open',
    example: '.open',
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

            // Mengubah pengaturan grup agar semua anggota dapat mengirim pesan
            await arz.groupSettingUpdate(sender, 'not_announcement');

            // Kirim pesan konfirmasi
            await arz.sendMessage(
                sender,
                { text: '🔓 Grup telah dibuka! Semua anggota dapat mengirim pesan sekarang.' },
                { quoted: m }
            );

        } catch (error) {
            console.error('Error in open command:', error);
            await arz.sendMessage(
                sender,
                { text: '❌ Terjadi kesalahan saat mengubah pengaturan grup.' },
                { quoted: m }
            );
        }
    }
};