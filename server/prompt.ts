import type { AIRequest } from '../types';

const responseSchema = {
  type: 'OBJECT',
  properties: {
    message: {
      type: 'STRING',
      description: "Uma resposta amigável confirmando a geração da escala ou as alterações de design aplicadas.",
    },
    updatedEvents: {
      type: 'ARRAY',
      description: "Lista de eventos gerados ou atualizados.",
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          date: { type: 'STRING', description: "Formato AAAA-MM-DD" },
          type: {
            type: 'STRING',
            description: "Exatamente: 'Culto de Adoração', 'Culto Central', 'Culto Domiciliar / Pequenos Grupos' ou 'Outro'."
          },
          leader: { type: 'STRING' },
          preacher: { type: 'STRING' },
          notes: { type: 'STRING' },
          customTitle: { type: 'STRING' },
        },
        required: ["id", "date", "type", "leader", "preacher"],
      },
    },
    deletedEventIds: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    suggestedMonth: {
      type: 'STRING',
      description: "Mês atual ou sugerido no formato AAAA-MM",
    },
    updatedConfig: {
      type: 'OBJECT',
      description: "Alterações de cores ou fontes se solicitado explicitamente.",
      properties: {
        headerBgColor: { type: 'STRING' },
        headerTextColor: { type: 'STRING' },
        gridBorderColor: { type: 'STRING' },

        colorAdoracaoTitle: { type: 'STRING' },
        colorAdoracaoText: { type: 'STRING' },
        bgColorAdoracao: { type: 'STRING' },

        colorCentralTitle: { type: 'STRING' },
        colorCentralText: { type: 'STRING' },
        bgColorCentral: { type: 'STRING' },

        colorDomiciliarTitle: { type: 'STRING' },
        colorDomiciliarText: { type: 'STRING' },
        bgColorDomiciliar: { type: 'STRING' },

        fontSizeTitle: { type: 'NUMBER' },
        fontSizeMonth: { type: 'NUMBER' },
        fontSizeVerse: { type: 'NUMBER' },
        backgroundImageUrl: { type: 'STRING' },
      }
    }
  },
  required: ["message", "suggestedMonth"],
};


export function buildGroqRequest(input: AIRequest, model = 'llama-3.3-70b-versatile') {
  const { allEvents, availablePeople, currentConfig, command, attachment } = input;
  const currentMonthStr = input.currentMonth;
  const pastEvents = allEvents
    .filter(e => (e.leader || e.preacher) && e.date < `${currentMonthStr}-01`)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-35);

  const systemInstruction = `
    Você é o Assistente Especialista da Igreja Batista em São José do Divino - PI.

    REGRAS DA IGREJA:
    1. O PASTOR E PREGADOR:
       - O Pastor Lourival ("Pr. Lourival") é o pastor titular e atua como PREGADOR nos Cultos de Adoração (Domingos) e Cultos Centrais (Quartas).
       - O Pr. Lourival NUNCA deve ser colocado como DIRIGENTE de culto.

    2. CULTOS DE SEXTA-FEIRA (DOMICILIAR / PEQUENOS GRUPOS):
       - Nas sextas-feiras NÃO é necessário colocar dirigente nem pregador.
       - Deixe leader: "" e preacher: "", e notes: "PGMs". Tipo: "Culto Domiciliar / Pequenos Grupos".

    3. DISPONIBILIDADE E PERFIL DE DIRIGENTES (PADRÃO HISTÓRICO DA IGREJA):
       - QUARTAS-FEIRAS (Culto Central): Amparo, Jovana, Francisca Alves, Antonia Maria, Maria José, Diomar, Jesus, Ryan.
         * Importante: Amparo, Jovana, Francisca Alves e Antonia Maria dirigem nas quartas e NÃO devem ser escaladas para domingo.
       - DOMINGOS (Culto de Adoração): Teresa, Raquel, Maria José, Jesus, Nayana, Diomar, Ataniel, Ryan, Fco. Antonio (Francisco Antonio), Filho.
         * Importante: Raquel, Teresa, Ataniel, Fco. Antonio e Filho dirigem preferencialmente aos domingos.
       - REVEZAMENTO MISTO: Diomar, Maria José, Jesus e Ryan têm flexibilidade e revezam entre domingos e quartas.

    4. REVEZAMENTO JUSTO, EQUILIBRADO E INTELIGENTE:
       - Distribua os cultos de forma harmônica entre os voluntários disponíveis: ${JSON.stringify(availablePeople)}.
       - NUNCA sobrecarregue poucas pessoas enquanto outras ficam com zero escalas no mês.
       - NUNCA escale a mesma pessoa para dirigir em cultos seguidos (ex: quarta e domingo seguinte).
       - Em um mesmo culto, o dirigente e o pregador devem ser pessoas diferentes.

    5. APRENDIZADO COM O HISTÓRICO DAS ESCALAS ANTERIORES:
       - Analise o histórico recente fornecido abaixo para manter a continuidade do trabalho.
       - Dê prioridade no novo mês para voluntários que atuaram menos ou estão há mais tempo sem dirigir.

    6. HISTÓRICO DE ESCALAS ANTERIORES NO SISTEMA:
    ${pastEvents.length > 0 ? JSON.stringify(pastEvents.map(e => ({ data: e.date, tipo: e.type, dirigente: e.leader, pregador: e.preacher, titulo: e.customTitle || '' }))) : "Nenhum histórico anterior registrado ainda."}

    7. PRESERVAÇÃO DE TEXTOS E DESIGN:
       - Os textos de Título ("DIREÇÃO DOS CULTOS"), Subtítulo ("I IGREJA BATISTA EM SÃO JOSÉ DO DIVINO - PI"), Versículo e Rodapé são fixos da igreja.
       - Se o usuário pedir alterações visuais ou temas, modifique apenas 'updatedConfig'.

    Contexto Atual:
    Mês da escala: ${currentMonthStr}
    Eventos existentes (preserve IDs ao editar; não duplique datas e tipos): ${JSON.stringify(allEvents)}
    Pessoas disponíveis: ${JSON.stringify(availablePeople)}
    Design atual: ${JSON.stringify(currentConfig)}

    Responda em Português e retorne APENAS o JSON conforme o schema.
  `;



  return {
    model,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: [
        ...(attachment ? [{ type: 'image_url', image_url: { url: `data:${attachment.mimeType};base64,${attachment.data}` } }] : []),
        { type: 'text', text: command || 'Extraia os dados desta escala para o sistema.' }
      ] }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 8192
  };
}
