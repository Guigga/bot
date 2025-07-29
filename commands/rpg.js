// commands/rpg.js
const rpgHandler = require('../controllers/rpgHandler');

module.exports = {
    name: '!rpg',
    aliases: [
        '!dados', '!criar-ficha', '!ficha', '!ficha-completa', '!set', '!apagar-ficha', 
        '!remover', '!rpg-ajuda', '!rpg-help', '!add', '!rmv', '!classes', 
        '!racas', '!addhab', '!rmvhab', '!addmagia', '!rmvmagia', 
        '!addataque', '!rmvataque', '!inventario'
    ],
    description: 'Módulo de comandos para o sistema de RPG.',
    async execute(message, command, body) {
        // A lógica de atalho para dados (ex: !1d20) será tratada no commandHandler.
        await rpgHandler.handleRpgCommand(message);
    }
};