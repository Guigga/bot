const Transacao = require('../models/Transacao');

module.exports = {
    name: '!apagar',
    aliases: ['!remover', '!deletar'],
    category: 'financas',
    description: 'Apaga uma transação financeira pelo seu ID curto.',

    async execute(sock, m, command, body) {
        // Obtenção do ID do usuário padronizada
        const senderId = m.key.participant || m.key.remoteJid;
        const userId = senderId.split('@')[0];
        const args = body.split(' ').slice(1);
        const shortId = args[0];

        if (!shortId) {
            return await sock.sendMessage(m.key.remoteJid, { text: '❌ Formato inválido. Use `!apagar <ID_curto>`.\nVocê pode ver o ID no comando `!extrato`.' }, { quoted: m });
        }

        try {
            const transacaoApagada = await Transacao.findOneAndDelete({ 
                shortId: shortId,
                userId: userId
            });

            if (!transacaoApagada) {
                return await sock.sendMessage(m.key.remoteJid, { text: `❌ Nenhuma transação encontrada com o ID \`${shortId}\`.` }, { quoted: m });
            }

            const { tipo, valor, categoria } = transacaoApagada;
            const emoji = tipo === 'ganho' ? '🟢' : '🔴';
            const valorFormatado = valor.toFixed(2).replace('.', ',');
            
            await sock.sendMessage(m.key.remoteJid, { text: `✅ Transação apagada com sucesso!\n\n${emoji} R$ ${valorFormatado} - *${categoria}*` }, { quoted: m });

        } catch (error) {
            console.error("Erro ao apagar transação:", error);
            await sock.sendMessage(m.key.remoteJid, { text: "❌ Ocorreu um erro ao tentar apagar a transação." }, { quoted: m });
        }
    }
};