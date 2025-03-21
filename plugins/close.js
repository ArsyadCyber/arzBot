const config = require('../config.js');

module.exports = {
    name: 'close',
    description: 'Mengatur grup agar hanya admin yang dapat mengirim pesan',
    category: 'Grup',
    usage: '.close',
    example: '.close',
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

            // Mengubah pengaturan grup agar hanya admin yang dapat mengirim pesan
            await arz.groupSettingUpdate(sender, 'announcement');

            // Kirim pesan konfirmasi
            await arz.sendMessage(
                sender,
                { text: '🔒 Grup telah ditutup! Hanya admin yang dapat mengirim pesan.' },
                { quoted: m }
            );

        } catch (error) {
            console.error('Error in close command:', error);
            await arz.sendMessage(
                sender,
                { text: '❌ Terjadi kesalahan saat mengubah pengaturan grup.' },
                { quoted: m }
            );
        }
    }
};