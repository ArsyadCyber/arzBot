module.exports = {
    name: 'help',
    description: 'Menampilkan daftar perintah yang tersedia',
    category: 'Umum', // Tambahkan kategori
    usage: '.help [nama_perintah]',
    example: '.help berita',
    execute: async (arz, sender, args, m) => {
        try {
            // Cek apakah ada argumen spesifik untuk menampilkan bantuan sebuah perintah
            if (args.length > 0) {
                const commandName = args[0].toLowerCase();
                const fs = require('fs');
                const path = require('path');

                // Coba load command yang diminta
                try {
                    const commandPath = path.join(__dirname, `${commandName}.js`);
                    if (fs.existsSync(commandPath)) {
                        const command = require(commandPath);
                        const helpText = `*Bantuan untuk perintah .${command.name}*\n\n` +
                                         `📝 *Deskripsi:* ${command.description}\n` +
                                         (command.usage ? `🔍 *Penggunaan:* ${command.usage}\n` : '') +
                                         (command.example ? `📋 *Contoh:* ${command.example}\n` : '') +
                                         (command.ownerOnly ? '👑 *Catatan:* Perintah ini hanya dapat digunakan oleh owner bot.\n' : '');

                        return await arz.sendMessage(sender, { text: helpText }, { quoted: m });
                    } else {
                        return await arz.sendMessage(sender, { text: `❌ Perintah ${commandName} tidak ditemukan.` }, { quoted: m });
                    }
                } catch (error) {
                    console.error('Error loading command help:', error);
                    return await arz.sendMessage(sender, { text: `❌ Tidak dapat menampilkan bantuan untuk perintah ${commandName}.` }, { quoted: m });
                }
            }

            // Jika tidak ada argumen, tampilkan daftar semua perintah
            const fs = require('fs');
            const path = require('path');
            const commandFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js'));

            let helpText = `*📱 DAFTAR PERINTAH BOT*\n\n`;

            // Kategori perintah (akan diisi otomatis)
            const categories = {};

            // Daftar perintah yang akan dilewati (tidak ditampilkan)
            const skipCommands = ['greeting'];

            // Kumpulkan semua perintah dan kategorikan berdasarkan property category
            for (const file of commandFiles) {
                const command = require(path.join(__dirname, file));

                // Lewati perintah yang ada dalam daftar skipCommands
                if (skipCommands.includes(command.name)) {
                    continue;
                }

                // Jika perintah tidak punya kategori, masukkan ke Lainnya
                const category = command.category || 'Lainnya';

                // Buat kategori jika belum ada
                if (!categories[category]) {
                    categories[category] = [];
                }

                // Tambahkan perintah ke kategori
                categories[category].push(command);
            }

            // Tampilkan perintah berdasarkan kategori
            // Urutkan kategori (Owner selalu terakhir)
            const sortedCategories = Object.keys(categories).sort((a, b) => {
                if (a === 'Owner') return 1;
                if (b === 'Owner') return -1;
                if (a === 'Umum') return -1;
                if (b === 'Umum') return 1;
                return a.localeCompare(b);
            });

            for (const category of sortedCategories) {
                const commands = categories[category];

                if (commands.length > 0) {
                    helpText += `*${category}*:\n`;

                    for (const command of commands) {
                        helpText += `• *.${command.name}* - ${command.description}\n`;
                    }

                    helpText += '\n';
                }
            }

            helpText += `Untuk informasi lebih detail tentang sebuah perintah, ketik *.help [nama_perintah]*\n\n`;
            helpText += `Contoh: *.help berita*`;

            await arz.sendMessage(sender, { text: helpText }, { quoted: m });
        } catch (error) {
            console.error('Error dalam command help:', error);
            await arz.sendMessage(sender, { text: '❌ Terjadi kesalahan saat menampilkan daftar perintah.' }, { quoted: m });
        }
    }
};