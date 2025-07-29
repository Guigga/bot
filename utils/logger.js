// utils/logger.js

/**
 * Função de log inteligente que formata a saída com informações do grupo e do autor.
 * @param {import('@whiskeysockets/baileys').WASocket} sock - A instância do cliente Baileys.
 * @param {import('@whiskeysockets/baileys').WAMessage} m - O objeto da mensagem.
 * @param {...any} logTexts - Os textos ou objetos a serem logados.
 */
async function log(sock, m, ...logTexts) {
    const chatId = m.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    const senderName = m.pushName || 'Nome Desconhecido';

    let prefix = `[${new Date().toLocaleTimeString('pt-BR')}]`;

    try {
        if (isGroup) {
            // sock.groupMetadata é uma função assíncrona para buscar dados do grupo
            const groupMetadata = await sock.groupMetadata(chatId);
            const groupName = groupMetadata.subject;
            prefix += ` [Grupo: ${groupName}] [Usuário: ${senderName}]`;
        } else {
            // Mensagem privada
            prefix += ` [PV - ${senderName}]`;
        }
    } catch (e) {
        // Fallback caso não consiga buscar os metadados do grupo
        prefix += ` [Contexto Indisponível]`;
    }

    console.log(prefix, ...logTexts);
}

module.exports = { log };