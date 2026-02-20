import { z } from "zod";
import { ANALYSIS_MODES, COMPARE_SOURCES } from "./analysisOptions";
import { CANVAS_ORIENTATIONS, MAX_ACTIVE_PANELS, PANEL_IDS } from "./types";
import { DEFAULT_AUTO_OPEN_LAST_REPO_ON_STARTUP } from "./appSettings";

const fileStatusSchema = z.enum(["added", "removed", "changed"]);

const analysisRequestSchema = z.object({
  repoPath: z.string().min(1),
  baseBranch: z.string().min(1),
  compareBranch: z.string().min(1),
  mode: z.enum(ANALYSIS_MODES),
  compareSource: z.enum(COMPARE_SOURCES),
  ignorePatterns: z.array(z.string().min(1)),
});

const analysisSummarySchema = z.object({
  linesAdded: z.number().int(),
  linesRemoved: z.number().int(),
  linesNet: z.number().int(),
  filesAdded: z.number().int(),
  filesRemoved: z.number().int(),
  filesChanged: z.number().int(),
  totalTouched: z.number().int(),
});

const uniquePanelOrderSchema = z
  .array(z.enum(PANEL_IDS))
  .max(MAX_ACTIVE_PANELS)
  .superRefine((panelOrder, context) => {
    if (panelOrder.length !== new Set(panelOrder).size) {
      context.addIssue({
        code: "custom",
        message: "Panel order must contain unique panel IDs.",
      });
    }
  });

const datasetRowSchema = z.record(z.string(), z.any());

const analysisResultSchema = z.object({
  resolvedRefs: z.object({
    leftRef: z.string(),
    rightRef: z.string(),
    mergeBase: z.string().optional(),
    compareSource: z.enum(COMPARE_SOURCES),
  }),
  summary: analysisSummarySchema,
  datasets: z.record(z.string(), z.array(datasetRowSchema)),
  files: z.array(
    z.object({
      path: z.string(),
      status: fileStatusSchema,
      added: z.number().int(),
      removed: z.number().int(),
      churn: z.number().int(),
      directory: z.string(),
      extension: z.string(),
      previousPath: z.string().optional(),
    })
  ),
});

const analysisPollResponseSchema = z
  .object({
    signature: z.string(),
    changed: z.boolean(),
    result: analysisResultSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.changed && !value.result) {
      context.addIssue({
        code: "custom",
        message: "Polling response must include result when changed is true.",
        path: ["result"],
      });
    }

    if (!value.changed && value.result !== undefined) {
      context.addIssue({
        code: "custom",
        message:
          "Polling response cannot include result when changed is false.",
        path: ["result"],
      });
    }
  });

const repoSettingsSchema = z.object({
  ignorePatterns: z.array(z.string().min(1)),
  mode: z.enum(ANALYSIS_MODES),
  compareSource: z.enum(COMPARE_SOURCES),
  baseBranch: z.string(),
  compareBranch: z.string(),
  panelOrder: uniquePanelOrderSchema,
  canvasOrientation: z.enum(CANVAS_ORIENTATIONS),
});

const appSettingsSchema = z.object({
  autoOpenLastRepoOnStartup: z
    .boolean()
    .default(DEFAULT_AUTO_OPEN_LAST_REPO_ON_STARTUP),
});

export {
  analysisPollResponseSchema,
  analysisRequestSchema,
  analysisResultSchema,
  appSettingsSchema,
  repoSettingsSchema,
};
