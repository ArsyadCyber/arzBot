const config = require('../config.js');

module.exports = {
    name: 'add',
    description: 'Menambahkan anggota ke dalam grup',
    category: 'Grup',
    usage: '.add 628538998368 atau .add 628538998368 https://chat.whatsapp.com/xxx',
    example: '.add 628538998368 atau .add 628538998368 https://chat.whatsapp.com/xxx',
    execute: async (arz, sender, args, m) => {
        try {
            // Cek apakah argumen nomor telepon diberikan
            if (args.length === 0) {
                return await arz.sendMessage(
                    sender,
                    { text: '❌ Silakan masukkan nomor telepon yang ingin ditambahkan! Format: .add 628538998368 atau .add 628538998368 https://chat.whatsapp.com/xxx' },
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

            // Cek apakah pesan dikirim dari grup atau pribadi
            const isGroupChat = sender.endsWith('@g.us');
            const isPrivateChat = sender.endsWith('@s.whatsapp.net');

            // Cek jika ada argumen tautan grup
            const hasGroupLink = args.length > 1 && args[1].startsWith('https://chat.whatsapp.com/');

            // LOGIKA 1: Menambahkan pengguna ke grup saat ini (dari dalam grup)
            if (isGroupChat && !hasGroupLink) {
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
            }
            
            // LOGIKA 2: Menambahkan pengguna ke grup tertentu melalui tautan grup (dari chat pribadi)
            else if (isPrivateChat && hasGroupLink) {
                // Cek apakah pengirim adalah owner bot
                if (sender !== config.ownerNumber) {
                    return await arz.sendMessage(
                        sender,
                        { text: '❌ Perintah ini hanya dapat digunakan oleh owner bot!' },
                        { quoted: m }
                    );
                }

                const groupLink = args[1];
                
                // Debugging
                console.log(`Attempting to add user: ${userToAdd} to group: ${groupLink}`);

                try {
                    // Dapatkan kode grup dari tautan
                    const groupCode = groupLink.split('https://chat.whatsapp.com/')[1];
                    if (!groupCode) {
                        return await arz.sendMessage(
                            sender,
                            { text: '❌ Tautan grup tidak valid!' },
                            { quoted: m }
                        );
                    }

                    // Dapatkan info grup dari kode
                    const groupInfo = await arz.groupGetInviteInfo(groupCode);
                    if (!groupInfo.id) {
                        return await arz.sendMessage(
                            sender,
                            { text: '❌ Tidak dapat mendapatkan informasi grup dari tautan tersebut!' },
                            { quoted: m }
                        );
                    }

                    // Cek apakah bot sudah ada di grup
                    let isBotInGroup = false;
                    try {
                        await arz.groupMetadata(groupInfo.id);
                        isBotInGroup = true;
                    } catch (error) {
                        // Bot belum ada di grup, coba gabung
                        try {
                            await arz.groupAcceptInvite(groupCode);
                            console.log(`Bot joined group: ${groupInfo.id}`);
                            // Tunggu sebentar agar bot berhasil bergabung
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        } catch (joinError) {
                            console.error(`Failed to join group: ${joinError.message}`);
                            return await arz.sendMessage(
                                sender,
                                { text: `❌ Bot tidak dapat bergabung dengan grup: ${joinError.message}` },
                                { quoted: m }
                            );
                        }
                    }

                    // Dapatkan metadata grup
                    const groupMetadata = await arz.groupMetadata(groupInfo.id);
                    
                    // Cek apakah bot adalah admin
                    const botId = arz.user.id.split(':')[0] + '@s.whatsapp.net';
                    const botParticipant = groupMetadata.participants.find(p => p.id === botId);
                    const isBotAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');

                    if (!isBotAdmin) {
                        return await arz.sendMessage(
                            sender,
                            { text: '❌ Bot harus menjadi admin grup untuk menambahkan anggota! Mohon jadikan bot sebagai admin di grup tersebut.' },
                            { quoted: m }
                        );
                    }

                    // Cek apakah nomor tersebut sudah ada di grup
                    const isAlreadyInGroup = groupMetadata.participants.some(p => p.id === userToAdd);
                    if (isAlreadyInGroup) {
                        return await arz.sendMessage(
                            sender,
                            { text: `❌ Nomor tersebut sudah ada dalam grup ${groupInfo.subject}!` },
                            { quoted: m }
                        );
                    }

                    // Tambahkan pengguna ke grup
                    const result = await arz.groupParticipantsUpdate(
                        groupInfo.id,
                        [userToAdd],
                        "add"
                    );

                    // Verifikasi hasil
                    if (result[0].status === "200") {
                        await arz.sendMessage(
                            sender,
                            { text: `✅ Berhasil menambahkan @${userToAdd.split('@')[0]} ke dalam grup "${groupInfo.subject}".`, mentions: [userToAdd] },
                            { quoted: m }
                        );
                    } else if (result[0].status === "409") {
                        await arz.sendMessage(
                            sender,
                            { text: `❌ Nomor tersebut sudah ada dalam grup "${groupInfo.subject}"!` },
                            { quoted: m }
                        );
                    } else if (result[0].status === "403") {
                        await arz.sendMessage(
                            sender,
                            { text: `❌ Tidak dapat menambahkan pengguna. Pengguna mungkin telah keluar atau dikeluarkan dari grup "${groupInfo.subject}" sebelumnya.` },
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
                } catch (linkError) {
                    console.error(`Error processing group link: ${linkError.message}`);
                    await arz.sendMessage(
                        sender,
                        { text: `❌ Terjadi kesalahan saat memproses tautan grup: ${linkError.message}` },
                        { quoted: m }
                    );
                }
            }
            
            // Perintah digunakan dengan cara yang tidak sesuai
            else if (isPrivateChat && !hasGroupLink) {
                await arz.sendMessage(
                    sender,
                    { text: '❌ Untuk menambahkan anggota ke grup tertentu dari chat pribadi, gunakan format: .add 628538998368 https://chat.whatsapp.com/xxx' },
                    { quoted: m }
                );
            }
            else if (isGroupChat && hasGroupLink) {
                await arz.sendMessage(
                    sender,
                    { text: '❌ Saat berada di dalam grup, gunakan format: .add 628538998368 (tanpa tautan grup)' },
                    { quoted: m }
                );
            }

        } catch (error) {
            console.error('Error in add command:', error);
            await arz.sendMessage(
                sender,
                { text: `❌ Terjadi kesalahan saat menambahkan anggota: ${error.message}` },
                { quoted: m }
            );
        }
    }
};