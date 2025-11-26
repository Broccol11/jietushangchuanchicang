import { GoogleGenAI, Type } from "@google/genai";
import { Asset, AssetCategory, AnalysisResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert file to Base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const parseHoldingsScreenshot = async (base64Image: string): Promise<Partial<Asset>[]> => {
  const model = "gemini-2.5-flash";

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg", // Assuming JPEG/PNG, logic handles base64 raw
            data: base64Image
          }
        },
        {
          text: `分析这张投资APP的持仓截图。提取所有可见的持仓信息。
                 返回一个 JSON 列表。
                 对于 'category' (类别)，请根据中文名称映射到以下英文枚举之一: Stock (股票), Fund (基金), Bond (债券), Crypto (数字货币), Cash (现金), Other (其他)。
                 对于 'amount' (金额)，提取数字总市值/总资产。
                 对于 'returnRate' (收益率)，提取百分比数值（正数或负数），例如 +5.5% 提取为 5.5。
                 对于 'currency' (货币)，假设截图中的货币符号（例如 USD, CNY, ¥），默认为 CNY。
                 对于 'name' (名称)，提取产品名称。`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            returnRate: { type: Type.NUMBER },
            currency: { type: Type.STRING }
          },
          required: ["name", "amount", "category"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) return [];

  try {
    const rawData = JSON.parse(text);
    // Sanitize and map to our types
    return rawData.map((item: any) => ({
      name: item.name || "未知资产",
      category: Object.values(AssetCategory).includes(item.category) ? item.category : AssetCategory.OTHER,
      amount: Number(item.amount) || 0,
      returnRate: Number(item.returnRate) || 0,
      currency: item.currency || "CNY",
      lastUpdated: new Date().toISOString()
    }));
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
};

export const generateWealthAnalysis = async (assets: Asset[]): Promise<AnalysisResponse> => {
  const model = "gemini-2.5-flash"; // Good enough for text analysis and faster

  // Map category to Chinese for better prompt context
  const categoryMap: Record<string, string> = {
      'Stock': '股票',
      'Fund': '基金',
      'Bond': '债券',
      'Crypto': '数字货币',
      'Cash': '现金',
      'Other': '其他'
  };

  const assetsSummary = assets.map(a => 
    `- ${a.name} (${categoryMap[a.category] || a.category}): ${a.amount} ${a.currency}, 收益率: ${a.returnRate}%`
  ).join('\n');

  const prompt = `
    你是一位服务高净值客户的资深财富管理专家。
    请分析以下客户的投资持仓组合：
    ${assetsSummary}

    请以 JSON 格式提供一份专业的中文分析报告，包含以下字段：
    1. assetAllocationAnalysis: 资产配置分析（分析当前的多元化程度和风险敞口）。
    2. investmentAdvice: 投资理财建议（基于市场趋势和此投资组合的综合建议）。
    3. adjustmentSuggestions: 持仓调整建议（优化投资组合的具体操作建议，如减少某类风险暴露）。

    语气要求：尊贵、专业、简洁、有深度。
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          assetAllocationAnalysis: { type: Type.STRING },
          investmentAdvice: { type: Type.STRING },
          adjustmentSuggestions: { type: Type.STRING }
        },
        required: ["assetAllocationAnalysis", "investmentAdvice", "adjustmentSuggestions"]
      }
    }
  });

   const text = response.text;
   if (!text) throw new Error("No analysis generated");
   return JSON.parse(text) as AnalysisResponse;
};