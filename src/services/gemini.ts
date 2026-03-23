import { GoogleGenAI, Type } from "@google/genai";
import * as mammoth from "mammoth";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type AppMode = 'работа' | 'проверка' | 'заполнение';
export type ClientDataType = 'passport' | 'companyCard' | 'inn';

export interface ClientData {
  type: ClientDataType;
  file?: File | null;
  inn?: string;
}

export interface ContractResult {
  html: string;
  risks: string[];
}

export interface FinancialData {
  totalAmount: number;
  installmentMonths: number;
  firstPaymentDate: string;
  firstPayment: number;
  secondPayment: number;
}

async function processFilePart(file: File, prefix: string): Promise<any> {
  const mimeType = file.type;
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx")
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return { text: `${prefix} HTML:\n\n${result.value}` };
  } else if (mimeType.startsWith("text/")) {
    const text = await file.text();
    return { text: `${prefix} Text:\n\n${text}` };
  } else {
    const base64 = await fileToBase64(file);
    return {
      inlineData: {
        mimeType: mimeType || "application/octet-stream",
        data: base64.split(",")[1],
      },
    };
  }
}

export async function fillContract(contractFile: File, clientData: ClientData | null, financialData: FinancialData, mode: AppMode): Promise<ContractResult> {
  const contractPart = await processFilePart(contractFile, "Contract");

  let clientPart: any = null;
  let clientInstruction = "1. Extract the client's details and fill them into the appropriate placeholders in the contract.";

  if (clientData) {
    if (clientData.type === 'passport' && clientData.file) {
      clientPart = await processFilePart(clientData.file, "Passport");
      clientInstruction = "1. Extract the passport holder's details (Full Name, Date of Birth, Passport Number, Issue Date, Issuing Authority, Address if present, etc.) from the provided passport document and fill them into the appropriate placeholders in the contract.";
    } else if (clientData.type === 'companyCard' && clientData.file) {
      clientPart = await processFilePart(clientData.file, "Company Card");
      clientInstruction = "1. Extract the legal entity's details (Company Name, INN, KPP, OGRN, Legal Address, Director's Name, Bank Details, etc.) from the provided company card document and fill them into the appropriate placeholders in the contract.";
    } else if (clientData.type === 'inn' && clientData.inn) {
      clientInstruction = `1. The client is a legal entity with INN: ${clientData.inn}. Use your search capabilities to find the official company details for this INN (Company Name, KPP, OGRN, Legal Address, Director's Name) and fill them into the appropriate placeholders in the contract.`;
    }
  }

  // Pre-calculate financial schedule to ensure mathematical accuracy
  const legalExpenses = 25750;
  const servicesTotal = Math.max(0, financialData.totalAmount - legalExpenses);
  const serviceItemCost = servicesTotal / 10;

  let remainingAmount = financialData.totalAmount - financialData.firstPayment - financialData.secondPayment;
  let remainingMonths = financialData.installmentMonths - 2;
  let monthlyPayment = remainingMonths > 0 ? remainingAmount / remainingMonths : 0;

  const startDate = new Date(financialData.firstPaymentDate);
  const schedule = [];
  for (let i = 0; i < financialData.installmentMonths; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate());
    const dateStr = d.toLocaleDateString('ru-RU');
    let amt = 0;
    if (i === 0) amt = financialData.firstPayment;
    else if (i === 1) amt = financialData.secondPayment;
    else amt = monthlyPayment;

    schedule.push(`${i + 1} платеж: ${dateStr} - ${amt.toFixed(2)} руб.`);
  }

  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const contractDateSuffix = `${day}${month}/${year}`;
  const todayFormatted = today.toLocaleDateString('ru-RU');

  let taskInstruction = "";

  if (mode === 'проверка') {
    taskInstruction = `
Your ONLY task is to analyze the provided contract document for any draconian (кабальные), hidden, or highly unfavorable conditions for the customer (заказчик). Identify clauses that should be changed or negotiated.
DO NOT fill out the contract. Return an empty string for the "html" field.
    `;
  } else if (mode === 'заполнение') {
    taskInstruction = `
Your task is twofold:
${clientInstruction} Ensure the formatting of the contract (tables, headings, paragraphs, lists, bold text) is preserved as much as possible. If the input contract was HTML, use that structure as the base. Leave unfilled fields blank or as placeholders.
2. Analyze the contract for any draconian (кабальные), hidden, or highly unfavorable conditions for the customer (заказчик). Identify clauses that should be changed or negotiated.

CRITICAL: DO NOT calculate or fill in any financial conditions, sums, or payment schedules. DO NOT generate or fill in a contract number. Leave those fields blank or exactly as they are in the template.
    `;
  } else {
    // 'работа'
    const financialContext = `
DETAILS TO INSERT:
You MUST use the following exact calculated numbers and formats to fill the contract. Do not calculate these yourself, use the provided values.

1. CONTRACT NUMBER & DATE (Номер и дата договора):
- Date of the contract (Дата заключения): ${todayFormatted}
- Contract Number (Номер договора): You MUST generate it using the initials (first letters of the Last Name, First Name, and Patronymic) extracted from the client's Full Name (ФИО) and the date suffix "${contractDateSuffix}". Format: "[Initials] ${contractDateSuffix}" (e.g., if the name is "Иванов Иван Иванович", the contract number should be "ИИИ ${contractDateSuffix}").
- Insert this generated Contract Number into ALL places where the contract number is required in the document.

2. SERVICES TABLE (Таблица с услугами):
- Судебные расходы (Legal expenses): ${legalExpenses} руб. (This is NOT a service, but part of the total).
- Total for services: ${servicesTotal} руб.
- The contract has 10 service items. Each of the 10 service items costs exactly: ${serviceItemCost.toFixed(2)} руб.

3. PAYMENT SCHEDULE (График платежей):
Total contract amount: ${financialData.totalAmount} руб.
Installment plan: ${financialData.installmentMonths} months.
Schedule:
${schedule.join('\n')}
`;
    
    taskInstruction = `
Your task is twofold:
${clientInstruction} Ensure the formatting of the contract (tables, headings, paragraphs, lists, bold text) is preserved as much as possible. If the input contract was HTML, use that structure as the base. Leave unfilled fields blank or as placeholders.
2. Analyze the contract for any draconian (кабальные), hidden, or highly unfavorable conditions for the customer (заказчик). Identify clauses that should be changed or negotiated.

${financialContext}
    `;
  }

  const parts: any[] = [
    {
      text: `You are an expert legal assistant and lawyer representing the customer (заказчик). I am providing you with a contract document (can be an image, PDF, text, or HTML extracted from a Word document)${clientPart ? ' and client data documents' : ''}.

${taskInstruction}

Output the result as JSON with two fields:
- "html": The filled contract in valid HTML format (raw HTML string, no markdown blocks). If mode is 'проверка', this should be an empty string.
- "risks": An array of strings, where each string is a brief, clear description in Russian of an unfavorable condition and why it's bad for the customer.`,
    },
    contractPart
  ];

  if (clientPart) {
    parts.push(clientPart);
  }

  const tools: any[] = [];
  if (clientData?.type === 'inn') {
    tools.push({ googleSearch: {} });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [{ parts }],
    config: {
      tools: tools.length > 0 ? tools : undefined,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          html: {
            type: Type.STRING,
            description: "The filled contract text in HTML format.",
          },
          risks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of draconian, hidden, or unfavorable conditions for the customer (заказчик). In Russian.",
          }
        },
        required: ["html", "risks"]
      }
    }
  });

  try {
    const parsed = JSON.parse(response.text || "{}");
    return {
      html: parsed.html || "",
      risks: parsed.risks || []
    };
  } catch (e) {
    console.error("Failed to parse JSON response", e);
    return { html: response.text || "", risks: [] };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
