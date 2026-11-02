import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_ID = 'gemini-3.8-flash';

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error('GEMINI_API_KEY_NOT_CONFIGURED');
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(error: unknown, lang: string): { status: number; message: string } {
  const rawMsg = error instanceof Error ? error.message : String(error);
  const lower = rawMsg.toLowerCase();

  if (
    rawMsg === 'GEMINI_API_KEY_NOT_CONFIGURED' ||
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied') ||
    lower.includes('api key not valid') ||
    lower.includes('403')
  ) {
    return {
      status: 403,
      message:
        lang === 'ne'
          ? 'API कुञ्जी भेटिएन वा अमान्य छ। कृपया Settings > Secrets प्यानलमा गई API कुञ्जी जाँच गर्नुहोस्।'
          : 'API key is missing or invalid. Please check or select your key in the Settings > Secrets panel.',
    };
  }

  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      status: 429,
      message:
        lang === 'ne'
          ? 'API कोटा सीमा पूरा भयो। कोटा बढाउन Settings > Secrets प्यानलमा बिलिङ सक्षम गरिएको API कुञ्जी प्रयोग गर्न सकिन्छ।'
          : 'API quota reached. Upgrading to a paid tier increases your quota—you can select a billing-enabled API key in Settings > Secrets.',
    };
  }

  return {
    status: 500,
    message:
      lang === 'ne'
        ? `AI सेवामा अस्थायी समस्या आयो: ${rawMsg}`
        : `AI Assistant encountered an error: ${rawMsg}`,
  };
}

