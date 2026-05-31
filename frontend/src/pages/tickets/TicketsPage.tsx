import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageSquare, Paperclip, RefreshCw, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ticketsApi } from "@/lib/api";
import type { RepairTicket } from "@/types/commerce";

type ConversationEvent = {
  id: string;
  at: string;
  kind: string;
  title: string;
  body: string | null;
  status: string;
  attachments?: { filename?: string; content_type?: string; size?: number }[];
  error?: string | null;
};

const templates = [
  ["ticket_created", "Ticket Created"],
  ["quote_ready", "Quote Ready"],
  ["quote_approved", "Quote Approved"],
  ["repair_started", "Repair Started"],
  ["waiting_parts", "Waiting Parts"],
  ["ready_for_pickup", "Ready For Pickup"],
  ["repair_completed", "Repair Completed"],
  ["warranty_reminder", "Warranty Reminder"],
];

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function filesToAttachments(files: FileList | null) {
  if (!files) return [];
  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise<{ filename: string; content_type: string; content_base64: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result || "");
            resolve({
              filename: file.name,
              content_type: file.type || "application/octet-stream",
              content_base64: dataUrl.split(",")[1] || "",
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );
}

export function TicketsPage() {
  const [selected, setSelected] = useState<RepairTicket | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "communications">("details");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailHtml, setEmailHtml] = useState("");
  const [emailFiles, setEmailFiles] = useState<FileList | null>(null);
  const [smsMessage, setSmsMessage] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => ticketsApi.list(),
  });

  useEffect(() => {
    if (!selected && data?.items.length) setSelected(data.items[0]);
  }, [data, selected]);

  const { data: timeline } = useQuery({
    queryKey: ["ticket-timeline", selected?.id],
    queryFn: () => ticketsApi.timeline(selected!.id),
    enabled: !!selected,
  });

  const { data: communications, isLoading: communicationsLoading } = useQuery({
    queryKey: ["ticket-communications", selected?.id],
    queryFn: () => ticketsApi.communications(selected!.id),
    enabled: !!selected,
  });

  const loadTemplate = async (eventKey: string) => {
    if (!selected || !eventKey) return;
    const template = await ticketsApi.template(selected.id, eventKey);
    setEmailSubject(template.subject);
    setEmailHtml(template.body_html);
    setSmsMessage(stripHtml(template.body_html));
  };

  const sendEmailMutation = useMutation({
    mutationFn: async () =>
      ticketsApi.sendEmail(selected!.id, {
        subject: emailSubject,
        body_html: emailHtml,
        attachments: await filesToAttachments(emailFiles),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-communications", selected?.id] });
      setEmailSubject("");
      setEmailHtml("");
      setEmailFiles(null);
    },
  });

  const sendSmsMutation = useMutation({
    mutationFn: () => ticketsApi.sendSms(selected!.id, { message: smsMessage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-communications", selected?.id] });
      setSmsMessage("");
    },
  });

  const events: ConversationEvent[] = [
    ...(timeline || []).map((entry) => ({
      id: entry.id,
      at: entry.created_at,
      kind: "system",
      title: entry.from_status ? `${entry.from_status} -> ${entry.to_status}` : "Ticket Created",
      body: entry.note,
      status: entry.is_customer_visible ? "customer visible" : "internal",
    })),
    ...(communications || []).map((comm) => ({
      id: comm.id,
      at: comm.created_at,
      kind: comm.channel,
      title:
        comm.channel === "email"
          ? `${comm.direction === "outbound" ? "Email Sent" : "Customer Email"}${comm.subject ? `: ${comm.subject}` : ""}`
          : `${comm.direction === "outbound" ? "SMS Sent" : "Customer SMS"}`,
      body: comm.body_text || (comm.body_html ? stripHtml(comm.body_html) : ""),
      status: comm.status,
      attachments: comm.attachments,
      error: comm.error_message,
    })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Repair Tickets</h2>
        <p className="text-muted-foreground">Manage repairs from intake to pickup</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>All tickets ({data?.total ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-0">
            {isLoading && <p className="px-6 pb-4 text-sm text-muted-foreground">Loading...</p>}
            {data?.items.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => {
                  setSelected(ticket);
                  setActiveTab("details");
                }}
                className={`w-full border-b px-6 py-3 text-left hover:bg-muted/50 ${
                  selected?.id === ticket.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{ticket.ticket_number}</p>
                  <span className="rounded-full bg-card px-2 py-1 text-xs capitalize">{ticket.status.replace(/_/g, " ")}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ticket.issue_description}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          {selected ? (
            <>
              <CardHeader className="border-b">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>{selected.ticket_number}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selected.issue_description}</p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">
                    {selected.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant={activeTab === "details" ? "default" : "outline"} onClick={() => setActiveTab("details")}>
                    Details
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === "communications" ? "default" : "outline"}
                    onClick={() => setActiveTab("communications")}
                  >
                    Communications
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {activeTab === "details" ? (
                  <div className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">Priority</p>
                      <p className="font-medium capitalize">{selected.priority}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{formatWhen(selected.created_at)}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-muted-foreground">Diagnostic notes</p>
                      <p className="font-medium">{selected.diagnostic_notes || "No diagnostic notes yet."}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Conversation timeline</h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            qc.invalidateQueries({ queryKey: ["ticket-timeline", selected.id] });
                            qc.invalidateQueries({ queryKey: ["ticket-communications", selected.id] });
                          }}
                        >
                          <RefreshCw className="mr-2 h-3 w-3" />
                          Refresh
                        </Button>
                      </div>
                      {communicationsLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
                      {events.map((event) => (
                        <div key={`${event.kind}-${event.id}`} className="rounded-md border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                {event.kind === "email" ? (
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                ) : event.kind === "sms" ? (
                                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{event.title}</p>
                                <p className="text-xs text-muted-foreground">{formatWhen(event.at)} · {event.status}</p>
                              </div>
                            </div>
                          </div>
                          {event.body && <p className="mt-3 whitespace-pre-wrap text-sm">{event.body}</p>}
                          {event.error && <p className="mt-2 text-sm text-red-700">{event.error}</p>}
                          {event.attachments?.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {event.attachments.map((attachment, index) => (
                                <span key={`${attachment.filename}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
                                  <Paperclip className="h-3 w-3" />
                                  {attachment.filename}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </section>

                    <aside className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Reply via email</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <select className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm" onChange={(e) => loadTemplate(e.target.value)} defaultValue="">
                            <option value="">Load template...</option>
                            {templates.map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                          <Input placeholder="Subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                          <textarea
                            className="min-h-32 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                            placeholder="HTML email body"
                            value={emailHtml}
                            onChange={(e) => setEmailHtml(e.target.value)}
                          />
                          <Input type="file" multiple onChange={(e) => setEmailFiles(e.target.files)} />
                          <Button
                            className="w-full"
                            variant="accent"
                            disabled={!emailSubject || !emailHtml || sendEmailMutation.isPending}
                            onClick={() => sendEmailMutation.mutate()}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Send email
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Reply via SMS</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <textarea
                            className="min-h-28 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                            placeholder="SMS message"
                            value={smsMessage}
                            onChange={(e) => setSmsMessage(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">{smsMessage.length}/1600 characters</p>
                          <Button
                            className="w-full"
                            variant="accent"
                            disabled={!smsMessage || sendSmsMutation.isPending}
                            onClick={() => sendSmsMutation.mutate()}
                          >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Send SMS
                          </Button>
                        </CardContent>
                      </Card>
                    </aside>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center text-muted-foreground">Select a ticket to view details</CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
