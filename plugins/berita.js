
const axios = require('axios');

module.exports = {
    name: 'berita',
    description: 'Mendapatkan berita dari berbagai sumber',
    category: 'Informasi',
    execute: async (arz, sender, args) => {
        if (args.length < 1) {
            return await arz.sendMessage(sender, {
                text: `*Cara Penggunaan:*\n\n.berita [sumber] [kategori]\n\nContoh:\n.berita cnn terbaru\n.berita antara politik\n\n*Sumber Berita yang Tersedia:*\n- antara\n- cnbc\n- cnn\n- jpnn\n- kumparan\n- merdeka\n- okezone\n- republika\n- sindonews\n- suara\n- tempo\n- tribun`
            });
        }

        const source = args[0].toLowerCase();
        const category = args[1] ? args[1].toLowerCase() : 'terbaru';
        
        try {
            const response = await axios.get(`https://api-berita-indonesia.vercel.app/${source}/${category}`);
            const posts = response.data.data.posts;
            
            if (!posts || posts.length === 0) {
                return await arz.sendMessage(sender, {
                    text: '❌ Tidak ada berita yang ditemukan.'
                });
            }

            let newsText = `📰 *Berita ${source.toUpperCase()} - ${category.toUpperCase()}*\n\n`;
            
            // Ambil 5 berita teratas
            const topNews = posts.slice(0, 5);
            
            topNews.forEach((news, index) => {
                newsText += `${index + 1}. *${news.title}*\n`;
                newsText += `${news.description || news.link}\n\n`;
            });

            await arz.sendMessage(sender, { text: newsText });
            
        } catch (error) {
            console.error('Error:', error);
            await arz.sendMessage(sender, {
                text: '❌ Terjadi kesalahan. Pastikan sumber dan kategori berita valid.'
            });
        }
    }
};
