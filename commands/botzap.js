module.exports = {
    name: '!botzap',
    description: 'Exibe a mensagem de ajuda principal.',
    async execute(sock, m, command, body) {
        const botZapMessage =
            `*Como começar um jogo?*\n` +
            `Digite \`!jogo <nome do jogo>\`\n\n` +
            `*Jogos Disponíveis:*\n` +
            `• Poker\n• Truco\n• Forca\n• Velha\n• Uno\n• Xadrez\n\n` +
            `---\n\n` +
            `*Outros comandos:*\n` +
            `• \`!figurinha\` - Cria um sticker.\n` +
            `• \`!mega\` - Gera um jogo da Mega-Sena.\n` +
            `• \`!moeda\` - Joga cara ou coroa.\n` +
            `• \`!bicho\` - Resultado do jogo do bicho.\n` +
            `• \`!responda <pergunta>\` - Responde perguntas.\n` +
            `• \`!musica <nome>\` - Envia link de música.\n` +
            `• \`!rpg\` - Ajuda para o módulo de RPG.\n` +
            `• \`!sair\` - Encerra um jogo em andamento.\n\n` +
            `Vamos começar? 🎉`;
        
        await sock.sendMessage(m.key.remoteJid, { text: botZapMessage }, { quoted: m });
    }
};