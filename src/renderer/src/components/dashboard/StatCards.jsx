import {
  Activity,
  BarChart3,
  FileBarChart2,
  FolderTree,
  GitBranch,
  GitCompare,
  PieChart,
} from "lucide-react";
import { Card } from "@renderer/components/ui/card";
import { statCardToneClasses } from "@renderer/lib/chartColors";
import { formatNumber } from "@renderer/lib/numberFormat";

const statItems = [
  {
    key: "linesAdded",
    label: "Lines Added",
    icon: BarChart3,
    tone: statCardToneClasses.linesAdded,
  },
  {
    key: "linesRemoved",
    label: "Lines Removed",
    icon: Activity,
    tone: statCardToneClasses.linesRemoved,
  },
  {
    key: "linesNet",
    label: "Net Lines",
    icon: GitCompare,
    tone: statCardToneClasses.linesNet,
  },
  {
    key: "totalTouched",
    label: "Files Touched",
    icon: FolderTree,
    tone: statCardToneClasses.totalTouched,
  },
  {
    key: "filesAdded",
    label: "Files Added",
    icon: GitBranch,
    tone: statCardToneClasses.filesAdded,
  },
  {
    key: "filesRemoved",
    label: "Files Removed",
    icon: PieChart,
    tone: statCardToneClasses.filesRemoved,
  },
  {
    key: "filesChanged",
    label: "Files Changed",
    icon: FileBarChart2,
    tone: statCardToneClasses.filesChanged,
  },
];

const StatCards = ({ summary }) => {
  const hasSummary = Boolean(summary);

  return (
    <section className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {statItems.map((item) => {
        const value = hasSummary ? summary[item.key] : null;
        const Icon = item.icon;

        return (
          <Card
            key={item.key}
            className={`min-w-0 p-3 ${
              hasSummary ? item.tone.card : "border-dashed bg-muted/35"
            }`}
          >
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon
                  size={14}
                  className={
                    hasSummary ? item.tone.icon : "text-muted-foreground"
                  }
                />
                <span className="truncate">{item.label}</span>
              </div>
              <div
                className={`mt-2 text-xl font-semibold ${
                  hasSummary ? item.tone.value : "text-muted-foreground"
                }`}
              >
                {hasSummary ? formatNumber(value) : "—"}
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
};

export { StatCards };
