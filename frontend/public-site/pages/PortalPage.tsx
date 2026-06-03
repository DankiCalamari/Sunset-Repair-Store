import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Download, FileText, MessageSquare, Shield, Ticket } from "lucide-react";
import { Button, Input, PageIntro, Textarea } from "../components/ui";
import { formatMoney, PublicPortalSummary, publicWebsiteApi } from "../api";

export function PortalPage() {
  const [contact, setContact] = useState("");
  const [ticketReference, setTicketReference] = useState("");
  const [messageText, setMessageText] = useState("");
  const [warrantyIssue, setWarrantyIssue] = useState("");
  const [warrantyText, setWarrantyText] = useState("");
  const [summary, setSummary] = useState<PublicPortalSummary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ticketById = useMemo(
    () => new Map((summary?.repairs ?? []).map((r) => [r.id, r.ticket_number])),
    [summary]
  );

  async function loadPortal() {
    setNotice(null);
    setError(null);
    try {
      const response = await publicWebsiteApi.portal(contact);
      setSummary(response);
      if (response.repairs[0]) setTicketReference(response.repairs[0].ticket_number);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load portal.");
    }
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    await publicWebsiteApi.sendMessage(ticketReference, contact, messageText);
    setMessageText("");
    setNotice("Message sent and synced to your repair ticket.");
  }

  async function submitWarranty(e: FormEvent) {
    e.preventDefault();
    await publicWebsiteApi.submitWarrantyClaim(ticketReference, contact, warrantyIssue, warrantyText);
    setWarrantyIssue("");
    setWarrantyText("");
    setNotice("Warranty claim submitted and synced to your repair ticket.");
  }

  async function approveQuote(quoteId: string, quoteTicketReference: string) {
    await publicWebsiteApi.approveQuote(quoteId, quoteTicketReference, contact);
    setNotice("Quote approved. The repair team has been notified.");
    await loadPortal();
  }

  return (
    <>
      <PageIntro
        eyebrow="Customer portal"
        title="Your repairs, messages, quotes, and invoices"
        text="Access your repair history, send messages, approve quotes, download invoices, and submit warranty claims."
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Login */}
        <div className="mx-auto max-w-md rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Access your portal</h2>
          <p className="mt-2 text-sm text-stone-600">Enter your email or phone number to view your repairs.</p>
          <div className="mt-4 flex gap-3">
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone" className="flex-1" />
            <Button onClick={loadPortal}>Open Portal</Button>
          </div>
          {notice && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700">{notice}</p>}
          {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        </div>

        {summary && (
          <div className="mt-10 space-y-8">
            {/* Repairs */}
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-xl font-black">
                <Ticket className="h-5 w-5 text-orange-600" />
                Repairs
              </h3>
              {summary.repairs.length === 0 ? (
                <p className="text-sm text-stone-500">No repairs found for this contact.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {summary.repairs.map((repair) => (
                    <button
                      key={repair.id}
                      type="button"
                      onClick={() => setTicketReference(repair.ticket_number)}
                      className={`rounded-xl border p-4 text-left transition ${
                        ticketReference === repair.ticket_number ? "border-orange-400 bg-orange-50" : "border-orange-100 bg-white hover:bg-orange-50"
                      }`}
                    >
                      <p className="font-black">{repair.ticket_number}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-stone-400">{repair.status.replace(/_/g, " ")}</p>
                      <p className="mt-2 text-sm text-stone-600">{repair.issue_description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Messages */}
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-xl font-black">
                <MessageSquare className="h-5 w-5 text-orange-600" />
                Send a message
              </h3>
              <form onSubmit={sendMessage} className="rounded-xl border border-orange-100 bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Input value={ticketReference} onChange={(e) => setTicketReference(e.target.value)} placeholder="Ticket number" />
                </div>
                <Textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={3} placeholder="Ask a question or send an update..." className="mt-3" />
                <Button type="submit" disabled={!ticketReference || !contact || !messageText} className="mt-3">
                  Send Message
                </Button>
              </form>
            </div>

            {/* Quotes */}
            {summary.quotes.length > 0 && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-xl font-black">
                  <FileText className="h-5 w-5 text-orange-600" />
                  Quotes
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {summary.quotes.map((quote) => {
                    const relatedTicket = ticketById.get(quote.ticket_id) || ticketReference;
                    return (
                      <div key={quote.id} className="rounded-xl border border-orange-100 bg-white p-4">
                        <p className="font-black">{quote.quote_number}</p>
                        <p className="mt-1 text-sm text-stone-600">{formatMoney(quote.total)} · {quote.status}</p>
                        <Button onClick={() => approveQuote(quote.id, relatedTicket)} disabled={quote.status === "approved"} size="sm" className="mt-3">
                          {quote.status === "approved" ? "Approved" : "Approve Quote"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Invoices */}
            {summary.invoices.length > 0 && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-xl font-black">
                  <Download className="h-5 w-5 text-orange-600" />
                  Invoices
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {summary.invoices.map((invoice) => {
                    const relatedTicket = invoice.ticket_id ? ticketById.get(invoice.ticket_id) : ticketReference;
                    return (
                      <div key={invoice.id} className="rounded-xl border border-orange-100 bg-white p-4">
                        <p className="font-black">{invoice.invoice_number}</p>
                        <p className="mt-1 text-sm text-stone-600">{formatMoney(invoice.total)} · {invoice.status}</p>
                        <Button onClick={() => publicWebsiteApi.downloadInvoice(invoice.id, relatedTicket || ticketReference, contact)} variant="outline" size="sm" className="mt-3">
                          <Download className="mr-2 h-3 w-3" />
                          Download PDF
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Warranty */}
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-xl font-black">
                <Shield className="h-5 w-5 text-orange-600" />
                Warranty claim
              </h3>
              <form onSubmit={submitWarranty} className="rounded-xl border border-orange-100 bg-white p-4">
                <Input value={warrantyIssue} onChange={(e) => setWarrantyIssue(e.target.value)} placeholder="Warranty issue" />
                <Textarea value={warrantyText} onChange={(e) => setWarrantyText(e.target.value)} rows={3} placeholder="Describe the problem..." className="mt-3" />
                <Button type="submit" disabled={!ticketReference || !contact || !warrantyIssue || !warrantyText} className="mt-3">
                  Submit Warranty Claim
                </Button>
              </form>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
