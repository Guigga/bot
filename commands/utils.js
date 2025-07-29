// commands/uteis.js
module.exports = {
    name: '!id',
    aliases: ['!debug', '!moeda', '!bicho', '!responda'],
    category: 'utilidades',
    description: 'Comandos utilitários diversos.',
    
    // ALTERAÇÃO 1: Assinatura da função
    async execute(sock, m, command, body) {
        // ALTERAÇÃO 2: Obter o ID do chat a partir do objeto 'm'
        const chatId = m.key.remoteJid;

        switch (command) {
            case '!id':
                // ALTERAÇÃO 3: Usar sock.sendMessage para responder
                await sock.sendMessage(chatId, { text: `O ID deste chat é:\n\`${chatId}\`` }, { quoted: m });
                break;
            
            case '!debug':
                console.log('===== OBJETO MESSAGE COMPLETO =====');
                console.log(m); // Alterado de 'message' para 'm'
                console.log('=================================');
                await sock.sendMessage(chatId, { text: 'O objeto da mensagem foi impresso no console do bot. 😉' }, { quoted: m });
                break;

            case '!moeda':
                await sock.sendMessage(chatId, { text: 'Jogando a moeda... 🪙' }, { quoted: m });
                const resultado = Math.random() < 0.5 ? 'Cara' : 'Coroa';
                const emoji = resultado === 'Cara' ? '🗿' : '👑';
                await sock.sendMessage(chatId, { text: `Deu *${resultado}*! ${emoji}` }, { quoted: m });
                break;
            
            case '!bicho':
                const animais = ['Avestruz G1', 'Águia G2', 'Burro G3', 'Borboleta G4', 'Cachorro G5', 'Cabra G6', 'Carneiro G7', 'Camelo G8', 'Cobra G9', 'Coelho G10', 'Cavalo G11', 'Elefante G12', 'Galo G13', 'Gato G14', 'Jacaré G15', 'Leão G16', 'Macaco G17', 'Porco G18', 'Pavão G19', 'Peru G20', 'Touro G21', 'Tigre G22', 'Urso G23', 'Veado G24', 'Vaca G25'];
                const sorteado = animais[Math.floor(Math.random() * animais.length)];
                await sock.sendMessage(chatId, { text: `O resultado de hoje é: *${sorteado}*` }, { quoted: m });
                break;

            case '!responda':
                const respostas = ["Sim.", "Não.", "Com certeza!", "Definitivamente não.", "Talvez.", "Os astros indicam que sim.", "Concentre-se e pergunte de novo.", "Não conte com isso."];
                const respostaMistica = respostas[Math.floor(Math.random() * respostas.length)];
                await sock.sendMessage(chatId, { text: `O Finanzap responde:\n\n*${respostaMistica}*` }, { quoted: m });
                break;
        }
    }
};