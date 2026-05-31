import { RepairTracker } from "@/components/shared/RepairTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrackerStep } from "@/types";

const demoSteps: TrackerStep[] = [
  { key: "received", label: "Received", completed: true, current: false },
  { key: "diagnosing", label: "Diagnosing", completed: true, current: false },
  { key: "awaiting_approval", label: "Awaiting Approval", completed: false, current: true },
  { key: "repairing", label: "Repairing", completed: false, current: false },
  { key: "testing", label: "Testing", completed: false, current: false },
  { key: "ready", label: "Ready", completed: false, current: false },
];

export function PortalTrackerPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Track your repair</h1>
        <p className="text-muted-foreground">Enter your ticket number to check the status of your repair.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Repair progress</CardTitle>
        </CardHeader>
        <CardContent>
          <RepairTracker steps={demoSteps} />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            We&apos;re preparing your quote — you&apos;ll be notified when it&apos;s ready to approve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
