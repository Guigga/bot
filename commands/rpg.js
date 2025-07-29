// commands/rpg.js

const fichaActions = require('../models/Ficha'); // Supondo que a lógica da ficha esteja em models

function rolarDados(expressao) {
    const match = expressao.toLowerCase().match(/(\d+)d(\d+)\s*([+-]\s*\d+)?/);
    if (!match) return "Formato inválido. 😕\nUse `NdX` ou `NdX+Y` (ex: `1d6`, `2d20+5`).";
    const numeroDeDados = parseInt(match[1]);
    const ladosDoDado = parseInt(match[2]);
    const modificador = match[3] ? parseInt(match[3].replace(/\s/g, '')) : 0;
    if (numeroDeDados <= 0 || ladosDoDado <= 0) return "❌ O número de dados e de lados deve ser maior que zero.";
    if (numeroDeDados > 10000) return `❌ Limite de 10.000 dados por rolagem excedido.`;
    if (ladosDoDado > 100000000000) return `❌ O limite de lados do dado é de 100.000.000.000`;
    if (Math.abs(modificador) > 1000000) return `❌ O modificador não pode ser maior que 1.000.000.`;
    const resultados = [];
    let soma = 0;
    for (let i = 0; i < numeroDeDados; i++) {
        const resultado = Math.floor(Math.random() * ladosDoDado) + 1;
        resultados.push(resultado);
        soma += resultado;
    }
    const somaFinal = soma + modificador;
    const textoDados = numeroDeDados === 1 ? 'Dado' : 'Dados';
    const textoLados = ladosDoDado === 1 ? 'Lado' : 'Lados';
    let resposta = `Rolando *${numeroDeDados}* ${textoDados} de *${ladosDoDado}* ${textoLados}...\n\n`;
    let detalhesSoma = `*Soma Total: ${somaFinal}*`;
    if (modificador !== 0 && Math.abs(modificador) < 1000000) {
        const sinalModificador = modificador > 0 ? `+ ${modificador}` : `- ${Math.abs(modificador)}`;
        detalhesSoma = `*Soma Total: ${soma} (${sinalModificador}) = ${somaFinal}*`;
    }
    if (numeroDeDados <= 50) {
        resposta += `Resultados: [${resultados.join(', ')}] 🎲\n\n${detalhesSoma}`;
    } else {
        resposta += `${detalhesSoma} 🎲\n\n(Resultados individuais omitidos para mais de 50 dados)`;
    }
    return resposta;
}

module.exports = {
    name: '!rpg',
    aliases: ['!dados', '!criar-ficha', '!ficha', '!set', /* ...adicione todos os outros aliases de RPG aqui... */],
    category: 'rpg',
    description: 'Comandos para o sistema de RPG.',
    
    async execute(sock, m, command, body) {
        const chatId = m.key.remoteJid;
        const commandArgs = body.split(' ');

        const matchDadoRapido = command.match(/^!(\d+d\d+.*)$/i);
        if (command === '!dados' || matchDadoRapido) {
            const expressao = command === '!dados' ? commandArgs[1] : matchDadoRapido[1];
            if (!expressao) {
                return sock.sendMessage(chatId, { text: "Uso: `!dados <formato>` (ex: `!dados 2d20`)" }, { quoted: m });
            }
            const resultado = rolarDados(expressao);
            await sock.sendMessage(chatId, { text: resultado }, { quoted: m });
            return;
        }

        // Aqui você chamaria as funções de ficha, passando sock e m
        switch(command) {
            case '!rpg':
                // Coloque sua mensagem de ajuda do RPG aqui
                const rpgHelpMessage = `*Bem-vindo ao Módulo de RPG do Bot!* ⚔️\n\n... (resto da mensagem de ajuda) ...`;
                await sock.sendMessage(chatId, { text: rpgHelpMessage }, { quoted: m });
                break;
            case '!criar-ficha':
                // await fichaActions.handleCriarFicha(sock, m);
                break;
            // ... adicione os outros cases para os comandos de RPG
        }
    }
};