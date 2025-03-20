const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const config = require("./config.js");
const rateLimiter = require("./rate-limiter.js");

// Optimize by using a single readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Initialize commands map outside of the connection function
const commands = new Map();
let commandsLoaded = false;

// Create session folder if it doesn't exist
const SESSION_DIR = "./session";
if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Function to load commands just once
function loadCommands() {
    if (commandsLoaded) return;
    
    try {
        const commandFiles = fs
            .readdirSync("./plugins")
            .filter((file) => file.endsWith(".js"));

        for (const file of commandFiles) {
            const command = require(`./plugins/${file}`);
            commands.set(command.name, command);
        }
        
        console.log(`Loaded ${commands.size} commands`);
        commandsLoaded = true;
    } catch (error) {
        console.error("Error loading commands:", error);
    }
}

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

// Connection retry counter
let retryCount = 0;
const MAX_RETRIES = 5;

// Global store for auth state to keep single session
let authState = null;
let saveCreds = null;

async function connectToWhatsApp() {
    console.log("Connecting to WhatsApp...");
    
    try {
        // Load commands once
        if (!commandsLoaded) {
            loadCommands();
        }
        
        // Create or load auth state only once
        if (!authState || !saveCreds) {
            const { state, saveCreds: saveCredsFunc } = await useMultiFileAuthState(SESSION_DIR);
            authState = state;
            saveCreds = saveCredsFunc;
            console.log("Auth state initialized from", SESSION_DIR);
        }
        
        // Create socket with optimized settings
        const arz = makeWASocket({
            auth: authState,
            printQRInTerminal: false,
            logger: pino({ level: "error" }), // Only log errors
            browser: Browsers.ubuntu("Chrome"), // Use predefined browser
            connectTimeoutMs: 60000, // Increase timeout
            keepAliveIntervalMs: 25000, // Increase keepalive interval
            syncFullHistory: false, // Don't sync full history to save memory
            markOnlineOnConnect: true,
            retryRequestDelayMs: 1000, // Retry delay
            // Use single-file caching for keys to save memory
            keys: makeCacheableSignalKeyStore(authState.keys, pino({ level: "error" })),
            // Optimize memory usage
            options: {
                maxIdleTimeMs: 60000,
                emitOwnEvents: false, // Don't emit own events to save memory
                customUploadHosts: false, // Don't use custom upload hosts
                isInternalApp: true // Signal that this is an internal app
            },
            // Optimize transaction options
            transactionOpts: {
                maxCommitRetries: 10,
                delayBetweenTriesMs: 1000
            },
            // Minimize what gets stored in memory
            getMessage: async () => {
                return {
                    conversation: ''
                };
            }
        });

        if (!authState.creds.registered) {
            try {
                const phoneNumber = await askPhoneNumber();
                const code = await arz.requestPairingCode(phoneNumber);
                console.log(`Kode pairing anda: ${code}`);
            } catch (error) {
                console.log("Error saat meminta kode pairing:", error.message);
                process.exit(1);
            }
        }

        // Rate-limiting for send message
        const originalSendMessage = arz.sendMessage;
        arz.sendMessage = async (jid, content, options = {}) => {
            try {
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
            } catch (error) {
                console.error(`Error sending message to ${jid}:`, error.message);
                // Retry once on error
                await new Promise(resolve => setTimeout(resolve, 1000));
                return await originalSendMessage(jid, content, options);
            }
        };

        // Memory-optimized message handling
        arz.ev.on("messages.upsert", async ({ messages }) => {
            if (!messages || !messages.length) return;
            
            const m = messages[0];
            if (!m.message) return;

            const messageText =
                m.message.conversation ||
                (m.message.extendedTextMessage &&
                m.message.extendedTextMessage.text) ||
                "";
            
            if (!messageText) return;
            
            const sender = m.key.remoteJid;
            const userId = m.key.participant || sender;

            // Log only message start to reduce console spam
            const logMessage = messageText.length > 20 ? 
                messageText.substring(0, 20) + "..." : messageText;
            console.log("Pesan:", logMessage, "dari:", sender);

            try {
                // Non-command messages
                if (!messageText.startsWith(".")) {
                    const greeting = commands.get("greeting");
                    if (greeting) await greeting.execute(arz, sender, messageText, m);
                    return;
                }

                // Rate limit check
                if (!rateLimiter.canExecuteCommand(userId)) {
                    const cooldown = rateLimiter.getCommandCooldown(userId);
                    await arz.sendMessage(
                        sender,
                        { text: `⏳ Mohon tunggu ${cooldown} detik sebelum menggunakan perintah lagi.` },
                        { quoted: m }
                    );
                    return;
                }

                // Command processing
                const args = messageText.slice(1).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();

                if (commands.has(commandName)) {
                    try {
                        const command = commands.get(commandName);

                        // Owner-only check
                        if (command.ownerOnly && sender !== config.ownerNumber) {
                            await arz.sendMessage(
                                sender, 
                                { text: "❌ Maaf, perintah ini hanya dapat digunakan oleh owner bot." },
                                { quoted: m }
                            );
                            return;
                        }

                        await command.execute(arz, sender, args, m);
                    } catch (error) {
                        console.error(`Error executing command ${commandName}:`, error.message);
                        await arz.sendMessage(
                            sender, 
                            { text: "Terjadi kesalahan saat menjalankan perintah." },
                            { quoted: m }
                        );
                    }
                }
            } catch (error) {
                console.error("Error handling message:", error.message);
            } finally {
                // Clear message data to save memory
                m.message = null;
            }
        });

        let isConnected = false;
        arz.ev.on("connection.update", (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                console.log(`Connection closed, status code: ${statusCode}`);
                
                if (shouldReconnect) {
                    retryCount++;
                    if (retryCount <= MAX_RETRIES) {
                        console.log(`Attempting to reconnect (${retryCount}/${MAX_RETRIES})...`);
                        setTimeout(connectToWhatsApp, 5000);
                    } else {
                        console.log("Maximum reconnection attempts reached. Exiting...");
                        process.exit(1);
                    }
                } else {
                    console.log("Logged out. Exiting...");
                    process.exit(0);
                }
            } else if (connection === "open" && !isConnected) {
                console.log("Successfully connected to WhatsApp!");
                isConnected = true;
                retryCount = 0; // Reset retry counter on successful connection
                
                // Send connected message
                arz.sendMessage(
                    config.ownerNumber,
                    { text: config.connectedMessage },
                    { quoted: null }
                ).catch(err => console.error("Failed to send connected message:", err.message));
                
                // Close readline interface
                rl.close();
            }
        });

        // Save auth state on updates
        arz.ev.on("creds.update", saveCreds);
        
        // Clean up unused events and listeners
        process.nextTick(() => {
            // Limit event listeners to prevent memory leaks
            arz.ev.removeAllListeners("chats.set");
            arz.ev.removeAllListeners("contacts.set");
            arz.ev.removeAllListeners("groups.update");
            arz.ev.removeAllListeners("presence.update");
        });
        
        // Memory optimization: periodic garbage collection
        const gcInterval = setInterval(() => {
            try {
                if (global.gc) {
                    global.gc();
                    console.log("Manual garbage collection executed");
                }
            } catch (e) {
                console.log("No manual GC available. Run with --expose-gc flag");
            }
        }, 30 * 60 * 1000); // Every 30 minutes
        
        // Clean up interval on process exit
        process.on('exit', () => {
            clearInterval(gcInterval);
        });
        
        // Handle uncaught exceptions without exiting
        process.on('uncaughtException', (err) => {
            console.error('Uncaught Exception:', err);
            // Don't exit, let the reconnection handle it
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            // Don't exit, let the reconnection handle it
        });
        
    } catch (error) {
        console.error("Error in connection setup:", error.message);
        retryCount++;
        if (retryCount <= MAX_RETRIES) {
            console.log(`Attempting to reconnect after error (${retryCount}/${MAX_RETRIES})...`);
            setTimeout(connectToWhatsApp, 5000);
        } else {
            console.log("Maximum reconnection attempts reached. Exiting...");
            process.exit(1);
        }
    }
}

// Start the connection
connectToWhatsApp();