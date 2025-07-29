// commands/rpg.js

// 1. CORRIJA O CAMINHO PARA O SEU FICHAHANDLER REAL
const fichaActions = require('../RPG/fichaHandler'); 

// A sua função rolarDados já está perfeita aqui.
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
    // 2. ADICIONE TODOS OS ALIASES NOVAMENTE
    aliases: [
        '!dados', '!criar-ficha', '!ficha', '!ficha-completa', '!set', '!apagar-ficha', 
        '!remover', '!rpg-ajuda', '!rpg-help', '!add', '!rmv', '!classes', 
        '!racas', '!addhab', '!rmvhab', '!addmagia', '!rmvmagia', 
        '!addataque', '!rmvataque', '!inventario'
    ],
    category: 'rpg',
    description: 'Comandos para o sistema de RPG.',
    
    async execute(sock, m, command, body) {
        const chatId = m.key.remoteJid;
        const commandArgs = body.split(' ');
        const bodyLower = body.toLowerCase();

        // Roteamento para !add= e !rmv=
        if (bodyLower.startsWith('!add=')) {
            return fichaActions.handleAddInventario(sock, m);
        }
        if (bodyLower.startsWith('!rmv=')) {
            return fichaActions.handleRmvInventario(sock, m);
        }

        // Roteamento para !dados e atalhos como !1d20
        const matchDadoRapido = command.match(/^!(\d+d\d+.*)$/i);
        if (command === '!dados' || matchDadoRapido) {
            const expressao = command === '!dados' ? commandArgs[1] : (matchDadoRapido ? matchDadoRapido[1] : '');
            if (!expressao) {
                return sock.sendMessage(chatId, { text: "Uso: `!dados <formato>` (ex: `!dados 2d20`)" }, { quoted: m });
            }
            const resultado = rolarDados(expressao);
            await sock.sendMessage(chatId, { text: resultado }, { quoted: m });
            return;
        }

        // 3. COMPLETE O SWITCH COM TODOS OS CASES DO SEU rpgHandler.js ANTIGO
        switch(command) {
            case '!rpg':
                const rpgHelpMessage = 
                    `*Bem-vindo ao Módulo de RPG do Bot!* ⚔️\n\n` +
                    `Este é seu assistente para gerenciar fichas e rolar dados.\n\n` +
                    `*--- Comandos de Ficha ---*\n` +
                    `• \`!criar-ficha\`: Cria sua ficha de personagem.\n` +
                    `• \`!ficha\`: Mostra sua ficha atual.\n` +
                    `• \`!ficha-completa\`: Exibe a ficha detalhada.\n` +
                    `• \`!set <atr>=<val>\`: Modifica um atributo (Ex: \`!set hp_atual=25\`).\n` +
                    `• \`!apagar-ficha\`: Apaga permanentemente sua ficha.\n\n` +
                    `*--- Comandos de Dados ---*\n` +
                    `• \`!dados <N>d<L>\`: Rola N dados de L lados (Ex: \`!dados 2d6\`).\n` +
                    `• \`!<N>d<L>\`: Atalho para rolar dados (Ex: \`!1d20\`).\n\n` +
                    `Para uma lista completa de comandos de inventário, habilidades, etc., use \`!rpg-ajuda\`.`;
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
            case '!remover': // Alias principal para !rmv
            case '!rmv':
                await fichaActions.handleRemoveItem(sock, m);
                break;
            case '!add':
                await fichaActions.handleAddItem(sock, m);
                break;
            case '!apagar-ficha':
                await fichaActions.handleApagarFicha(sock, m);
                break;
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
                // Você pode colocar a mensagem de ajuda detalhada aqui
                const ajudaDetalhada = `*Guia Completo - Módulo RPG* 📖\n\n... (sua mensagem de ajuda detalhada vai aqui) ...`;
                await sock.sendMessage(chatId, { text: ajudaDetalhada }, { quoted: m });
                break;
        }
    }
};