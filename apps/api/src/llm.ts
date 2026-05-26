import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import {
  demoUserIntentAnalysisSchema,
  type AppMode,
  type DemoScenario,
  type DemoUserIntentAnalysis,
  type InteractiveDecisionLlmStatus
} from "@smartpay/contracts";
import type { MockMcpContext } from "./mock-mcp";
import { getSecret } from "./secrets";

type AnalyzeInteractionInput = {
  message: string;
  scenario: DemoScenario;
  mockMcp: MockMcpContext;
  mode: AppMode;
};

type AnalyzeInteractionResult = {
  analysis: DemoUserIntentAnalysis;
  llm: InteractiveDecisionLlmStatus;
};

const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";

function getDeepSeekModel(): string {
  return getSecret("DEEPSEEK_MODEL")?.trim() || DEFAULT_DEEPSEEK_MODEL;
}

function getDeepSeekBaseUrl(): string {
  return getSecret("DEEPSEEK_BASE_URL")?.trim() || DEFAULT_DEEPSEEK_BASE_URL;
}

function getTimeoutMs(): number {
  const parsed = Number(process.env.LLM_TIMEOUT_MS ?? "15000");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15000;
}

function parseBudget(message: string): DemoUserIntentAnalysis["budget"] {
  const match = /(?:s\$|sgd|\$)\s?(\d{3,5})/i.exec(message);
  if (!match?.[1]) {
    return null;
  }

  return {
    amount: Number(match[1]),
    currency: "SGD"
  };
}

function buildFallbackAnalysis(
  message: string,
  scenario: DemoScenario,
  fallbackReason: string
): AnalyzeInteractionResult {
  const normalized = message.trim();
  const budget = parseBudget(message);
  const mentionsJapan = /japan|tokyo|osaka|kyoto|日本|东京|大阪|京都/i.test(message);
  const highRiskBudget =
    (budget?.amount ?? scenario.consumptionRequest.amount) > scenario.goalContext.availableTravelBudget;
  const asksForTravel = /trip|travel|hotel|flight|旅行|旅游|酒店|机票/i.test(message);
  const fitCheck = mentionsJapan && asksForTravel && !highRiskBudget ? "pass" : "caution";

  return {
    analysis: demoUserIntentAnalysisSchema.parse({
      intent: "japan_trip",
      normalizedRequest:
        normalized ||
        "Assess a Japan trip consumption request against the user's budget and authorization.",
      category: "Travel",
      travelWindow: mentionsJapan ? "5-7 days" : null,
      budget,
      confidence: mentionsJapan && asksForTravel ? "medium" : "low",
      userFacingSummary: mentionsJapan
        ? "I will assess this Japan trip request against your travel budget and authorization."
        : "I need user confirmation because the request does not clearly match the Japan trip demo.",
      fitCheck: {
        fitCheck,
        softRisks:
          fitCheck === "pass"
            ? ["Request aligns with the mock Japan trip goal and travel authorization."]
            : ["The request is unclear or may not fit the mock Japan trip budget."],
        explanation:
          fitCheck === "pass"
            ? "The request is travel-related, points to the Japan trip goal, and stays inside the demo budget context."
            : "The system fails closed to user confirmation when the request is unclear or exceeds the demo budget context."
      }
    }),
    llm: {
      provider: "deterministic_fallback",
      model: "local-rules",
      usedDeepSeek: false,
      fallbackReason
    }
  };
}

function buildContextJson(input: AnalyzeInteractionInput): string {
  return JSON.stringify({
    task:
      "Analyze the user request for SmartPay fit-check context only. Do not authorize spending, rank packages, or place orders.",
    appMode: input.mode,
    userMessage: input.message,
    profileTags: input.scenario.profile.profileTags,
    avatarState: input.scenario.profile.avatarState,
    goalContext: {
      availableTravelBudget: input.scenario.goalContext.availableTravelBudget,
      goalImpact: input.scenario.goalContext.goalImpact
    },
    mockMcpOutputs: {
      merchantQuoteForExecution: input.mockMcp.merchantQuote,
      marketIntelligenceForContextOnly: input.mockMcp.marketIntelligence,
      walletPreview: input.mockMcp.walletPreview
    },
    mockConsumptionHistory: input.mockMcp.consumptionHistory,
    requiredDecisionBoundary:
      "Return fitCheck pass, caution, or fail. Final allow, ask, or deny is owned by the deterministic rule engine."
  });
}

function buildExampleJson(): string {
  return JSON.stringify({
    intent: "japan_trip",
    normalizedRequest: "Book a 6 day Japan trip within S$2500.",
    category: "Travel",
    travelWindow: "5-7 days",
    budget: {
      amount: 2500,
      currency: "SGD"
    },
    confidence: "high",
    userFacingSummary:
      "I will assess this Japan trip purchase against your budget, authorization, and mock quote.",
    fitCheck: {
      fitCheck: "pass",
      softRisks: ["Onsite spending still needs to stay controlled."],
      explanation: "The request fits the mock Japan trip goal and can proceed to rule evaluation."
    }
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("DeepSeek analysis timed out.")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function analyzeInteractionWithOptionalDeepSeek(
  input: AnalyzeInteractionInput
): Promise<AnalyzeInteractionResult> {
  const apiKey = getSecret("DEEPSEEK_API_KEY")?.trim();
  if (!apiKey) {
    return buildFallbackAnalysis(input.message, input.scenario, "DEEPSEEK_API_KEY is not configured.");
  }

  const modelName = getDeepSeekModel();
  try {
    const parser = new JsonOutputParser<DemoUserIntentAnalysis>();
    const model = new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: 0,
      maxTokens: 1200,
      modelKwargs: {
        response_format: {
          type: "json_object"
        }
      },
      configuration: {
        baseURL: getDeepSeekBaseUrl()
      }
    });
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        [
          "You are a SmartPay fit-check analyst.",
          "Return only valid json matching the requested schema.",
          "You provide structured context only.",
          "You never authorize spending, override hard rules, rank packages, place orders, or make payments.",
          "Example json output: {exampleJson}"
        ].join(" ")
      ],
      ["user", "{contextJson}"]
    ]);
    const chain = prompt.pipe(model).pipe(parser);
    const raw = await withTimeout(
      chain.invoke({
        contextJson: buildContextJson(input),
        exampleJson: buildExampleJson()
      }),
      getTimeoutMs()
    );
    const parsed = demoUserIntentAnalysisSchema.safeParse(raw);

    if (!parsed.success) {
      return buildFallbackAnalysis(input.message, input.scenario, "DeepSeek output failed schema validation.");
    }

    return {
      analysis: parsed.data,
      llm: {
        provider: "deepseek",
        model: modelName,
        usedDeepSeek: true
      }
    };
  } catch (error) {
    return buildFallbackAnalysis(
      input.message,
      input.scenario,
      error instanceof Error ? error.message : "DeepSeek analysis failed."
    );
  }
}
