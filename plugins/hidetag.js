
const { MessageType } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'hidetag',
    description: 'Mengirim pesan dengan mention seluruh anggota grup (tersembunyi)',
    category: 'Grup',
    usage: '.hidetag [pesan]',
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

            // Cek apakah pengirim adalah admin
            if (!isAdmin && !isSuperAdmin) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Perintah ini hanya dapat digunakan oleh admin grup!' },
                    { quoted: m }
                );
            }

            // Gabungkan args menjadi pesan
            const message = args.join(' ');
            if (!message) {
                return await arz.sendMessage(
                    sender,
                    { text: '⚠️ Mohon masukkan pesan yang ingin dikirim!' },
                    { quoted: m }
                );
            }

            // Dapatkan semua member grup
            const groupMembers = groupMetadata.participants;
            const mentions = groupMembers.map(member => member.id);

            // Kirim pesan dengan mention tersembunyi
            await arz.sendMessage(
                sender,
                {
                    text: message,
                    mentions: mentions
                },
                { quoted: m }
            );

        } catch (error) {
            console.error('Error in hidetag command:', error);
            await arz.sendMessage(
                sender,
                { text: '❌ Terjadi kesalahan saat menjalankan perintah.' },
                { quoted: m }
            );
        }
    }
};
