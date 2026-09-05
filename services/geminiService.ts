
import { GoogleGenAI, Type } from "@google/genai";
import { ChurchEvent, ServiceType, AIResponse, UIConfig } from '../types';

const getAIClient = () => {
  const apiKey = process.env.API_KEY || (typeof localStorage !== 'undefined' ? localStorage.getItem('cultogen_gemini_api_key') : '') || '';
  if (!apiKey || apiKey === 'undefined') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    message: {
      type: Type.STRING,
      description: "Uma resposta amigável confirmando a geração da escala ou as alterações de design aplicadas.",
    },
    updatedEvents: {
      type: Type.ARRAY,
      description: "Lista de eventos gerados ou atualizados.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          date: { type: Type.STRING, description: "Formato AAAA-MM-DD" },
          type: { 
            type: Type.STRING, 
            description: "Exatamente: 'Culto de Adoração', 'Culto Central', 'Culto Domiciliar / Pequenos Grupos' ou 'Outro'." 
          },
          leader: { type: Type.STRING },
          preacher: { type: Type.STRING },
          notes: { type: Type.STRING },
          customTitle: { type: Type.STRING },
        },
        required: ["id", "date", "type", "leader", "preacher"],
      },
    },
    deletedEventIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    suggestedMonth: {
      type: Type.STRING,
      description: "Mês atual ou sugerido no formato AAAA-MM",
    },
    updatedConfig: {
      type: Type.OBJECT,
      description: "Alterações de cores ou fontes se solicitado explicitamente.",
      properties: {
        headerBgColor: { type: Type.STRING },
        headerTextColor: { type: Type.STRING },
        gridBorderColor: { type: Type.STRING },
        
        colorAdoracaoTitle: { type: Type.STRING },
        colorAdoracaoText: { type: Type.STRING },
        bgColorAdoracao: { type: Type.STRING },
        
        colorCentralTitle: { type: Type.STRING },
        colorCentralText: { type: Type.STRING },
        bgColorCentral: { type: Type.STRING },
        
        colorDomiciliarTitle: { type: Type.STRING },
        colorDomiciliarText: { type: Type.STRING },
        bgColorDomiciliar: { type: Type.STRING },
        
        fontSizeTitle: { type: Type.NUMBER },
        fontSizeMonth: { type: Type.NUMBER },
        fontSizeVerse: { type: Type.NUMBER },
        backgroundImageUrl: { type: Type.STRING },
      }
    }
  },
  required: ["message", "suggestedMonth"],
};

export const processCommand = async (
  command: string, 
  allEvents: ChurchEvent[], 
  currentMonth: Date,
  availablePeople: string[],
  currentConfig: UIConfig,
  attachment?: { data: string; mimeType: string }
): Promise<AIResponse> => {
  const currentMonthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  
  // Extrai histórico recente das escalas anteriores para a IA aprender continuidade e revezamento
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
    Pessoas disponíveis: ${JSON.stringify(availablePeople)}
    Design atual: ${JSON.stringify(currentConfig)}

    Responda em Português e retorne APENAS o JSON conforme o schema.
  `;

  try {
    const ai = getAIClient();
    if (!ai) {
      return {
        message: "Chave da API Gemini não configurada. Defina GEMINI_API_KEY no arquivo .env.local para usar o assistente.",
        suggestedMonth: currentMonthStr
      };
    }

    const contents = [];
    if (attachment) {
      contents.push({
        parts: [
          { inlineData: { data: attachment.data, mimeType: attachment.mimeType } },
          { text: command || "Extraia os dados desta escala para o sistema." }
        ]
      });
    } else {
      contents.push({ parts: [{ text: command }] });
    }

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash", 
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.2, 
        },
      });
    } catch (flashError: any) {
      console.warn("Tentando fallback com gemini-3-flash-preview devido a:", flashError?.message || flashError);
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.2, 
        },
      });
    }

    return JSON.parse(response.text.trim()) as AIResponse;
  } catch (error) {
    console.error("Gemini Error:", error);
    return { 
      message: "Erro técnico na IA ao gerar escala. Verifique sua chave de API e conexão.",
      suggestedMonth: currentMonthStr
    };
  }
};
