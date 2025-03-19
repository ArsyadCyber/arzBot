
const config = require('../config.js');

module.exports = {
    name: 'join',
    description: 'Memasukkan bot ke dalam grup menggunakan invite link',
    category: 'Owner',
    usage: '.join <invitelink>',
    execute: async (arz, sender, args, m) => {
        try {
            // Cek apakah pengirim adalah owner
            if (sender !== config.ownerNumber) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Maaf, perintah ini hanya dapat digunakan oleh owner bot!' },
                    { quoted: m }
                );
            }

            // Cek apakah invite link ada
            if (!args[0]) {
                return await arz.sendMessage(
                    sender,
                    { text: '⚠️ Mohon masukkan invite link grup!' },
                    { quoted: m }
                );
            }

            // Ekstrak kode grup dari invite link
            let result = args[0].split('https://chat.whatsapp.com/')[1];
            if (!result) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Invalid invite link!' },
                    { quoted: m }
                );
            }

            // Mencoba bergabung dengan grup
            let res = await arz.groupAcceptInvite(result);
            if (!res) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Link tidak valid atau bot sudah berada di grup tersebut!' },
                    { quoted: m }
                );
            }

            await arz.sendMessage(
                sender,
                { text: '✅ Berhasil bergabung dengan grup!' },
                { quoted: m }
            );

        } catch (error) {
            console.error('Error in join command:', error);
            await arz.sendMessage(
                sender,
                { text: '❌ Terjadi kesalahan saat mencoba bergabung dengan grup.' },
                { quoted: m }
            );
        }
    }
};
