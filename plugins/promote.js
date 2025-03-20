const config = require('../config.js');

module.exports = {
    name: 'promote',
    description: 'Menjadikan anggota sebagai admin grup',
    category: 'Grup',
    usage: '.promote @user / .promote 628xxxx / .promote (reply pesan)',
    example: '.promote @user',
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
                    { text: '❌ Bot harus menjadi admin grup untuk menjadikan anggota sebagai admin!' },
                    { quoted: m }
                );
            }

            let userToPromote = '';
            let isValidUser = false;
            
            // Metode 1: Reply pesan
            if (m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.participant) {
                userToPromote = m.message.extendedTextMessage.contextInfo.participant;
                isValidUser = true;
            }
            // Metode 2: Mention/tag user
            else if (m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.mentionedJid) {
                userToPromote = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
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
                userToPromote = `${number}@s.whatsapp.net`;
                
                // Verifikasi apakah nomor tersebut ada di grup
                isValidUser = groupMetadata.participants.some(p => p.id === userToPromote);
            }
            
            if (!isValidUser) {
                return await arz.sendMessage(
                    sender,
                    { 
                        text: '❌ Tidak dapat menemukan anggota yang dituju! Pastikan nomor benar, mention/tag user, atau reply pesan anggota yang ingin dijadikan admin.' 
                    },
                    { quoted: m }
                );
            }

            // Cek apakah user yang akan dipromote sudah menjadi admin
            const isTargetAdmin = groupMetadata.participants.find(p => p.id === userToPromote)?.admin === 'admin';
            const isTargetSuperAdmin = groupMetadata.participants.find(p => p.id === userToPromote)?.admin === 'superadmin';
            
            if (isTargetAdmin || isTargetSuperAdmin) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Pengguna ini sudah menjadi admin grup!' },
                    { quoted: m }
                );
            }

            // Tambahkan debugging
            console.log(`Attempting to promote user: ${userToPromote}`);
            console.log(`Group ID: ${sender}`);
            console.log(`Is bot admin: ${isBotAdmin}`);

            // Promosikan anggota menjadi admin
            const result = await arz.groupParticipantsUpdate(
                sender, 
                [userToPromote], 
                "promote"
            );

            // Verifikasi hasil
            if (result && result[0] && result[0].status === "200") {
                // Dapatkan nama pengguna jika tersedia, atau nomor jika tidak
                let userDisplayName = '';
                try {
                    const participant = groupMetadata.participants.find(p => p.id === userToPromote);
                    userDisplayName = participant?.notify || userToPromote.split('@')[0];
                } catch (e) {
                    userDisplayName = userToPromote.split('@')[0];
                }

                // Kirim pesan konfirmasi
                await arz.sendMessage(
                    sender,
                    { text: `✅ Berhasil menjadikan @${userToPromote.split('@')[0]} sebagai admin grup.`, mentions: [userToPromote] },
                    { quoted: m }
                );
            } else {
                let errorMessage = 'Terjadi kesalahan saat menjadikan anggota sebagai admin.';
                if (result && result[0] && result[0].status) {
                    errorMessage = `Gagal menjadikan anggota sebagai admin. Status: ${result[0].status}`;
                }
                await arz.sendMessage(
                    sender,
                    { text: `❌ ${errorMessage}` },
                    { quoted: m }
                );
            }

        } catch (error) {
            console.error('Error in promote command:', error);
            await arz.sendMessage(
                sender,
                { text: `❌ Terjadi kesalahan saat menjadikan anggota sebagai admin: ${error.message}` },
                { quoted: m }
            );
        }
    }
};