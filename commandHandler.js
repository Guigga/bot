const fs = require('fs');
const path = require('path');

const commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    // Adicionamos um bloco try...catch para "pegar" qualquer erro durante o carregamento
    try {
        const commandModule = require(path.join(__dirname, 'commands', file));
        
        if (commandModule.name) {
            commands.set(commandModule.name.toLowerCase(), commandModule);
        }
        if (commandModule.aliases && commandModule.aliases.length > 0) {
            commandModule.aliases.forEach(alias => commands.set(alias.toLowerCase(), commandModule));
        }
    } catch (e) {
        // Se um erro acontecer, ele será impresso aqui!
        console.error(`[Command Loader] Erro ao carregar o comando no arquivo ${file}:`, e);
    }
}

console.log(`[Command Loader] ${commands.size} comandos e apelidos carregados.`);

async function handleCommand(sock, m) {
    const messageText = m.message.conversation || m.message.extendedTextMessage?.text || "";
    if (!messageText.startsWith('!')) return;

    const args = messageText.split(' ');
    const commandName = args[0].toLowerCase();

    const commandModule = commands.get(commandName);
    if (commandModule) {
        try {
            await commandModule.execute(sock, m, commandName, messageText, commands);
        } catch (error) {
            console.error(`Erro ao executar o comando ${commandName}:`, error);
            await sock.sendMessage(m.key.remoteJid, { text: `❌ Ops! Algo deu errado ao tentar executar o comando.` }, { quoted: m });
        }
    } else {
        // Adicionamos este log para confirmar quando um comando não é encontrado
        console.log(`[Command Handler] Comando "${commandName}" não encontrado.`);
    }
}

module.exports = handleCommand;