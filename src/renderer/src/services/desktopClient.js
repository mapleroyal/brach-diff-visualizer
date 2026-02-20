import { z } from "zod";
import {
  analysisPollResponseSchema,
  analysisRequestSchema,
  analysisResultSchema,
  appSettingsSchema,
  repoSettingsSchema,
} from "@shared/ipcContracts";

class DesktopClientError extends Error {
  channel;

  constructor(message, channel, cause) {
    super(message);
    this.name = "DesktopClientError";
    this.channel = channel;
    this.cause = cause;
  }
}

const nullableRepoPathSchema = z.string().nullable();
const branchListSchema = z.array(z.string());
const exportPathSchema = z.string().nullable();

const exportPayloadSchema = z.object({
  request: analysisRequestSchema,
  result: analysisResultSchema,
});

const assertBridgeMethod = (methodName, channel) => {
  const bridge = window.api;
  if (!bridge || typeof bridge[methodName] !== "function") {
    throw new DesktopClientError(
      `Desktop bridge method "${methodName}" is unavailable.`,
      channel
    );
  }

  return bridge[methodName];
};

const invoke = async ({
  channel,
  methodName,
  args = [],
  requestSchema,
  responseSchema,
}) => {
  let validatedArgs = args;
  if (requestSchema) {
    validatedArgs = [requestSchema.parse(args[0]), ...args.slice(1)];
  }

  let response;
  try {
    const method = assertBridgeMethod(methodName, channel);
    response = await method(...validatedArgs);
  } catch (error) {
    if (error instanceof DesktopClientError) {
      throw error;
    }

    const message =
      error instanceof Error && error.message
        ? error.message
        : `Failed to invoke "${channel}".`;
    throw new DesktopClientError(message, channel, error);
  }

  if (
    !response ||
    typeof response !== "object" ||
    typeof response.ok !== "boolean"
  ) {
    throw new DesktopClientError(
      `Invalid response envelope for "${channel}".`,
      channel
    );
  }

  if (!response.ok) {
    throw new DesktopClientError(
      response.error || `IPC call failed for "${channel}".`,
      channel
    );
  }

  if (!responseSchema) {
    return response.data;
  }

  try {
    return responseSchema.parse(response.data);
  } catch (error) {
    throw new DesktopClientError(
      `Invalid response payload for "${channel}".`,
      channel,
      error
    );
  }
};

const desktopClient = {
  pickRepo: () =>
    invoke({
      channel: "repo:pick",
      methodName: "pickRepo",
      responseSchema: nullableRepoPathSchema,
    }),

  loadLastOpenedRepo: () =>
    invoke({
      channel: "settings:loadLastOpenedRepo",
      methodName: "loadLastOpenedRepo",
      responseSchema: nullableRepoPathSchema,
    }),

  loadAppSettings: () =>
    invoke({
      channel: "settings:loadAppSettings",
      methodName: "loadAppSettings",
      responseSchema: appSettingsSchema,
    }),

  listBranches: (repoPath) =>
    invoke({
      channel: "git:listBranches",
      methodName: "listBranches",
      args: [repoPath],
      requestSchema: z.string().min(1),
      responseSchema: branchListSchema,
    }),

  loadSettingsForRepo: (repoPath) =>
    invoke({
      channel: "settings:loadForRepo",
      methodName: "loadSettingsForRepo",
      args: [repoPath],
      requestSchema: z.string().min(1),
      responseSchema: repoSettingsSchema,
    }),

  saveSettingsForRepo: (repoPath, settings) =>
    invoke({
      channel: "settings:saveForRepo",
      methodName: "saveSettingsForRepo",
      args: [
        z.string().min(1).parse(repoPath),
        repoSettingsSchema.parse(settings),
      ],
      responseSchema: repoSettingsSchema,
    }),

  saveAppSettings: (settings) =>
    invoke({
      channel: "settings:saveAppSettings",
      methodName: "saveAppSettings",
      args: [appSettingsSchema.parse(settings)],
      responseSchema: appSettingsSchema,
    }),

  pollAnalysis: async (request, previousSignature) => {
    const parsedRequest = analysisRequestSchema.parse(request);
    const parsedPreviousSignature =
      previousSignature == null ? null : z.string().parse(previousSignature);

    return invoke({
      channel: "analysis:poll",
      methodName: "pollAnalysis",
      args: [parsedRequest, parsedPreviousSignature],
      responseSchema: analysisPollResponseSchema,
    });
  },

  exportJson: (payload) =>
    invoke({
      channel: "analysis:exportJson",
      methodName: "exportJson",
      args: [exportPayloadSchema.parse(payload)],
      responseSchema: exportPathSchema,
    }),
};

const getDesktopClientErrorMessage = (error) => {
  if (error instanceof DesktopClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
};

export { desktopClient, getDesktopClientErrorMessage };
