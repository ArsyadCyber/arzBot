const config = require('../config.js');

module.exports = {
    name: 'kick',
    description: 'Mengeluarkan anggota dari grup',
    category: 'Grup',
    usage: '.kick @user / .kick 628xxxx / .kick (reply pesan)',
    example: '.kick @user',
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

            // Cek apakah bot adalah admin (perbaikan)
            const botId = arz.user.id.split(':')[0] + '@s.whatsapp.net';
            const botParticipant = groupMetadata.participants.find(p => p.id === botId);
            const isBotAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');

            if (!isBotAdmin) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Bot harus menjadi admin grup untuk mengeluarkan anggota!' },
                    { quoted: m }
                );
            }

            let userToKick = '';
            let isValidUser = false;
            
            // Metode 1: Reply pesan
            if (m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.participant) {
                userToKick = m.message.extendedTextMessage.contextInfo.participant;
                isValidUser = true;
            }
            // Metode 2: Mention/tag user
            else if (m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.mentionedJid) {
                userToKick = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
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
                userToKick = `${number}@s.whatsapp.net`;
                
                // Verifikasi apakah nomor tersebut ada di grup
                isValidUser = groupMetadata.participants.some(p => p.id === userToKick);
            }
            
            if (!isValidUser) {
                return await arz.sendMessage(
                    sender,
                    { 
                        text: '❌ Tidak dapat menemukan anggota yang dituju! Pastikan nomor benar, mention/tag user, atau reply pesan anggota yang ingin dikeluarkan.' 
                    },
                    { quoted: m }
                );
            }

            // Cek apakah user yang akan di-kick adalah admin
            const isTargetAdmin = groupMetadata.participants.find(p => p.id === userToKick)?.admin === 'admin';
            const isTargetSuperAdmin = groupMetadata.participants.find(p => p.id === userToKick)?.admin === 'superadmin';
            
            if (isTargetAdmin || isTargetSuperAdmin) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Tidak dapat mengeluarkan admin dari grup!' },
                    { quoted: m }
                );
            }

            // Cek apakah user yang akan di-kick adalah owner bot
            if (userToKick === config.ownerNumber) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Tidak dapat mengeluarkan owner bot dari grup!' },
                    { quoted: m }
                );
            }

            // Tambahkan debugging
            console.log(`Attempting to kick user: ${userToKick}`);
            console.log(`Group ID: ${sender}`);
            console.log(`Is bot admin: ${isBotAdmin}`);

            // Keluarkan anggota dari grup
            await arz.groupParticipantsUpdate(
                sender, 
                [userToKick], 
                "remove"
            );

            // Dapatkan nama pengguna jika tersedia, atau nomor jika tidak
            let userDisplayName = '';
            try {
                const participant = groupMetadata.participants.find(p => p.id === userToKick);
                userDisplayName = participant?.notify || userToKick.split('@')[0];
            } catch (e) {
                userDisplayName = userToKick.split('@')[0];
            }

            // Kirim pesan konfirmasi
            await arz.sendMessage(
                sender,
                { text: `✅ Berhasil mengeluarkan @${userToKick.split('@')[0]} dari grup.`, mentions: [userToKick] },
                { quoted: m }
            );

        } catch (error) {
            console.error('Error in kick command:', error);
            await arz.sendMessage(
                sender,
                { text: `❌ Terjadi kesalahan saat mengeluarkan anggota dari grup: ${error.message}` },
                { quoted: m }
            );
        }
    }
};