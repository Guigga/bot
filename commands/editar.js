const Transacao = require('../models/Transacao');

module.exports = {
    name: '!editar',
    aliases: ['!edit'],
    category: 'financas',
    description: 'Edita uma transação existente pelo seu ID.',

    async execute(sock, m, command, body) {
        const senderId = m.key.participant || m.key.remoteJid;
        const userId = senderId.split('@')[0];
        
        // --- LÓGICA DE ARGUMENTOS CORRIGIDA ---
        const args = body.split(' ').slice(1);
        const shortId = args[0];
        const campo = args[1];
        const novoValorArray = args.slice(2); // Pega tudo a partir do terceiro argumento
        const novoValor = novoValorArray.join(' '); // Junta tudo para formar o valor final
        // --- FIM DA CORREÇÃO ---

        if (!shortId || !campo || !novoValor) {
            return await sock.sendMessage(m.key.remoteJid, { text: '❌ Formato inválido!\nUse: `!editar <ID> <campo> <novo_valor>`\n\n*Campos editáveis:* `valor`, `categoria`, `descricao`' }, { quoted: m });
        }

        const camposEditaveis = ['valor', 'categoria', 'descricao'];
        if (!camposEditaveis.includes(campo.toLowerCase())) {
            return await sock.sendMessage(m.key.remoteJid, { text: `❌ Campo inválido! Você só pode editar: \`${camposEditaveis.join(', ')}\`.` }, { quoted: m });
        }

        let valorFinal = novoValor;
        if (campo.toLowerCase() === 'valor') {
            valorFinal = parseFloat(novoValor.replace(',', '.'));
            if (isNaN(valorFinal)) {
                return await sock.sendMessage(m.key.remoteJid, { text: '❌ O novo valor fornecido não é um número válido.' }, { quoted: m });
            }
        }

        try {
            const transacaoAtualizada = await Transacao.findOneAndUpdate(
                { shortId: shortId, userId: userId },
                { $set: { [campo.toLowerCase()]: valorFinal } },
                { new: true }
            );

            if (!transacaoAtualizada) {
                return await sock.sendMessage(m.key.remoteJid, { text: `❌ Nenhuma transação encontrada com o ID \`${shortId}\`.` }, { quoted: m });
            }

            await sock.sendMessage(m.key.remoteJid, { text: `✅ Transação *${shortId}* atualizada com sucesso!` }, { quoted: m });

        } catch (error) {
            console.error("Erro ao editar transação:", error);
            await sock.sendMessage(m.key.remoteJid, { text: "❌ Ocorreu um erro ao tentar editar a transação." }, { quoted: m });
        }
    }
};