import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrackerStep } from "@/types";

interface RepairTrackerProps {
  steps: TrackerStep[];
  className?: string;
}

export function RepairTracker({ steps, className }: RepairTrackerProps) {
  return (
    <nav aria-label="Repair progress" className={cn("w-full", className)}>
      <ol className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {steps.map((step, i) => (
          <li key={step.key} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div
                  className={cn(
                    "hidden h-0.5 flex-1 sm:block",
                    step.completed || step.current ? "bg-accent" : "bg-border"
                  )}
                />
              )}
              <div
                aria-current={step.current ? "step" : undefined}
                className={cn(
                  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                  step.completed && "border-accent bg-accent text-accent-foreground",
                  step.current && !step.completed && "border-accent ring-4 ring-accent/30 animate-pulse",
                  !step.completed && !step.current && "border-border bg-card text-muted-foreground"
                )}
              >
                {step.completed ? <Check className="h-5 w-5" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "hidden h-0.5 flex-1 sm:block",
                    steps[i + 1]?.completed || steps[i + 1]?.current ? "bg-accent" : "bg-border"
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "mt-2 text-xs font-medium sm:text-sm",
                step.current ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
