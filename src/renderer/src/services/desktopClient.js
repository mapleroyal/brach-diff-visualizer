import { z } from "zod";
import {
  analysisPollResponseSchema,
  analysisRequestSchema,
  analysisResultSchema,
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

const pickRepoSchema = z.string().nullable();
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

const isMissingPollHandlerError = (error) => {
  if (!(error instanceof DesktopClientError)) {
    return false;
  }

  const message = `${error.message || ""}`;
  return (
    message.includes('No handler registered for "analysis:poll"') ||
    message.includes("No handler registered for 'analysis:poll'") ||
    message.includes('Desktop bridge method "pollAnalysis" is unavailable.')
  );
};

const pollWithLegacyApi = async (request, previousSignature) => {
  const signature = await invoke({
    channel: "analysis:getSignature",
    methodName: "getAnalysisSignature",
    args: [request],
    requestSchema: analysisRequestSchema,
    responseSchema: z.string(),
  });

  if (previousSignature && previousSignature === signature) {
    return analysisPollResponseSchema.parse({
      signature,
      changed: false,
    });
  }

  const result = await invoke({
    channel: "analysis:run",
    methodName: "runAnalysis",
    args: [request],
    requestSchema: analysisRequestSchema,
    responseSchema: analysisResultSchema,
  });

  return analysisPollResponseSchema.parse({
    signature,
    changed: true,
    result,
  });
};

const desktopClient = {
  pickRepo: () =>
    invoke({
      channel: "repo:pick",
      methodName: "pickRepo",
      responseSchema: pickRepoSchema,
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

  pollAnalysis: async (request, previousSignature) => {
    const parsedRequest = analysisRequestSchema.parse(request);
    const parsedPreviousSignature =
      previousSignature == null ? null : z.string().parse(previousSignature);

    try {
      return await invoke({
        channel: "analysis:poll",
        methodName: "pollAnalysis",
        args: [parsedRequest, parsedPreviousSignature],
        responseSchema: analysisPollResponseSchema,
      });
    } catch (error) {
      if (isMissingPollHandlerError(error)) {
        return pollWithLegacyApi(parsedRequest, parsedPreviousSignature);
      }

      throw error;
    }
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

export {
  DesktopClientError,
  desktopClient,
  getDesktopClientErrorMessage,
  invoke,
};
