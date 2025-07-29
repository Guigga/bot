// commands/agenda.js

const Compromisso = require('../models/Compromisso');

// Função helper (sem alterações)
function getDateForNextWeekday(weekday) {
    const weekdays = { 'domingo': 0, 'segunda': 1, 'terca': 2, 'terça': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6, 'sábado': 6 };
    const targetDay = weekdays[weekday.toLowerCase()];
    if (targetDay === undefined) return null;
    const today = new Date();
    const todayDay = today.getDay();
    let daysToAdd = targetDay - todayDay;
    if (daysToAdd <= 0) { daysToAdd += 7; }
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + daysToAdd);
    return targetDate;
}

module.exports = {
    name: '!agenda',
    aliases: ['!agendar', '!add-compromisso', '!compromissos', '!lembretes', '!apagar-compromisso', '!rmv-compromisso', '!ver', '!veragenda'],
    category: 'agenda',
    description: 'Gerencia seus compromissos e lembretes.',

    // Assinatura da função alterada
    async execute(sock, m, command, body) {
        const senderId = m.key.participant || m.key.remoteJid;
        const userId = senderId.split('@')[0];

        // --- ROTEADOR INTERNO DO MÓDULO DE AGENDA ---

        // AJUDA
        if (command === '!agenda') {
            // <-- TEXTO DE AJUDA PREENCHIDO
            const helpMessage =
                `*Módulo de Agenda* 🗓️\n\n` +
                `Gerencie seus compromissos e lembretes.\n\n` +
                `*Comandos Disponíveis:*\n` +
                `• \`!agendar <data> [hora] "título"\`: Adiciona um compromisso.\n` +
                `• \`!compromissos\`: Mostra seus próximos eventos.\n` +
                `• \`!apagar-compromisso <ID>\`: Remove um evento.\n\n` +
                `*Exemplos de uso para !agendar:*\n` +
                `\`!agendar 25/12 09:00 "Ceia de Natal"\`\n` +
                `\`!agendar terça 14:30 "Reunião de equipe"\``;
            return await sock.sendMessage(m.key.remoteJid, { text: helpMessage }, { quoted: m });
        }
        
        // ADICIONAR
        if (command === '!agendar' || command === '!add-compromisso') {
            const matchTitulo = body.match(/"([^"]+)"/);
            if (!matchTitulo) {
                return await sock.sendMessage(m.key.remoteJid, { text: '❌ Formato inválido! O título do compromisso precisa estar entre aspas.\nEx: `!agendar 25/12 18:00 "Amigo Secreto"`' }, { quoted: m });
            }
            // ... (lógica de parsing da data continua a mesma) ...
            const titulo = matchTitulo[1];
            const infoDataHora = body.replace(matchTitulo[0], '').trim().split(' ').slice(1).join(' ');
            let dataFinal;
            let hora = 9, minuto = 0;
            const hoje = new Date();
            let dia = hoje.getDate(), mes = hoje.getMonth(), ano = hoje.getFullYear();
            const matchHora = infoDataHora.match(/(\d{2}):(\d{2})/);
            if (matchHora) { hora = parseInt(matchHora[1]); minuto = parseInt(matchHora[2]); }
            const infoData = infoDataHora.replace(/(\d{2}):(\d{2})/, '').trim();
            if (infoData.match(/^\d{2}\/\d{2}\/\d{4}$/)) { [dia, mes, ano] = infoData.split('/').map(Number); mes -= 1; }
            else if (infoData.match(/^\d{2}\/\d{2}$/)) { [dia, mes] = infoData.split('/').map(Number); mes -= 1; }
            else if (infoData.match(/^\d{1,2}$/)) { dia = parseInt(infoData); }
            else if (/^[a-zA-Zçãáéíóú]+$/.test(infoData)) {
                const dataDiaSemana = getDateForNextWeekday(infoData);
                if (!dataDiaSemana) return await sock.sendMessage(m.key.remoteJid, { text: '❌ Dia da semana inválido.' }, { quoted: m });
                dia = dataDiaSemana.getDate(); mes = dataDiaSemana.getMonth(); ano = dataDiaSemana.getFullYear();
            } else if (!infoData && matchHora) {}
            else if (infoData) { return await sock.sendMessage(m.key.remoteJid, { text: '❌ Formato de data não reconhecido.' }, { quoted: m }); }
            dataFinal = new Date(ano, mes, dia, hora, minuto);
            if (isNaN(dataFinal.getTime())) { return await sock.sendMessage(m.key.remoteJid, { text: '❌ Data ou hora inválida. Verifique os valores.' }, { quoted: m }); }
            if (dataFinal < new Date()) { return await sock.sendMessage(m.key.remoteJid, { text: '❌ Você não pode agendar um compromisso no passado!' }, { quoted: m }); }

            try {
                const novoCompromisso = new Compromisso({ userId, titulo, dataHora: dataFinal });
                await novoCompromisso.save();
                const dataFormatada = dataFinal.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                await sock.sendMessage(m.key.remoteJid, { text: `✅ *Compromisso agendado!*\n\n*O quê:* ${titulo}\n*Quando:* ${dataFormatada}` }, { quoted: m });
            } catch (error) {
                console.error("Erro ao salvar compromisso:", error);
                await sock.sendMessage(m.key.remoteJid, { text: "❌ Ocorreu um erro ao salvar seu compromisso no banco de dados." }, { quoted: m });
            }
            return;
        }

        // VER
        if (['!compromissos', '!lembretes', '!ver', '!veragenda'].includes(command)) {
            try {
                const compromissos = await Compromisso.find({ userId: userId, dataHora: { $gte: new Date() } }).sort({ dataHora: 1 }).limit(10);
                if (compromissos.length === 0) {
                    return await sock.sendMessage(m.key.remoteJid, { text: "Você não tem nenhum compromisso futuro agendado. 🎉" }, { quoted: m });
                }
                let resposta = '*Seus próximos 10 compromissos:*\n\n';
                for (const c of compromissos) {
                    const shortId = c.shortId; 
                    const data = c.dataHora.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                    resposta += `*ID: \`${shortId}\`* 🗓️ [${data}] - *${c.titulo}*\n`;
                }
                resposta += '\nPara remover, use `!apagar-compromisso <ID_curto>`';
                await sock.sendMessage(m.key.remoteJid, { text: resposta }, { quoted: m });
            } catch (error) {
                console.error("Erro ao buscar compromissos:", error);
                await sock.sendMessage(m.key.remoteJid, { text: "❌ Ocorreu um erro ao buscar seus compromissos." }, { quoted: m });
            }
            return;
        }

        // APAGAR
        if (command === '!apagar-compromisso' || command === '!rmv-compromisso') {
            const shortId = body.split(' ')[1]?.toLowerCase();
            if (!shortId) {
                return await sock.sendMessage(m.key.remoteJid, { text: '❌ Formato inválido. Use `!apagar-compromisso <ID_curto>`.' }, { quoted: m });
            }
            try {
                // LÓGICA DE DELEÇÃO CORRETA E SIMPLIFICADA
                const compromissoApagado = await Compromisso.findOneAndDelete({
                    shortId: shortId,
                    userId: userId
                });

                if (!compromissoApagado) {
                    return await sock.sendMessage(m.key.remoteJid, { text: `❌ Nenhum compromisso encontrado com o ID \`${shortId}\`.` }, { quoted: m });
                }
                
                await sock.sendMessage(m.key.remoteJid, { text: `✅ Compromisso "*${compromissoApagado.titulo}*" apagado com sucesso!` }, { quoted: m });
                
            } catch (error) {
                console.error("Erro ao apagar compromisso:", error);
                await sock.sendMessage(m.key.remoteJid, { text: "❌ Ocorreu um erro ao tentar apagar o compromisso." }, { quoted: m });
            }
            return;
        }
    }
};