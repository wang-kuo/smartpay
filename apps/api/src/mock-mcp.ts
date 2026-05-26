import type { DemoScenario, MockServicePayloads } from "@smartpay/contracts";

export type MockMcpContext = {
  merchantQuote: MockServicePayloads["merchant"];
  marketIntelligence: MockServicePayloads["consumerAgentNetwork"];
  walletPreview: MockServicePayloads["wallet"];
  consumptionHistory: DemoScenario["consumptionHistory"];
};

export function getJapanTripMockMcpContext(
  scenario: DemoScenario,
  traceId: string
): MockMcpContext {
  return {
    merchantQuote: {
      traceId,
      quoteId: scenario.quotes.officialQuote.quoteId,
      merchantName: scenario.quotes.officialQuote.merchantName,
      amount: scenario.quotes.officialQuote.amount,
      currency: scenario.quotes.officialQuote.currency,
      isExecutable: scenario.quotes.officialQuote.isExecutable
    },
    marketIntelligence: {
      traceId,
      marketAverage: scenario.quotes.marketIntelligence.marketAverage,
      priceRange: scenario.quotes.marketIntelligence.priceRange,
      signal: scenario.quotes.marketIntelligence.signal
    },
    walletPreview: {
      traceId,
      simulated: true,
      paymentStatus: "not_started",
      walletPaymentId: null
    },
    consumptionHistory: scenario.consumptionHistory
  };
}
