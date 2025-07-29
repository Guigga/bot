// commands/limparfinancas.js

const Transacao = require('../models/Transacao');
const sessionManager = require('../sessions/sessionManager'); // Assumindo que este arquivo existe no novo projeto

module.exports = {
    name: '!limpar-financas-confirmado',
    description: 'Inicia o processo para apagar TODAS as transações financeiras.',

    // ALTERAÇÃO 1: Assinatura da função
    async execute(sock, m, command, body) {
        const adminIdString = process.env.ADMIN_WHATSAPP_ID || '';
        const adminIds = adminIdString.split(',').map(id => id.trim());
        
        // ALTERAÇÃO 2: Obtenção de IDs padronizada
        const senderId = m.key.participant || m.key.remoteJid;
        const userId = senderId.split('@')[0];
        const chatId = m.key.remoteJid;

        if (!adminIds.includes(userId)) return; // Ignora silenciosamente

        const sessaoExistente = sessionManager.getSession(chatId);
        if (sessaoExistente) {
            // ALTERAÇÃO 3: Usar sock.sendMessage para responder
            return await sock.sendMessage(chatId, { text: '❌ Já existe uma outra operação (ou jogo) em andamento neste chat.' }, { quoted: m });
        }

        // Cria uma nova sessão de confirmação
        sessionManager.createSession(chatId, 'confirmacao-limpeza', userId);
        
        await sock.sendMessage(chatId, { text: '⚠️ *VOCÊ TEM CERTEZA?*\nEsta ação apagará TODAS as suas transações financeiras e não pode ser desfeita.\n\nDigite `sim` para confirmar ou qualquer outra coisa para cancelar.' }, { quoted: m });

        // Adiciona um timeout de 30 segundos para cancelar automaticamente
        setTimeout(() => {
            const sessaoAindaExiste = sessionManager.getSession(chatId);
            if (sessaoAindaExiste && sessaoAindaExiste.game === 'confirmacao-limpeza') {
                sock.sendMessage(chatId, { text: 'Tempo esgotado. Operação de limpeza cancelada.' });
                sessionManager.endSession(chatId);
            }
        }, 30000); // 30 segundos
    }
};