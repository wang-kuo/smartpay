import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import {
  demoAdminLogsResponseSchema,
  demoAdminUsersResponseSchema,
  demoAuthSessionRequestSchema,
  demoAuthSessionResponseSchema,
  demoDecisionFlowRequestSchema,
  demoDecisionFlowResponseSchema,
  demoEmailCodeRequestSchema,
  demoEmailCodeResponseSchema,
  demoInviteRequestSchema,
  demoInviteResponseSchema,
  demoInteractiveDecisionRequestSchema,
  demoInteractiveDecisionResponseSchema,
  errorResponseSchema
} from "./src";

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: "post",
  path: "/api/demo/invites/request",
  summary: "Request a mock demo invite code.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: demoInviteRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "Invite request accepted.",
      content: {
        "application/json": {
          schema: demoInviteResponseSchema
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
  path: "/api/demo/auth/email-code/request",
  summary: "Request a mock email verification code.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: demoEmailCodeRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "Verification code issued.",
      content: {
        "application/json": {
          schema: demoEmailCodeResponseSchema
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
  path: "/api/demo/auth/session",
  summary: "Create a local demo session with an email verification code.",
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
      description: "Invalid verification code.",
      content: {
        "application/json": {
          schema: errorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/demo/admin/users",
  summary: "List demo users for admin debugging.",
  responses: {
    200: {
      description: "Demo users.",
      content: {
        "application/json": {
          schema: demoAdminUsersResponseSchema
        }
      }
    },
    403: {
      description: "Admin token required.",
      content: {
        "application/json": {
          schema: errorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/demo/admin/logs",
  summary: "List runtime logs for admin debugging.",
  responses: {
    200: {
      description: "Runtime logs.",
      content: {
        "application/json": {
          schema: demoAdminLogsResponseSchema
        }
      }
    },
    403: {
      description: "Admin token required.",
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
