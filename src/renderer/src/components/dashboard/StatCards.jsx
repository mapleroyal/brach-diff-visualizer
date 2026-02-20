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

const formatNumber = (value) => new Intl.NumberFormat("en-US").format(value);

const statItems = [
  {
    key: "linesAdded",
    label: "Lines Added",
    icon: BarChart3,
    tone: {
      card: "border-[hsl(var(--chart-1)/0.45)] bg-[hsl(var(--chart-1)/0.08)]",
      icon: "text-[hsl(var(--chart-1))]",
      value: "text-[hsl(var(--chart-1))]",
    },
  },
  {
    key: "linesRemoved",
    label: "Lines Removed",
    icon: Activity,
    tone: {
      card: "border-[hsl(var(--chart-5)/0.45)] bg-[hsl(var(--chart-5)/0.08)]",
      icon: "text-[hsl(var(--chart-5))]",
      value: "text-[hsl(var(--chart-5))]",
    },
  },
  {
    key: "linesNet",
    label: "Net Lines",
    icon: GitCompare,
    tone: {
      card: "border-[hsl(var(--chart-2)/0.45)] bg-[hsl(var(--chart-2)/0.08)]",
      icon: "text-[hsl(var(--chart-2))]",
      value: "text-[hsl(var(--chart-2))]",
    },
  },
  {
    key: "totalTouched",
    label: "Files Touched",
    icon: FolderTree,
    tone: {
      card: "border-[hsl(var(--chart-6)/0.45)] bg-[hsl(var(--chart-6)/0.08)]",
      icon: "text-[hsl(var(--chart-6))]",
      value: "text-[hsl(var(--chart-6))]",
    },
  },
  {
    key: "filesAdded",
    label: "Files Added",
    icon: GitBranch,
    tone: {
      card: "border-[hsl(var(--chart-13)/0.45)] bg-[hsl(var(--chart-13)/0.08)]",
      icon: "text-[hsl(var(--chart-13))]",
      value: "text-[hsl(var(--chart-13))]",
    },
  },
  {
    key: "filesRemoved",
    label: "Files Removed",
    icon: PieChart,
    tone: {
      card: "border-[hsl(var(--chart-14)/0.45)] bg-[hsl(var(--chart-14)/0.08)]",
      icon: "text-[hsl(var(--chart-14))]",
      value: "text-[hsl(var(--chart-14))]",
    },
  },
  {
    key: "filesChanged",
    label: "Files Changed",
    icon: FileBarChart2,
    tone: {
      card: "border-[hsl(var(--chart-7)/0.45)] bg-[hsl(var(--chart-7)/0.08)]",
      icon: "text-[hsl(var(--chart-7))]",
      value: "text-[hsl(var(--chart-7))]",
    },
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
