
const config = require('../config.js');

module.exports = {
    name: 'feedback',
    description: 'Mengirim feedback kepada owner bot',
    category: 'Umum',
    usage: '.feedback <pesan>',
    execute: async (arz, sender, args, m) => {
        try {
            // Cek apakah pesan dikirim dari grup
            if (m.key.remoteJid.endsWith('@g.us')) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Maaf, perintah feedback hanya dapat digunakan di chat pribadi!' },
                    { quoted: m }
                );
            }

            // Gabungkan args menjadi pesan
            const feedback = args.join(' ');
            if (!feedback) {
                return await arz.sendMessage(
                    sender,
                    { text: '⚠️ Mohon masukkan pesan feedback!' },
                    { quoted: m }
                );
            }

            // Kirim feedback ke owner
            const senderNumber = (m.key.participant || m.key.remoteJid).split('@')[0];
            const senderName = m.pushName || 'No Name';
            const feedbackMessage = `*📬 FEEDBACK BARU*\n\n` +
                                 `*Dari:* +${senderNumber}\n` +
                                 `*Nama:* ${senderName}\n` +
                                 `*Pesan:* ${feedback}`;

            await arz.sendMessage(
                config.ownerNumber,
                { text: feedbackMessage }
            );

            // Kirim konfirmasi ke pengirim
            await arz.sendMessage(
                sender,
                { text: '✅ Terima kasih! Feedback Anda telah terkirim ke owner.' },
                { quoted: m }
            );

        } catch (error) {
            console.error('Error in feedback command:', error);
            await arz.sendMessage(
                sender,
                { text: '❌ Terjadi kesalahan saat mengirim feedback.' },
                { quoted: m }
            );
        }
    }
};
