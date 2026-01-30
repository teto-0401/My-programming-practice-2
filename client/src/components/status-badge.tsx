import { Circle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const isRunning = status === "running";
  const isError = status === "error";

  let colorClass = "text-muted-foreground bg-muted";
  let dotClass = "fill-muted-foreground";

  if (isRunning) {
    colorClass = "text-green-500 bg-green-500/10 border-green-500/20";
    dotClass = "fill-green-500 animate-pulse";
  } else if (isError) {
    colorClass = "text-red-500 bg-red-500/10 border-red-500/20";
    dotClass = "fill-red-500";
  }

  return (
    <div className={`
      inline-flex items-center gap-2 px-3 py-1 rounded-full border
      text-sm font-mono font-medium uppercase tracking-wider
      ${colorClass}
    `}>
      <Circle className={`w-2 h-2 ${dotClass}`} />
      {status}
    </div>
  );
}
