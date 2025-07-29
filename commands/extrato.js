// commands/extrato.js

const Transacao = require('../models/Transacao');

module.exports = {
    name: '!extrato',
    aliases: ['!buscar'],
    category: 'financas',
    description: 'Exibe uma lista detalhada de transações.',

    // Assinatura da função alterada
    async execute(sock, m, command, body) {
        // Obtenção do ID do usuário padronizada
        const senderId = m.key.participant || m.key.remoteJid;
        const userId = senderId.split('@')[0];
        const args = body.split(' ').slice(1);
        const termoBusca = args.join(' ');

        let query = { userId: userId };
        let titulo = 'Últimas 10 Transações';
        let limite = 10;

        if (args.length > 0) {
            if (termoBusca.match(/^\d+$/) && parseInt(termoBusca) > 0) {
                limite = parseInt(termoBusca);
                titulo = `Últimas ${limite} Transações`;
            } else if (termoBusca.match(/^\d{2}\/\d{4}$/)) {
                const [mes, ano] = termoBusca.split('/');
                const mesNum = parseInt(mes) - 1;
                const anoNum = parseInt(ano);
                const inicioPeriodo = new Date(anoNum, mesNum, 1);
                const fimPeriodo = new Date(anoNum, mesNum + 1, 0, 23, 59, 59);
                const nomeMes = inicioPeriodo.toLocaleString('pt-BR', { month: 'long' });
                query.createdAt = { $gte: inicioPeriodo, $lte: fimPeriodo };
                titulo = `Transações de ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${anoNum}`;
                limite = 0;
            } else {
                query.$or = [
                    { categoria: new RegExp(termoBusca, 'i') },
                    { descricao: new RegExp(termoBusca, 'i') }
                ];
                titulo = `Transações encontradas para "${termoBusca}"`;
            }
        }
        
        try {
            const transacoes = await Transacao.find(query).sort({ createdAt: -1 }).limit(limite);

            if (transacoes.length === 0) {
                // Resposta alterada
                return await sock.sendMessage(m.key.remoteJid, { text: `❌ Nenhuma transação encontrada para sua busca.` }, { quoted: m });
            }

            let resposta = `*${titulo}*\n\n`;
            for (const t of transacoes) {
                const shortId = t.shortId || t._id.toString().slice(-5);
                const data = t.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const emoji = t.tipo === 'ganho' ? '🟢' : '🔴';
                const valor = t.valor.toFixed(2).replace('.', ',');
                
                resposta += `*ID: \`${shortId}\`* ${emoji} [${data}] R$ ${valor} - *${t.categoria}*`;
                if (t.descricao) {
                    resposta += ` _(${t.descricao})_`;
                }
                resposta += '\n';
            }

            // Resposta alterada
            await sock.sendMessage(m.key.remoteJid, { text: resposta }, { quoted: m });

        } catch (error) {
            console.error("Erro ao buscar extrato:", error);
            // Resposta alterada
            await sock.sendMessage(m.key.remoteJid, { text: "❌ Ocorreu um erro ao buscar suas transações." }, { quoted: m });
        }
    }
};