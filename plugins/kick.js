module.exports = {
    name: "kick",
    description: "Kick member dari grup",
    category: 'Admin',
    usage: '.kick @user',
    // Permission flags
    isGroup: true,    // Hanya dapat digunakan di grup
    ownerOnly: false, // Tidak harus owner bot
    adminOnly: true,  // Harus admin grup
    execute: async (arz, sender, args, m) => {
        try {
            // Dapatkan mention
            const mentionedJid = m.message.extendedTextMessage?.contextInfo?.mentionedJid;
            
            if (!mentionedJid || mentionedJid.length === 0) {
                await arz.sendMessage(
                    sender,
                    { text: "❌ Tag member yang ingin di-kick! Contoh: .kick @user" },
                    { quoted: m }
                );
                return;
            }
            
            const targetJid = mentionedJid[0];
            
            // Cek apakah bot adalah admin
            const groupMetadata = await arz.groupMetadata(sender);
            const botJid = arz.user.id;
            const isBotAdmin = groupMetadata.participants
                .filter(p => p.admin)
                .map(p => p.id)
                .includes(botJid);
                
            if (!isBotAdmin) {
                await arz.sendMessage(
                    sender,
                    { text: "❌ Bot harus menjadi admin untuk mengeluarkan member!" },
                    { quoted: m }
                );
                return;
            }
            
            // Kick member
            await arz.groupParticipantsUpdate(
                sender,
                [targetJid],
                "remove"
            );
            
            await arz.sendMessage(
                sender,
                { text: `✅ Berhasil mengeluarkan @${targetJid.split('@')[0]} dari grup!`, mentions: [targetJid] },
                { quoted: m }
            );
            
        } catch (error) {
            console.error('Error in kick command:', error.message);
            await arz.sendMessage(
                sender,
                { text: "❌ Terjadi kesalahan saat mengeluarkan member." },
                { quoted: m }
            );
        }
    },
};