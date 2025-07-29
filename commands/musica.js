// commands/musica.js

const playdl = require('play-dl');

// A lógica do musicaHandler foi movida para cá
async function handleMusica(sock, m, query) {
    const chatId = m.key.remoteJid;
    if (!query) {
        return await sock.sendMessage(chatId, { text: '❌ Para buscar uma música, use: `!musica <nome da música>`' }, { quoted: m });
    }
    await sock.sendMessage(chatId, { text: `🎵 Procurando o link para: *${query}*...` }, { quoted: m });
    try {
        const videos = await playdl.search(query, { limit: 1, source: { youtube: "video" } });
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { text: '❌ Nenhum resultado encontrado no YouTube.' }, { quoted: m });
        }
        const video = videos[0];
        if (!video || !video.id) {
            return await sock.sendMessage(chatId, { text: '❌ Ocorreu um erro ao obter os detalhes do vídeo.' }, { quoted: m });
        }
        const replyMessage = `✅ Aqui está seu link:\n\n*${video.title}*\n${video.url}`;
        await sock.sendMessage(chatId, { text: replyMessage }, { quoted: m });
    } catch (err) {
        console.error('Erro ao buscar link da música:', err);
        await sock.sendMessage(chatId, { text: '❌ Desculpe, ocorreu um erro inesperado ao tentar buscar o link.' }, { quoted: m });
    }
}

module.exports = {
    name: '!musica',
    category: 'utilidades', // Adicionando categoria
    description: 'Busca o link de uma música no YouTube.',
    async execute(sock, m, command, body) {
        const query = body.split(' ').slice(1).join(' ');
        await handleMusica(sock, m, query);
    }
};