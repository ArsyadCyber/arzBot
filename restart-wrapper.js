const { spawn } = require('child_process');
const fs = require('fs');

// Fungsi untuk log dengan timestamp
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    
    // Opsional: tulis ke file log
    fs.appendFileSync('bot-log.txt', `[${timestamp}] ${message}\n`);
}

// Fungsi untuk menjalankan bot
function startBot() {
    log('Starting WhatsApp bot...');
    
    // Jalankan bot sebagai proses terpisah
    const bot = spawn('node', ['index.js'], {
        stdio: 'inherit',
        detached: false
    });
    
    // Tangani exit event
    bot.on('exit', (code) => {
        log(`Bot exited with code ${code}`);
        
        if (code === 42) {
            // Kode 42 adalah kode khusus untuk restart
            log('Restarting bot as requested...');
            setTimeout(startBot, 1000); // Tunggu 1 detik sebelum restart
        } else if (code !== 0) {
            // Jika keluar dengan error, coba restart setelah delay
            log('Bot crashed. Restarting in 5 seconds...');
            setTimeout(startBot, 5000);
        }
    });
    
    // Tangani error event
    bot.on('error', (err) => {
        log(`Bot process error: ${err}`);
    });
}

// Mulai bot
startBot();