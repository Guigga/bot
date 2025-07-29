// commands/relatorio.js

const Transacao = require('../models/Transacao');

module.exports = {
    name: '!relatorio',
    category: 'financas',
    description: 'Exibe um relatório financeiro por período.',
    aliases: ['!resumo'],

    // Assinatura da função alterada
    async execute(sock, m, command, body) {
        // Obtenção do ID do usuário padronizada
        const senderId = m.key.participant || m.key.remoteJid;
        const userId = senderId.split('@')[0];
        const args = body.split(' ').slice(1);
        const periodo = args[0];

        let inicioPeriodo, fimPeriodo, tituloPeriodo;

        // --- LÓGICA PARA DEFINIR O PERÍODO ---
        try {
            if (!periodo) {
                const hoje = new Date();
                inicioPeriodo = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
                const nomeMes = hoje.toLocaleString('pt-BR', { month: 'long' });
                tituloPeriodo = `de ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${hoje.getFullYear()}`;
            } else if (periodo.match(/^\d{2}\/\d{4}$/)) {
                const [mes, ano] = periodo.split('/');
                const mesNum = parseInt(mes) - 1;
                const anoNum = parseInt(ano);
                inicioPeriodo = new Date(anoNum, mesNum, 1);
                fimPeriodo = new Date(anoNum, mesNum + 1, 0, 23, 59, 59);
                const nomeMes = inicioPeriodo.toLocaleString('pt-BR', { month: 'long' });
                tituloPeriodo = `de ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${anoNum}`;
            } else if (periodo.match(/^\d{4}$/)) {
                const anoNum = parseInt(periodo);
                inicioPeriodo = new Date(anoNum, 0, 1);
                fimPeriodo = new Date(anoNum, 11, 31, 23, 59, 59);
                tituloPeriodo = `do ano de ${anoNum}`;
            } else {
                // Resposta alterada
                return await sock.sendMessage(m.key.remoteJid, { text: '❌ Formato de período inválido. Use:\n`!relatorio` (mês atual)\n`!relatorio MM/AAAA`\n`!relatorio AAAA`' }, { quoted: m });
            }
        } catch (e) {
            // Resposta alterada
            return await sock.sendMessage(m.key.remoteJid, { text: '❌ Data inválida. Verifique o mês e o ano informados.' }, { quoted: m });
        }

        try {
            const transacoes = await Transacao.find({
                userId: userId,
                createdAt: { $gte: inicioPeriodo, $lte: fimPeriodo }
            }).sort({ createdAt: 1 });

            if (transacoes.length === 0) {
                // Resposta alterada
                return await sock.sendMessage(m.key.remoteJid, { text: `Você não possui nenhuma transação registrada no período ${tituloPeriodo}.` }, { quoted: m });
            }

            let totalGanhos = 0, totalGastos = 0, saldo = 0;
            const gastosPorCategoria = {};

            transacoes.forEach(t => {
                if (t.tipo === 'ganho') totalGanhos += t.valor;
                else {
                    totalGastos += t.valor;
                    const categoria = t.categoria.charAt(0).toUpperCase() + t.categoria.slice(1);
                    gastosPorCategoria[categoria] = (gastosPorCategoria[categoria] || 0) + t.valor;
                }
            });
            saldo = totalGanhos - totalGastos;

            let resposta = `*Relatório Financeiro ${tituloPeriodo}* 💸\n\n`;
            resposta += `*Ganhos:* R$ ${totalGanhos.toFixed(2)} 🟢\n`;
            resposta += `*Gastos:* R$ ${totalGastos.toFixed(2)} 🔴\n`;
            resposta += `*Saldo:* R$ ${saldo.toFixed(2)} ${saldo >= 0 ? '🔵' : '⚫'}\n`;
            
            if (totalGastos > 0) {
                resposta += `\n*--- Gastos por Categoria ---*\n`;
                const categoriasOrdenadas = Object.entries(gastosPorCategoria).sort(([, a], [, b]) => b - a);
                for (const [categoria, valor] of categoriasOrdenadas) {
                    const percentual = (valor / totalGastos * 100).toFixed(1);
                    resposta += `• *${categoria}:* R$ ${valor.toFixed(2)} _(${percentual}%)_\n`;
                }
            }
            
            // Resposta alterada
            await sock.sendMessage(m.key.remoteJid, { text: resposta }, { quoted: m });

        } catch (error) {
            console.error("Erro ao gerar relatório:", error);
            // Resposta alterada
            await sock.sendMessage(m.key.remoteJid, { text: "❌ Ocorreu um erro ao buscar suas transações." }, { quoted: m });
        }
    }
};