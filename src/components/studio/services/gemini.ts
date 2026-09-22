import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
  return new GoogleGenAI({ apiKey });
};

export const generateImage = async (
  prompt: string, 
  images: { data: string, mimeType: string }[], 
  model: string = "gemini-2.5-flash-image",
  aspectRatio: "1:1" | "9:16" | "16:9" | "3:4" | "4:3" = "1:1"
) => {
  const ai = getAI();
  const contents = {
    parts: [
      ...images.map(img => ({
        inlineData: { data: img.data, mimeType: img.mimeType }
      })),
      { text: prompt + " Maintain the exact pose, structure, and subject of the original reference image. Do not change the theme, only the artistic style." },
    ],
  };

  const response = await ai.models.generateContent({
    model: model as any,
    contents,
    config: {
      imageConfig: {
        aspectRatio
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const analyzeImage = async (prompt: string, base64Image: string, mimeType: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType } },
        { text: prompt },
      ],
    },
  });

  return response.text;
};
