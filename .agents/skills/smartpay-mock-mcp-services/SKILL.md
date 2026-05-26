---
name: smartpay-mock-mcp-services
description: Use when changing mock Merchant MCP, mock Wallet MCP, or mock consumer agent network behavior.
---

Mock integration workflow:
1. Keep all demo external services mock-only.
2. Merchant mock returns official executable quotes and order state.
3. Wallet mock returns simulated payment results only.
4. Consumer agent network mock returns market intelligence only and must never be used as executable quote data.
5. Include traceId in mock service payloads and event logs.
6. Keep payloads deterministic enough for tests.
