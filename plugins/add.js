const config = require('../config.js');

module.exports = {
    name: 'add',
    description: 'Menambahkan anggota ke dalam grup',
    category: 'Grup',
    usage: '.add 628538998368',
    example: '.add 628538998368',
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
            
            // Cek status admin pengirim
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

            // Cek apakah bot adalah admin
            const botId = arz.user.id.split(':')[0] + '@s.whatsapp.net';
            const botParticipant = groupMetadata.participants.find(p => p.id === botId);
            const isBotAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');

            if (!isBotAdmin) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Bot harus menjadi admin grup untuk menambahkan anggota!' },
                    { quoted: m }
                );
            }

            // Cek apakah nomor telepon diberikan
            if (args.length === 0) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Silakan masukkan nomor telepon yang ingin ditambahkan! Format: .add 628538998368' },
                    { quoted: m }
                );
            }

            // Format nomor telepon
            let number = args[0].replace(/[^0-9]/g, '');
            if (!number.startsWith('62')) {
                if (number.startsWith('0')) {
                    number = '62' + number.substring(1);
                } else if (!number.startsWith('62')) {
                    number = '62' + number;
                }
            }
            const userToAdd = `${number}@s.whatsapp.net`;
            
            // Cek apakah nomor tersebut sudah ada di grup
            const isAlreadyInGroup = groupMetadata.participants.some(p => p.id === userToAdd);
            if (isAlreadyInGroup) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Nomor tersebut sudah ada dalam grup!' },
                    { quoted: m }
                );
            }

            // Debugging
            console.log(`Attempting to add user: ${userToAdd}`);
            console.log(`Group ID: ${sender}`);

            // Tambahkan anggota ke grup
            const result = await arz.groupParticipantsUpdate(
                sender, 
                [userToAdd], 
                "add"
            );

            // Verifikasi hasil
            if (result[0].status === "200") {
                await arz.sendMessage(
                    sender,
                    { text: `✅ Berhasil menambahkan @${userToAdd.split('@')[0]} ke dalam grup.`, mentions: [userToAdd] },
                    { quoted: m }
                );
            } else if (result[0].status === "409") {
                await arz.sendMessage(
                    sender,
                    { text: `❌ Nomor tersebut sudah ada dalam grup!` },
                    { quoted: m }
                );
            } else if (result[0].status === "403") {
                await arz.sendMessage(
                    sender,
                    { text: `❌ Tidak dapat menambahkan pengguna. Pengguna mungkin telah keluar atau dikeluarkan dari grup sebelumnya.` },
                    { quoted: m }
                );
            } else if (result[0].status === "408") {
                await arz.sendMessage(
                    sender,
                    { text: `❌ Pengguna telah membatasi siapa yang dapat menambahkannya ke dalam grup.` },
                    { quoted: m }
                );
            } else {
                await arz.sendMessage(
                    sender,
                    { text: `❌ Gagal menambahkan pengguna dengan status: ${result[0].status}` },
                    { quoted: m }
                );
            }

        } catch (error) {
            console.error('Error in add command:', error);
            await arz.sendMessage(
                sender,
                { text: `❌ Terjadi kesalahan saat menambahkan anggota ke grup: ${error.message}` },
                { quoted: m }
            );
        }
    }
};