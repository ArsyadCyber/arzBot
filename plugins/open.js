const config = require('../config.js');

module.exports = {
    name: 'open',
    description: 'Mengatur grup agar semua anggota dapat mengirim pesan',
    category: 'Grup',
    usage: '.open',
    example: '.open',
    // Permission flags
    isGroup: true,    // Hanya dapat digunakan di grup
    ownerOnly: false,  // Hanya owner yang bisa menggunakan
    adminOnly: true,   // Hanya admin yang bisa menggunakan
    execute: async (arz, sender, args, m) => {
        try {

            // Dapatkan info grup
            const groupMetadata = await arz.groupMetadata(sender);
            const botId = arz.user.id.split(':')[0] + '@s.whatsapp.net';
            const botParticipant = groupMetadata.participants.find(p => p.id === botId);
            const isBotAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');

if (!isBotAdmin) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Bot harus menjadi admin grup untuk menghapus status admin anggota!' },
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