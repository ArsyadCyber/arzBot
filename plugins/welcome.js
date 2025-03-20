const fs = require('fs');
const path = require('path');

// Path for storing welcome settings
const SETTINGS_DIR = './settings';
const WELCOME_FILE = path.join(SETTINGS_DIR, 'welcome.json');

// Ensure settings directory exists
if (!fs.existsSync(SETTINGS_DIR)) {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
}

// Load welcome settings
function loadWelcomeSettings() {
    try {
        if (fs.existsSync(WELCOME_FILE)) {
            const data = fs.readFileSync(WELCOME_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading welcome settings:', error.message);
    }
    // Default settings if file doesn't exist or has errors
    return {};
}

// Save welcome settings
function saveWelcomeSettings(settings) {
    try {
        fs.writeFileSync(WELCOME_FILE, JSON.stringify(settings, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving welcome settings:', error.message);
    }
}

module.exports = {
    name: 'welcome',
    description: 'Mengatur sambutan otomatis untuk member baru',
    category: 'Group',
    usage: '.welcome [on/off]',
    // Permission flags
    isGroup: true,    // Hanya dapat digunakan di grup
    ownerOnly: false,  // Hanya owner yang bisa menggunakan
    adminOnly: true, // Tidak khusus admin saja
    execute: async (arz, sender, args, m) => {
        try {
            // Load current settings
            const welcomeSettings = loadWelcomeSettings();
            
            // If no arguments, show current status
            if (!args.length) {
                const status = welcomeSettings[sender] ? 'aktif' : 'tidak aktif';
                await arz.sendMessage(
                    sender,
                    { text: `🔔 Status sambutan otomatis: *${status}*\n\nGunakan *.welcome on* untuk mengaktifkan atau *.welcome off* untuk menonaktifkan` },
                    { quoted: m }
                );
                return;
            }

            // Process command arguments
            const option = args[0].toLowerCase();
            
            if (option === 'on') {
                welcomeSettings[sender] = true;
                saveWelcomeSettings(welcomeSettings);
                await arz.sendMessage(
                    sender,
                    { text: '✅ Sambutan otomatis untuk member baru telah *diaktifkan*!' },
                    { quoted: m }
                );
            } else if (option === 'off') {
                welcomeSettings[sender] = false;
                saveWelcomeSettings(welcomeSettings);
                await arz.sendMessage(
                    sender,
                    { text: '❌ Sambutan otomatis untuk member baru telah *dinonaktifkan*!' },
                    { quoted: m }
                );
            } else {
                await arz.sendMessage(
                    sender,
                    { text: '❓ Pilihan tidak valid. Gunakan *.welcome on* untuk mengaktifkan atau *.welcome off* untuk menonaktifkan.' },
                    { quoted: m }
                );
            }
        } catch (error) {
            console.error('Error in welcome command:', error.message);
            await arz.sendMessage(
                sender,
                { text: '❌ Terjadi kesalahan saat menjalankan perintah.' },
                { quoted: m }
            );
        }
    },
    // Function to handle group participant updates (called externally)
    handleGroupParticipantsUpdate: async (arz, groupUpdate) => {
        try {
            // Load welcome settings
            const welcomeSettings = loadWelcomeSettings();
            
            // Extract update details
            const { id: groupId, participants, action } = groupUpdate;
            
            // Only process if welcome is enabled for this group and action is add
            if (!welcomeSettings[groupId] || action !== 'add') {
                return;
            }
            
            // Get group metadata for personalized welcome
            const groupMetadata = await arz.groupMetadata(groupId);
            const groupName = groupMetadata.subject;
            
            // Send welcome message for each new participant
            for (const participant of participants) {
                const welcomeMessage = `Halo @${participant.split('@')[0]} 👋\n\nSelamat datang di *${groupName}*!\n\nSilakan perkenalkan diri anda dan baca deskripsi grup untuk informasi lebih lanjut.`;
                
                await arz.sendMessage(
                    groupId,
                    { 
                        text: welcomeMessage,
                        mentions: [participant] // Tag the new member
                    }
                );
            }
        } catch (error) {
            console.error('Error in welcome handler:', error.message);
        }
    }
};