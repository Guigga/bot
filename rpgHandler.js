// controllers/rpgHandler.js

const fichaActions = require('../RPG/fichaHandler'); // Assumindo que este arquivo também será adaptado

// A função rolarDados não depende da biblioteca do WhatsApp, então não precisa de alterações.
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

// 1. A assinatura da função principal é atualizada
async function handleRpgCommand(sock, m, command, body) {
    const chatId = m.key.remoteJid;
    const commandArgs = body.split(' ');
    const bodyLower = body.toLowerCase();

    // --- ROTEAMENTO ---
    // A lógica interna permanece, mas as funções chamadas precisarão ser adaptadas
    if (bodyLower.startsWith('!add=')) {
        return fichaActions.handleAddInventario(sock, m); // Passa 'sock' e 'm'
    }
    if (bodyLower.startsWith('!rmv=')) {
        return fichaActions.handleRmvInventario(sock, m); // Passa 'sock' e 'm'
    }
    
    const matchDadoRapido = command.match(/^!(\d+d\d+.*)$/i);
    if (command === '!dados' || matchDadoRapido) {
        const expressao = command === '!dados' ? commandArgs[1] : matchDadoRapido[1];
        if (!expressao) {
            // 2. Todas as respostas são atualizadas para a sintaxe do Baileys
            return sock.sendMessage(chatId, { text: "Uso: `!dados <formato>` (ex: `!dados 2d20`)" }, { quoted: m });
        }
        const resultado = rolarDados(expressao);
        await sock.sendMessage(chatId, { text: resultado }, { quoted: m });
        return;
    }

    // O switch case agora passa 'sock' e 'm' para as funções de ficha
    switch(command) {
        case '!rpg':
            const rpgHelpMessage = `*Bem-vindo ao Módulo de RPG do Bot!* ⚔️\n\n... (mensagem de ajuda completa) ...`;
            await sock.sendMessage(chatId, { text: rpgHelpMessage }, { quoted: m });
            break;
        
        case '!criar-ficha':
            await fichaActions.handleCriarFicha(sock, m);
            break;
        case '!ficha':
            await fichaActions.handleVerFicha(sock, m);
            break;
        case '!ficha-completa':
            await fichaActions.handleVerFichaCompleta(sock, m);
            break;
        case '!set':
            await fichaActions.handleSetAtributo(sock, m);
            break;
        case '!remover':
            await fichaActions.handleRemoverItem(sock, m);
            break;
        case '!add':
            await fichaActions.handleAddItem(sock, m);
            break;
        case '!rmv':
            await fichaActions.handleRemoveItem(sock, m);
            break;
        case '!apagar-ficha':
            await fichaActions.handleApagarFicha(sock, m);
            break;
        // ... e assim por diante para todos os outros comandos de ficha ...
        case '!classes':
            await fichaActions.handleVerClasses(sock, m);
            break;
        case '!racas':
            await fichaActions.handleVerRacas(sock, m);
            break;
        case '!addhab':
            await fichaActions.handleAddHabilidade(sock, m);
            break;
        case '!rmvhab':
            await fichaActions.handleRmvHabilidade(sock, m);
            break;
        case '!addmagia':
            await fichaActions.handleAddMagia(sock, m);
            break;
        case '!rmvmagia':
            await fichaActions.handleRmvMagia(sock, m);
            break;
        case '!addataque':
            await fichaActions.handleAddAtaque(sock, m);
            break;
        case '!rmvataque':
            await fichaActions.handleRmvAtaque(sock, m);
            break;
        case '!inventario':
            await fichaActions.handleVerInventario(sock, m);
            break;
        case '!rpg-ajuda':
        case '!rpg-help':
            const ajudaDetalhada = `*Guia de Comandos - Módulo RPG* 📖\n\n... (mensagem de ajuda detalhada) ...`;
            await sock.sendMessage(chatId, { text: ajudaDetalhada }, { quoted: m });
            break;
    }
}

module.exports = { handleRpgCommand };