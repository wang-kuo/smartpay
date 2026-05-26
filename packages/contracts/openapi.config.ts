import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import {
  demoDecisionFlowRequestSchema,
  demoDecisionFlowResponseSchema,
  errorResponseSchema
} from "./src";

const registry = new OpenAPIRegistry();

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

export const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiDocument = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    title: "SmartPay Consumption Decision API",
    version: "0.1.0"
  }
});
