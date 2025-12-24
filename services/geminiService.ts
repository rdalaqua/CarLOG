
import { GoogleGenAI } from "@google/genai";
import { Car, MaintenanceRecord } from "../types";

// Always use named parameter for apiKey and obtain it directly from process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMaintenanceInsights = async (car: Car, history: MaintenanceRecord[]) => {
  const prompt = `
    Analise o histórico de manutenção do seguinte veículo:
    Veículo: ${car.make} ${car.model} (${car.year})
    Quilometragem atual: ${car.currentMileage} km

    Histórico de Manutenções:
    ${history.map(h => `- ${h.date}: ${h.partName} (${h.type === 'REPLACEMENT' ? 'Troca' : 'Revisão'}) aos ${h.mileage} km`).join('\n')}

    Com base nesse histórico e na quilometragem, forneça:
    1. Uma avaliação geral da saúde do veículo.
    2. Sugestão das próximas 3 manutenções preventivas mais urgentes.
    3. Uma dica de economia ou cuidado específico para este modelo.

    Responda em português de forma concisa e amigável para um proprietário de carro.
  `;

  try {
    // Use ai.models.generateContent directly with model name and prompt contents.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    });

    // Extracting text output directly from the .text property of GenerateContentResponse.
    return response.text;
  } catch (error) {
    console.error("Erro ao obter insights do Gemini:", error);
    return "Desculpe, não consegui analisar o histórico agora. Tente novamente mais tarde.";
  }
};
