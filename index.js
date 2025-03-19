const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const config = require("./config.js");
const rateLimiter = require("./rate-limiter.js");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function askPhoneNumber() {
    return new Promise((resolve) => {
        rl.question(
            "Masukkan nomor anda (contoh: 628688669993): ",
            (number) => {
                resolve(number);
            },
        );
    });
}

async function connectToWhatsApp() {
    const { state, saveCreds } =
        await useMultiFileAuthState("auth_info_baileys");

    const arz = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "22.04.4"],
    });

    if (!state.creds.registered) {
        const phoneNumber = await askPhoneNumber();
        try {
            const code = await arz.requestPairingCode(phoneNumber);
            console.log(`Kode pairing anda: ${code}`);
        } catch (error) {
            console.log("Error saat meminta kode pairing");
            process.exit(1);
        }
    }

    const commands = new Map();
    const commandFiles = fs
        .readdirSync("./plugins")
        .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
        const command = require(`./plugins/${file}`);
        commands.set(command.name, command);
    }

    const originalSendMessage = arz.sendMessage;
    arz.sendMessage = async (jid, content, options = {}) => {
        if (!rateLimiter.canSendGlobalMessage()) {
            console.log(`Global rate limit tercapai! Menunggu...`);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return arz.sendMessage(jid, content, options);
        }
        
        if (!rateLimiter.canSendMessage(jid)) {
            const cooldown = rateLimiter.getMessageCooldown(jid);
            console.log(`Rate limit untuk pesan ke ${jid}: tunggu ${cooldown}ms`);
            
            await new Promise(resolve => setTimeout(resolve, cooldown));
        }
        
        return await originalSendMessage(jid, content, options);
    };

    arz.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        const messageText =
            m.message.conversation ||
            (m.message.extendedTextMessage &&
                m.message.extendedTextMessage.text) ||
            "";
        const sender = m.key.remoteJid;
        const userId = m.key.participant || sender;

        console.log("Pesan:", messageText, "dari:", sender);

        if (!messageText) return;

        if (!messageText.startsWith(".")) {
            const greeting = commands.get("greeting");
            if (greeting) await greeting.execute(arz, sender, messageText, m);
            return;
        }

        if (!rateLimiter.canExecuteCommand(userId)) {
            const cooldown = rateLimiter.getCommandCooldown(userId);
            await arz.sendMessage(
                sender,
                { text: `⏳ Mohon tunggu ${cooldown} detik sebelum menggunakan perintah lagi. Anda telah mencapai batas 5 perintah per menit.` },
                { quoted: m }
            );
            return;
        }

        const args = messageText.slice(1).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        if (commands.has(commandName)) {
            try {
                const command = commands.get(commandName);

                if (command.ownerOnly && sender !== config.ownerNumber) {
                    return await arz.sendMessage(
                        sender, 
                        {
                            text: "❌ Maaf, perintah ini hanya dapat digunakan oleh owner bot.",
                        },
                        { quoted: m }
                    );
                }

                await command.execute(arz, sender, args, m);
            } catch (error) {
                console.error(error);
                await arz.sendMessage(
                    sender, 
                    {
                        text: "Terjadi kesalahan saat menjalankan perintah.",
                    },
                    { quoted: m }
                );
            }
        }
    });

    let isConnected = false;
    arz.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;
            if (shouldReconnect && !isConnected) {
                connectToWhatsApp();
            }
        } else if (connection === "open" && !isConnected) {
            isConnected = true;
            console.log("Terhubung ke WhatsApp");
            const config = require("./config.js");
            arz.sendMessage(
                config.ownerNumber,
                { text: config.connectedMessage },
                {
                    quoted: {
                        key: {
                            participant: "0@s.whatsapp.net",
                            remoteJid: "status@broadcast",
                            fromMe: false,
                        },
                        message: {
                            conversation: `bot whatsapp by Arsyad`,
                        },
                    },
                },
            );
            rl.close();
        }
    });

    arz.ev.on("creds.update", saveCreds);
}

connectToWhatsApp();