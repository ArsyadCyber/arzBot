module.exports = {
    name: "ping",
    description: "Test bot response",
    category: 'Umum',
    execute: async (arz, sender, args, m) => {  // m adalah objek pesan asli
        await arz.sendMessage(
            sender,
            { text: "Bot sudah aktif kok, jangan lupa donasi ya kak.." },
            { quoted: m }  // Gunakan pesan asli sebagai quoted
        );
    },
};