// commands/musica.js
const handleMusica = require('../controllers/musicaHandler');

module.exports = {
    name: '!musica',
    description: 'Busca o link de uma música no YouTube.',
    async execute(message, command, body, client) {
        const query = body.split(' ').slice(1).join(' ');
        return await handleMusica(message, client, query);
    }
};