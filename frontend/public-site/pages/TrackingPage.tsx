import { useEffect, useState } from "react";
import { CheckCircle2, Search } from "lucide-react";
import { Button, Input, PageIntro } from "../components/ui";
import { PublicTrackerResponse, publicWebsiteApi } from "../api";

const defaultSteps = [
  "Booking Confirmed",
  "Device Collected",
  "Diagnosing",
  "Awaiting Approval",
  "Repairing",
  "Testing",
  "Ready For Return",
  "Delivered",
];

export function TrackingPage() {
  const [ticket, setTicket] = useState("");
  const [contact, setContact] = useState("");
  const [lastQuery, setLastQuery] = useState<{ ticket: string; contact: string } | null>(null);
  const [tracker, setTracker] = useState<PublicTrackerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runLookup(nextTicket = ticket, nextContact = contact) {
    setError(null);
    try {
      const response = await publicWebsiteApi.trackRepair(nextTicket, nextContact);
      setTracker(response);
      setLastQuery({ ticket: nextTicket, contact: nextContact });
    } catch (err) {
      setTracker(null);
      setError(err instanceof Error ? err.message : "Unable to find that repair.");
    }
  }

  useEffect(() => {
    if (!lastQuery) return undefined;
    const timer = window.setInterval(() => {
      publicWebsiteApi.trackRepair(lastQuery.ticket, lastQuery.contact).then(setTracker).catch(() => undefined);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [lastQuery]);

  const steps = tracker?.steps ?? defaultSteps.map((label) => ({ key: label, label, completed: false, current: false }));

  return (
    <>
      <PageIntro
        eyebrow="Repair tracking"
        title="Track your repair online"
        text="Use your ticket number plus your email or phone number to see live repair progress."
      />

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="Ticket number, e.g. SCT-12" />
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone" />
            <Button onClick={() => runLookup()}>
              <Search className="mr-2 h-4 w-4" />
              Track
            </Button>
          </div>

          {error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}
        </div>

        {tracker && (
          <div className="mt-8 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-orange-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Ticket</p>
                <p className="text-2xl font-black text-[#1c1815]">{tracker.ticket_number}</p>
              </div>
              <div className="rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700">
                {tracker.status.replace(/_/g, " ")}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {steps.map((step, index) => (
                <div key={step.key} className={`flex items-center gap-4 rounded-xl border p-4 ${step.current ? "border-orange-300 bg-orange-50" : step.completed ? "border-green-200 bg-green-50" : "border-stone-100 bg-stone-50"}`}>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                    step.completed || step.current ? "bg-orange-600 text-white" : "bg-white text-stone-400"
                  }`}>
                    {step.completed || step.current ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                  </span>
                  <div>
                    <p className={`text-sm font-black ${step.current ? "text-orange-700" : "text-stone-700"}`}>{step.label}</p>
                    {step.current && <p className="text-xs font-bold text-orange-600">Current stage</p>}
                    {step.completed && <p className="text-xs font-bold text-green-600">Completed</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
