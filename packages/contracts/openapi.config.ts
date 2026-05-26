import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import {
  demoAuthSessionRequestSchema,
  demoAuthSessionResponseSchema,
  demoDecisionFlowRequestSchema,
  demoDecisionFlowResponseSchema,
  demoInteractiveDecisionRequestSchema,
  demoInteractiveDecisionResponseSchema,
  errorResponseSchema
} from "./src";

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: "post",
  path: "/api/demo/auth/session",
  summary: "Create a local demo user or admin session.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: demoAuthSessionRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "Demo session.",
      content: {
        "application/json": {
          schema: demoAuthSessionResponseSchema
        }
      }
    },
    400: {
      description: "Invalid request.",
      content: {
        "application/json": {
          schema: errorResponseSchema
        }
      }
    },
    401: {
      description: "Invalid admin credentials.",
      content: {
        "application/json": {
          schema: errorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/demo/japan-trip/decision-flow",
  summary: "Run the Japan Trip consumption decision flow.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: demoDecisionFlowRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "Decision flow result.",
      content: {
        "application/json": {
          schema: demoDecisionFlowResponseSchema
        }
      }
    },
    400: {
      description: "Invalid request.",
      content: {
        "application/json": {
          schema: errorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/demo/japan-trip/interactive-decision",
  summary: "Analyze a user chat request and run the Japan Trip decision flow.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: demoInteractiveDecisionRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "Interactive decision flow result.",
      content: {
        "application/json": {
          schema: demoInteractiveDecisionResponseSchema
        }
      }
    },
    400: {
      description: "Invalid request.",
      content: {
        "application/json": {
          schema: errorResponseSchema
        }
      }
    }
  }
});

export const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiDocument = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    title: "SmartPay Consumption Decision API",
    version: "0.1.0"
  }
});
