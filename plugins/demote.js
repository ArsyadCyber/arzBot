const config = require('../config.js');

module.exports = {
    name: 'demote',
    description: 'Menghapus status admin dari anggota grup',
    category: 'Grup',
    usage: '.demote @user / .demote 628xxxx / .demote (reply pesan)',
    example: '.demote @user',
    // Permission flags
    isGroup: true,    // Hanya dapat digunakan di grup
    ownerOnly: false,  // Hanya owner yang bisa menggunakan
    adminOnly: true,   // Hanya admin yang bisa menggunakan
    execute: async (arz, sender, args, m) => {
        try {
            // Dapatkan info grup
            const groupMetadata = await arz.groupMetadata(sender);
            
            // Cek apakah bot adalah admin
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

            let userToDemote = '';
            let isValidUser = false;
            
            // Metode 1: Reply pesan
            if (m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.participant) {
                userToDemote = m.message.extendedTextMessage.contextInfo.participant;
                isValidUser = true;
            }
            // Metode 2: Mention/tag user
            else if (m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.mentionedJid) {
                userToDemote = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
                isValidUser = true;
            }
            // Metode 3: Nomor telepon langsung
            else if (args.length > 0) {
                // Format nomor telepon jika perlu
                let number = args[0].replace(/[^0-9]/g, '');
                if (!number.startsWith('62')) {
                    if (number.startsWith('0')) {
                        number = '62' + number.substring(1);
                    } else if (!number.startsWith('62')) {
                        number = '62' + number;
                    }
                }
                userToDemote = `${number}@s.whatsapp.net`;
                
                // Verifikasi apakah nomor tersebut ada di grup
                isValidUser = groupMetadata.participants.some(p => p.id === userToDemote);
            }
            
            if (!isValidUser) {
                return await arz.sendMessage(
                    sender,
                    { 
                        text: '❌ Tidak dapat menemukan anggota yang dituju! Pastikan nomor benar, mention/tag user, atau reply pesan anggota yang ingin dihapus status adminnya.' 
                    },
                    { quoted: m }
                );
            }

            // Cek apakah user yang akan didemote adalah admin
            const isTargetAdmin = groupMetadata.participants.find(p => p.id === userToDemote)?.admin === 'admin';
            const isTargetSuperAdmin = groupMetadata.participants.find(p => p.id === userToDemote)?.admin === 'superadmin';
            
            if (!isTargetAdmin && !isTargetSuperAdmin) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Pengguna ini bukan admin grup!' },
                    { quoted: m }
                );
            }

            // Cek apakah user yang akan didemote adalah owner grup (superadmin)
            if (isTargetSuperAdmin) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Tidak dapat menghapus status admin dari owner grup!' },
                    { quoted: m }
                );
            }

            // Cek apakah user yang akan didemote adalah owner bot
            if (userToDemote === config.ownerNumber) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Tidak dapat menghapus status admin dari owner bot!' },
                    { quoted: m }
                );
            }

            // Tambahkan debugging
            console.log(`Attempting to demote user: ${userToDemote}`);
            console.log(`Group ID: ${sender}`);
            console.log(`Is bot admin: ${isBotAdmin}`);

            // Hapus status admin
            const result = await arz.groupParticipantsUpdate(
                sender, 
                [userToDemote], 
                "demote"
            );

            // Verifikasi hasil
            if (result && result[0] && result[0].status === "200") {
                // Dapatkan nama pengguna jika tersedia, atau nomor jika tidak
                let userDisplayName = '';
                try {
                    const participant = groupMetadata.participants.find(p => p.id === userToDemote);
                    userDisplayName = participant?.notify || userToDemote.split('@')[0];
                } catch (e) {
                    userDisplayName = userToDemote.split('@')[0];
                }

                // Kirim pesan konfirmasi
                await arz.sendMessage(
                    sender,
                    { text: `✅ Berhasil menghapus status admin dari @${userToDemote.split('@')[0]}.`, mentions: [userToDemote] },
                    { quoted: m }
                );
            } else {
                let errorMessage = 'Terjadi kesalahan saat menghapus status admin.';
                if (result && result[0] && result[0].status) {
                    errorMessage = `Gagal menghapus status admin. Status: ${result[0].status}`;
                }
                await arz.sendMessage(
                    sender,
                    { text: `❌ ${errorMessage}` },
                    { quoted: m }
                );
            }

        } catch (error) {
            console.error('Error in demote command:', error);
            await arz.sendMessage(
                sender,
                { text: `❌ Terjadi kesalahan saat menghapus status admin: ${error.message}` },
                { quoted: m }
            );
        }
    }
};