import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageSquare, Paperclip, Plus, RefreshCw, Send, StickyNote } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ticketsApi, customersApi, devicesApi } from "@/lib/api";
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
  const [activeTab, setActiveTab] = useState<"details" | "notes" | "communications">("details");
  const [internalNoteDraft, setInternalNoteDraft] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailHtml, setEmailHtml] = useState("");
  const [emailFiles, setEmailFiles] = useState<FileList | null>(null);
  const [smsMessage, setSmsMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    customer_id: "",
    device_id: "",
    issue_description: "",
    priority: "normal",
    customer_notes: "",
    // New device fields
    new_device: false,
    manufacturer: "",
    model: "",
    imei: "",
    serial_number: "",
    colour: "",
    passcode_provided: "",
  });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => ticketsApi.list(),
  });

  useEffect(() => {
    if (!selected && data?.items.length) setSelected(data.items[0]);
  }, [data, selected]);

  useEffect(() => {
    setInternalNoteDraft("");
  }, [selected?.id]);

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

  const { data: internalNotes, isLoading: notesLoading } = useQuery({
    queryKey: ["ticket-notes", selected?.id],
    queryFn: () => ticketsApi.notes(selected!.id),
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

  const addNoteMutation = useMutation({
    mutationFn: () => ticketsApi.addNote(selected!.id, internalNoteDraft.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-notes", selected?.id] });
      setInternalNoteDraft("");
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => customersApi.list(),
    enabled: showCreate,
  });

  const { data: devices } = useQuery({
    queryKey: ["devices", ticketForm.customer_id],
    queryFn: () => devicesApi.byCustomer(ticketForm.customer_id),
    enabled: showCreate && !!ticketForm.customer_id && !ticketForm.new_device,
  });

  const resetTicketForm = () =>
    setTicketForm({
      customer_id: "",
      device_id: "",
      issue_description: "",
      priority: "normal",
      customer_notes: "",
      new_device: false,
      manufacturer: "",
      model: "",
      imei: "",
      serial_number: "",
      colour: "",
      passcode_provided: "",
    });

  const createMutation = useMutation({
    mutationFn: async () => {
      let deviceId = ticketForm.device_id;
      if (ticketForm.new_device) {
        const device = await devicesApi.create({
          customer_id: ticketForm.customer_id,
          manufacturer: ticketForm.manufacturer,
          model: ticketForm.model,
          imei: ticketForm.imei || undefined,
          serial_number: ticketForm.serial_number || undefined,
          colour: ticketForm.colour || undefined,
          passcode_provided: ticketForm.passcode_provided || undefined,
        });
        deviceId = device.id;
      }
      return ticketsApi.create({
        customer_id: ticketForm.customer_id,
        device_id: deviceId,
        issue_description: ticketForm.issue_description,
        priority: ticketForm.priority,
        customer_notes: ticketForm.customer_notes || undefined,
      });
    },
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      setSelected(ticket);
      setActiveTab("details");
      setShowCreate(false);
      resetTicketForm();
    },
  });

  const canCreateTicket =
    !!ticketForm.customer_id &&
    !!ticketForm.issue_description.trim() &&
    (ticketForm.new_device
      ? !!ticketForm.manufacturer.trim() && !!ticketForm.model.trim()
      : !!ticketForm.device_id);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Repair Tickets</h2>
          <p className="text-muted-foreground">Manage repairs from intake to pickup</p>
        </div>
        <Button variant="accent" onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Ticket
        </Button>
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
                  <Button size="sm" variant={activeTab === "notes" ? "default" : "outline"} onClick={() => setActiveTab("notes")}>
                    Internal notes
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
                ) : activeTab === "notes" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">Internal notes</h3>
                        <p className="text-sm text-muted-foreground">Visible to staff only. Not shown to customers.</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                        Staff only
                      </span>
                    </div>

                    {notesLoading && <p className="text-sm text-muted-foreground">Loading notes...</p>}
                    {!notesLoading && internalNotes?.length === 0 && (
                      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No internal notes yet. Add findings, parts used, or handover details for other technicians.
                      </p>
                    )}
                    {internalNotes?.map((note) => (
                      <div key={note.id} className="rounded-md border bg-muted/20 p-4">
                        <div className="flex items-start gap-3">
                          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{note.author_name}</span>
                              <span>·</span>
                              <span>{formatWhen(note.created_at)}</span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm">{note.body}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="space-y-3 border-t pt-4">
                      <label className="block text-sm font-medium">Add note</label>
                      <textarea
                        className="min-h-28 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                        placeholder="e.g. Replaced charging port, tested OK. Customer notified by phone."
                        value={internalNoteDraft}
                        onChange={(e) => setInternalNoteDraft(e.target.value)}
                      />
                      <div className="flex items-center justify-between gap-3">
                        {addNoteMutation.isError && (
                          <p className="text-sm text-red-700">
                            {addNoteMutation.error instanceof Error ? addNoteMutation.error.message : "Failed to add note"}
                          </p>
                        )}
                        <Button
                          className="ml-auto"
                          variant="accent"
                          disabled={!internalNoteDraft.trim() || addNoteMutation.isPending}
                          onClick={() => addNoteMutation.mutate()}
                        >
                          <StickyNote className="mr-2 h-4 w-4" />
                          {addNoteMutation.isPending ? "Saving..." : "Add note"}
                        </Button>
                      </div>
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

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
            <CardHeader>
              <CardTitle>New repair ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Customer</label>
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={ticketForm.customer_id}
                  onChange={(e) =>
                    setTicketForm({
                      ...ticketForm,
                      customer_id: e.target.value,
                      device_id: "",
                      new_device: false,
                    })
                  }
                >
                  <option value="">Select customer...</option>
                  {customers?.items.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              {ticketForm.customer_id && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={ticketForm.new_device}
                      onChange={(e) =>
                        setTicketForm({
                          ...ticketForm,
                          new_device: e.target.checked,
                          device_id: "",
                        })
                      }
                    />
                    Register a new device for this customer
                  </label>

                  {ticketForm.new_device ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="Manufacturer"
                        value={ticketForm.manufacturer}
                        onChange={(e) => setTicketForm({ ...ticketForm, manufacturer: e.target.value })}
                      />
                      <Input
                        placeholder="Model"
                        value={ticketForm.model}
                        onChange={(e) => setTicketForm({ ...ticketForm, model: e.target.value })}
                      />
                      <Input
                        placeholder="IMEI"
                        value={ticketForm.imei}
                        onChange={(e) => setTicketForm({ ...ticketForm, imei: e.target.value })}
                      />
                      <Input
                        placeholder="Serial number"
                        value={ticketForm.serial_number}
                        onChange={(e) => setTicketForm({ ...ticketForm, serial_number: e.target.value })}
                      />
                      <Input
                        placeholder="Colour"
                        value={ticketForm.colour}
                        onChange={(e) => setTicketForm({ ...ticketForm, colour: e.target.value })}
                      />
                      <Input
                        placeholder="Passcode provided"
                        value={ticketForm.passcode_provided}
                        onChange={(e) => setTicketForm({ ...ticketForm, passcode_provided: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-sm font-medium">Device</label>
                      <select
                        className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                        value={ticketForm.device_id}
                        onChange={(e) => setTicketForm({ ...ticketForm, device_id: e.target.value })}
                      >
                        <option value="">Select device...</option>
                        {devices?.map((device) => (
                          <option key={device.id} value={device.id}>
                            {device.manufacturer} {device.model}
                            {device.serial_number ? ` (${device.serial_number})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">Issue description</label>
                <textarea
                  className="min-h-24 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                  placeholder="Describe the reported issue"
                  value={ticketForm.issue_description}
                  onChange={(e) => setTicketForm({ ...ticketForm, issue_description: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Priority</label>
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={ticketForm.priority}
                  onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Customer notes</label>
                <Input
                  placeholder="Optional notes from the customer"
                  value={ticketForm.customer_notes}
                  onChange={(e) => setTicketForm({ ...ticketForm, customer_notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreate(false);
                    resetTicketForm();
                    createMutation.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="accent"
                  disabled={!canCreateTicket || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? "Creating..." : "Create ticket"}
                </Button>
              </div>
              {createMutation.isError && (
                <p className="text-sm text-red-700">
                  {createMutation.error instanceof Error ? createMutation.error.message : "Failed to create ticket"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