interface ChatTurnInput {
  role: 'user' | 'model';
  text: string;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // 1. Conversational Household AI Advisor
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    const lang = req.body?.language === 'en' ? 'en' : 'ne';
    try {
      const message = String(req.body?.message || '').trim();
      const history: ChatTurnInput[] = Array.isArray(req.body?.history) ? req.body.history : [];
      const householdContext = req.body?.householdContext
        ? JSON.stringify(req.body.householdContext, null, 2)
        : null;

      if (!message) {
        res.status(400).json({
          error: lang === 'ne' ? 'कृपया प्रश्न लेख्नुहोस्।' : 'Please enter a message.',
        });
        return;
      }

      const ai = createGeminiClient();

      const systemInstruction = [
        'You are the official Help & Smart AI Assistance center inside "Digital Home Nepal", an all-in-one family finance, bills, shopping, chores, calendar, and home maintenance platform designed for Nepali families.',
        'You help users in two ways: (1) App Help & How-To Support — guiding users clearly through Digital Home Nepal features: Dashboard quick actions, Home Finance ledger with 80%+ monthly budget alerts, Per-Category Budget Limits ("Category Limits" button in Home Finance), Camera & Photo "Scan Receipt" auto-parsing, Bills & Reminders (NEA, KUKL, WorldLink, school fees), Smart Shopping Lists, Family Tasks, Family Calendar (distinguishing verified Gregorian dates from manual festivals), Home Maintenance reminders, Reports (CSV export & Print), and Settings (Nepali/English toggle, NPR/AUD/USD display symbol, Light/Dark theme, JSON Backup & Restore, Demo Data controls); and (2) Live Household Financial & Planning Advice based on their real saved household data.',
        `Respond primarily in ${lang === 'ne' ? 'natural, warm, easy-to-read Nepali (Devanagari)' : 'clear, friendly English'}, unless the user explicitly asks in another language.`,
        'Keep responses concise (under 220 words), practical, and well-structured with short paragraphs or clean bullet points.',
        'Base any numerical observations strictly on the provided household context JSON. Never invent Bikram Sambat (BS) calendar dates or fabricate fake transactions.',
        householdContext
          ? `Current Household Context (live data from user device):\n${householdContext}`
          : 'Note: The user chose not to attach live household data for this query. Provide helpful app guidance or general Nepali household management advice.',
      ].join('\n\n');

      const formattedContents = [
        ...history.slice(-8).map((turn) => ({
          role: turn.role === 'model' ? 'model' : 'user',
          parts: [{ text: String(turn.text || '') }],
        })),
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ];

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: formattedContents,
        config: {
          systemInstruction,
        },
      });

      res.json({
        reply: (response.text ?? '').trim(),
      });
    } catch (err) {
      const formatted = formatGeminiError(err, lang);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 2. Natural-Language Smart Quick-Entry Parser (Structured JSON)
  app.post('/api/ai/parse-entry', async (req: Request, res: Response) => {
    const lang = req.body?.language === 'en' ? 'en' : 'ne';
    try {
      const text = String(req.body?.text || '').trim();
      const todayISO = String(req.body?.todayISO || new Date().toISOString().slice(0, 10));
      const currency = String(req.body?.currency || 'NPR');
      const memberNames: string[] = Array.isArray(req.body?.memberNames)
        ? req.body.memberNames
        : [];

      if (!text) {
        res.status(400).json({
          error:
            lang === 'ne'
              ? 'कृपया टिपोट वा वाक्य लेख्नुहोस्।'
              : 'Please enter a sentence to parse.',
        });
        return;
      }

      const ai = createGeminiClient();

      const systemInstruction = [
        `You extract structured household entries from natural Nepali or English text for Digital Home Nepal. Today's verified Gregorian ISO date is ${todayISO}. Active currency is ${currency}.`,
        `Known family members: ${memberNames.length > 0 ? memberNames.join(', ') : 'None specified'}.`,
        'Map each detected item into one of these entryType values: "expense", "income", "bill", "shopping", "task", "event", or "maintenance".',
        'Valid financeCategory values: Food, Rent, Education, Health, Transport, Shopping, Electricity, Water, Internet, Salary, Business, Other.',
        'Valid paymentMethod values: "Cash", "eSewa / Khalti", "Bank Transfer", "Card", "Cheque".',
        'Valid billCategory values: electricity, water, internet, telephone, rent, school_fees, other.',
        'Valid shoppingCategory values: groceries, vegetables, dairy, household, festival, health, other.',
        'Valid taskPriority values: high, medium, low.',
        'Valid eventCategory values: birthday, anniversary, school, appointment, festival, gathering.',
        'Valid maintenanceCategory values: cleaning, plumbing, electricity, painting, appliance, gardening, repairs.',
        'Always output valid YYYY-MM-DD Gregorian dates relative to todayISO. If no date is mentioned, use todayISO.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: text,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'Short friendly confirmation in the user language.',
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    entryType: {
                      type: Type.STRING,
                      description:
                        'One of: expense, income, bill, shopping, task, event, maintenance',
                    },
                    title: {
                      type: Type.STRING,
                      description: 'Concise title or product name',
                    },
                    amount: {
                      type: Type.NUMBER,
                      description: 'Numeric amount, price, or cost (0 if not applicable)',
                    },
                    date: {
                      type: Type.STRING,
                      description: 'YYYY-MM-DD Gregorian date',
                    },
                    financeCategory: {
                      type: Type.STRING,
                      description: 'Category if expense or income',
                    },
                    paymentMethod: {
                      type: Type.STRING,
                      description: 'Payment method if expense or income',
                    },
                    provider: {
                      type: Type.STRING,
                      description: 'Provider name if bill',
                    },
                    billCategory: {
                      type: Type.STRING,
                      description: 'Category if bill',
                    },
                    quantity: {
                      type: Type.STRING,
                      description: 'Quantity string if shopping item, e.g. 2 kg',
                    },
                    shoppingCategory: {
                      type: Type.STRING,
                      description: 'Category if shopping item',
                    },
                    assignedMemberName: {
                      type: Type.STRING,
                      description: 'Matched family member name if task',
                    },
                    taskPriority: {
                      type: Type.STRING,
                      description: 'high, medium, or low if task',
                    },
                    eventCategory: {
                      type: Type.STRING,
                      description: 'Category if calendar event',
                    },
                    maintenanceCategory: {
                      type: Type.STRING,
                      description: 'Category if maintenance item',
                    },
                    note: {
                      type: Type.STRING,
                      description: 'Optional extra context or location',
                    },
                  },
                  required: ['entryType', 'title', 'amount', 'date'],
                },
              },
            },
            required: ['summary', 'items'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      const formatted = formatGeminiError(err, lang);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 3. AI Monthly Household Briefing & Action Plan (Structured JSON)
  app.post('/api/ai/monthly-plan', async (req: Request, res: Response) => {
    const lang = req.body?.language === 'en' ? 'en' : 'ne';
    try {
      const householdContext = req.body?.householdContext || {};
      const ai = createGeminiClient();

      const systemInstruction = [
        'You are a senior Nepali family financial & home advisor inside Digital Home Nepal.',
        `Write all output text in ${lang === 'ne' ? 'natural, warm Nepali (Devanagari)' : 'clear, practical English'}.`,
        'Analyze the exact numbers in the household JSON context (monthly budget, current spending, >80% budget warnings, unpaid/overdue bills, shopping lists, tasks, and maintenance) and produce realistic, concrete guidance without inventing fake facts.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: `Generate a structured monthly household action plan for this household data:\n${JSON.stringify(
          householdContext,
          null,
          2
        )}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: {
                type: Type.STRING,
                description: '1-sentence motivating assessment of the household this month.',
              },
              budgetHealthSummary: {
                type: Type.STRING,
                description: '2-3 sentence analysis of income, expenses, and budget pace.',
              },
              savingsTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 specific, practical ways this family can optimize expenses.',
              },
              thisWeekPriorities: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3-4 immediate action items across bills, tasks, or maintenance.',
              },
            },
            required: [
              'headline',
              'budgetHealthSummary',
              'savingsTips',
              'thisWeekPriorities',
            ],
          },
        },
      });

      const plan = JSON.parse((response.text ?? '{}').trim());
      res.json(plan);
    } catch (err) {
      const formatted = formatGeminiError(err, lang);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 4. Multimodal Receipt / Bill Camera Scanner (Structured JSON for FinanceView)
  app.post('/api/ai/scan-receipt', async (req: Request, res: Response) => {
    const lang = req.body?.language === 'en' ? 'en' : 'ne';
    try {
      const rawImage = String(req.body?.imageBase64 || '').trim();
      const mimeType = String(req.body?.mimeType || 'image/jpeg').trim();
      const todayISO = String(req.body?.todayISO || new Date().toISOString().slice(0, 10));
      const currency = String(req.body?.currency || 'NPR');

      const cleanBase64 = rawImage.includes(',') ? rawImage.split(',')[1] : rawImage;

      if (!cleanBase64) {
        res.status(400).json({
          error:
            lang === 'ne'
              ? 'कृपया रसिद वा बिलको फोटो खिच्नुहोस् वा अपलोड गर्नुहोस्।'
              : 'Please capture or select a receipt image first.',
        });
        return;
      }

      const ai = createGeminiClient();

      const systemInstruction = [
        `You are an accurate receipt and utility bill OCR & financial categorization engine for "Digital Home Nepal".`,
        `Today's verified Gregorian ISO date is ${todayISO}. Display currency preference is ${currency}.`,
        'Carefully inspect the receipt, invoice, POS slip, handwritten shop bill, or digital payment screenshot (eSewa, Khalti, Fonepay, bank transfer, NEA electricity, KUKL water, ISP, supermarket, pharmacy, school fee, restaurant, etc.).',
        'Extract the final grand total / payable numeric amount into totalAmount (do not convert currencies; extract the exact number printed on the bill).',
        'Map category strictly to ONE of these exact FinanceCategory values: "Food", "Rent", "Education", "Health", "Transport", "Shopping", "Electricity", "Water", "Internet", "Salary", "Business", "Other".',
        'Category mapping hints: groceries/restaurants/bakery/dairy/vegetables/meat -> "Food"; clothes/electronics/appliances/general store -> "Shopping"; NEA/power -> "Electricity"; water/jar/tanker/KUKL -> "Water"; ISP/WorldLink/Vianet/Ntc fiber -> "Internet"; hospital/clinic/medicine/pharmacy -> "Health"; fuel/petrol/ride/bus/flight -> "Transport"; school/college/tuition/books -> "Education".',
        'Map paymentMethod strictly to ONE of: "Cash", "eSewa / Khalti", "Bank Transfer", "Card", "Cheque". Default to "Cash" if unspecified.',
        `Date rule: Never invent Bikram Sambat to Gregorian date conversions. If a clear Gregorian (AD) date is printed on the receipt, output it as YYYY-MM-DD. If undated or printed only in Bikram Sambat (BS, e.g., 2081/2082/2083), output "${todayISO}" for date and mention the printed BS date inside note.`,
        `Write title, summary, and note in ${lang === 'ne' ? 'natural Nepali (keep well-known brand/merchant names clear)' : 'clear English'}.`,
        'If the image does not show a readable receipt, bill, or financial document, set isReadableReceipt to false and explain politely in summary.',
      ].join('\n');

      const imagePart = {
        inlineData: {
          mimeType: mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
          data: cleanBase64,
        },
      };

      const textPart = {
        text: 'Extract the structured receipt details, total amount, category, payment method, date, and line items from this image.',
      };

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: { parts: [imagePart, textPart] },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isReadableReceipt: {
                type: Type.BOOLEAN,
                description: 'True if a receipt, bill, invoice, or payment slip with readable details is visible.',
              },
              summary: {
                type: Type.STRING,
                description: 'Short friendly status or confirmation message in the requested language.',
              },
              merchant: {
                type: Type.STRING,
                description: 'Store, vendor, or utility provider name.',
              },
              title: {
                type: Type.STRING,
                description: 'Concise ledger description (e.g., merchant + main purchase type).',
              },
              totalAmount: {
                type: Type.NUMBER,
                description: 'Final grand total numeric amount on the receipt (0 if unreadable).',
              },
              type: {
                type: Type.STRING,
                description: 'Either "expense" or "income". Almost all receipts/bills are "expense".',
              },
              category: {
                type: Type.STRING,
                description:
                  'One of: Food, Rent, Education, Health, Transport, Shopping, Electricity, Water, Internet, Salary, Business, Other',
              },
              date: {
                type: Type.STRING,
                description: 'YYYY-MM-DD Gregorian date.',
              },
              paymentMethod: {
                type: Type.STRING,
                description: 'One of: Cash, eSewa / Khalti, Bank Transfer, Card, Cheque',
              },
              note: {
                type: Type.STRING,
                description: 'Concise receipt memo (invoice number, key items, or printed BS date if any).',
              },
              lineItems: {
                type: Type.ARRAY,
                description: 'Up to 8 key individual line items visible on the receipt.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                  },
                  required: ['name', 'amount'],
                },
              },
            },
            required: [
              'isReadableReceipt',
              'summary',
              'merchant',
              'title',
              'totalAmount',
              'type',
              'category',
              'date',
              'paymentMethod',
              'note',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      const formatted = formatGeminiError(err, lang);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Digital Home Nepal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
