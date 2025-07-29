const { getDateForNextWeekday } = require('../utils/dateHelpers'); // Supondo que você moveu a função

describe('Testes do Módulo de Agenda', () => {
    it('deve retornar a data correta para a próxima terça-feira', () => {
        // Crie um cenário de teste aqui
        const hoje = new Date('2025-07-25T10:00:00.000Z'); // Sexta-feira
        const proximaTerca = getDateForNextWeekday('terca', hoje); // Modifique a função para aceitar a data atual como parâmetro para o teste ser determinístico

        expect(proximaTerca.getDay()).toBe(2); // 2 = Terça-feira
        expect(proximaTerca.getDate()).toBe(29);
        expect(proximaTerca.getMonth()).toBe(6); // 6 = Julho
    });
});