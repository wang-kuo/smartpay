---
name: smartpay-product-guardian
description: Use before SmartPay product, UI, API, or architecture changes to keep the app a consumption decision agent, not a recommendation system.
---

Before proposing or changing behavior:
1. Confirm the flow remains authorization -> decision -> execution.
2. Confirm every consumption request ends as `allow`, `ask`, or `deny`.
3. Reject designs where ranking, recommendation, or price discovery becomes the product core.
4. Confirm final order execution uses only official quote data, not market intelligence history.
5. Confirm demo work stays mock-only unless a separate production readiness plan exists.
