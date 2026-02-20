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
  return (
    <section className="grid w-full grid-cols-7 gap-3">
      {statItems.map((item) => {
        const value = summary ? summary[item.key] : 0;
        const Icon = item.icon;

        return (
          <Card key={item.key} className={`min-w-0 p-3 ${item.tone.card}`}>
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon size={14} className={item.tone.icon} />
                <span className="truncate">{item.label}</span>
              </div>
              <div className={`mt-2 text-xl font-semibold ${item.tone.value}`}>
                {formatNumber(value)}
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
};

export { StatCards };
