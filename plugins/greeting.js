const moment = require('moment-timezone');

module.exports = {
    name: 'greeting',
    description: 'Auto reply dengan salam sesuai waktu',
    execute: async (arz, sender, messageText, m) => { // Tambahkan parameter m
        const greetings = ['hai', 'halo', 'hi', 'hello', 'hey', 'p', 'uy'];

        // Ubah pesan jadi lowercase untuk pengecekan
        const msg = messageText.toLowerCase();

        // Cek apakah pesan termasuk sapaan
        if (greetings.includes(msg)) {
            // Set timezone Jakarta
            const time = moment().tz('Asia/Jakarta');
            const hour = time.hour();

            let greeting = '';
            if (hour >= 3 && hour < 11) {
                greeting = 'Selamat pagi';
            } else if (hour >= 11 && hour < 15) {
                greeting = 'Selamat siang';
            } else if (hour >= 15 && hour < 18) {
                greeting = 'Selamat sore';
            } else {
                greeting = 'Selamat malam';
            }

            const response = `${greeting} kak 👋\nAda yang bisa saya bantu?\nKetik .help untuk melihat daftar perintah.`;
            await arz.sendMessage(
                sender, 
                { text: response },
                { quoted: m } // Gunakan quoted message
            );
        }
    }
};