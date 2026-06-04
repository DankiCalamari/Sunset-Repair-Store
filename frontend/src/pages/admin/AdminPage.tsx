import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Eye,
  FileText,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Shield,
  UserCog,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";
import { DEFAULT_DOCUMENT_TEMPLATE } from "@/types/commerce";
import type { AdminUser, DocumentTemplate } from "@/types/commerce";

const roles = ["owner", "manager", "technician", "sales"];
const automationEvents = [
  ["ticket_created", "Ticket Created"],
  ["quote_ready", "Quote Ready"],
  ["quote_approved", "Quote Approved"],
  ["repair_started", "Repair Started"],
  ["waiting_parts", "Waiting Parts"],
  ["ready_for_pickup", "Ready For Pickup"],
  ["repair_completed", "Repair Completed"],
  ["warranty_reminder", "Warranty Reminder"],
] as const;

type AdminTab = "general" | "branding" | "templates" | "communications" | "automations";

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-1"}`} />
      </button>
      {label}
    </label>
  );
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("general");
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userForm, setUserForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    role: "technician",
    password: "",
    is_active: true,
  });
  const [settingsForm, setSettingsForm] = useState({
    business_name: "",
    legal_name: "",
    abn: "",
    email: "",
    phone: "",
    address_line1: "",
    city: "",
    state: "",
    postcode: "",
    tax_rate: "0.1",
    ticket_prefix: "",
    next_ticket_seq: "1",
    branding_logo_url: "",
    branding_logo_data_url: "",
    branding_primary_color: "#1e3a5f",
    branding_accent_color: "#d97706",
    branding_footer_text: "Thank you for your business.",
    quote_template: { ...DEFAULT_DOCUMENT_TEMPLATE } as DocumentTemplate,
    invoice_template: { ...DEFAULT_DOCUMENT_TEMPLATE } as DocumentTemplate,
    smtp_host: "",
    smtp_port: "587",
    smtp_username: "",
    smtp_password: "",
    smtp_from_email: "",
    smtp_security: "starttls" as "starttls" | "ssl" | "none",
    imap_enabled: false,
    imap_host: "",
    imap_port: "993",
    imap_username: "",
    imap_password: "",
    imap_mailbox: "INBOX",
    imap_security: "ssl" as "starttls" | "ssl" | "none",
    sms_api_url: "",
    sms_api_key: "",
    sms_webhook_public_key: "",
    sms_sending_number: "",
    automations: {} as Record<string, { email: boolean; sms: boolean }>,
  });
  const qc = useQueryClient();
  const previewRef = useRef<HTMLIFrameElement>(null);

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminApi.users,
  });
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: adminApi.settings,
  });

  useEffect(() => {
    if (!settings) return;
    const emailSettings = settings.email_settings as {
      smtp?: Record<string, unknown>;
      imap?: Record<string, unknown>;
      automations?: Record<string, { email?: boolean; sms?: boolean }>;
    };
    const smsSettings = settings.sms_settings as { gateway?: Record<string, unknown> };
    const smtp = emailSettings?.smtp || {};
    const imap = emailSettings?.imap || {};
    const gateway = (smsSettings as Record<string, unknown>)?.gateway || {};
    const automations = Object.fromEntries(
      automationEvents.map(([key]) => [
        key,
        {
          email: Boolean(emailSettings?.automations?.[key]?.email),
          sms: Boolean(emailSettings?.automations?.[key]?.sms),
        },
      ])
    );
    setSettingsForm({
      business_name: settings.business_name,
      legal_name: settings.legal_name || "",
      abn: settings.abn || "",
      email: settings.email || "",
      phone: settings.phone || "",
      address_line1: settings.address_line1 || "",
      city: settings.city || "",
      state: settings.state || "",
      postcode: settings.postcode || "",
      tax_rate: String(settings.tax_rate),
      ticket_prefix: settings.ticket_prefix,
      next_ticket_seq: String(settings.next_ticket_seq),
      branding_logo_url: String(settings.branding_json?.logo_url || ""),
      branding_logo_data_url: String(settings.branding_json?.logo_data_url || ""),
      branding_primary_color: String(settings.branding_json?.primary_color || "#1e3a5f"),
      branding_accent_color: String(settings.branding_json?.accent_color || "#d97706"),
      branding_footer_text: String(settings.branding_json?.footer_text || "Thank you for your business."),
      quote_template: { ...DEFAULT_DOCUMENT_TEMPLATE, ...(settings.quote_template_json || {}) },
      invoice_template: { ...DEFAULT_DOCUMENT_TEMPLATE, ...(settings.invoice_template_json || {}) },
      smtp_host: String(smtp.host || ""),
      smtp_port: String(smtp.port || "587"),
      smtp_username: String(smtp.username || ""),
      smtp_password: String(smtp.password || ""),
      smtp_from_email: String(smtp.from_email || ""),
      smtp_security:
        smtp.security === "ssl" || smtp.security === "none" || smtp.security === "starttls"
          ? (smtp.security as "starttls" | "ssl" | "none")
          : Number(smtp.port) === 465
            ? "ssl"
            : "starttls",
      imap_enabled: Boolean((imap as Record<string, unknown>).enabled),
      imap_host: String(imap.host || ""),
      imap_port: String(imap.port || "993"),
      imap_username: String(imap.username || ""),
      imap_password: String(imap.password || ""),
      imap_mailbox: String(imap.mailbox || "INBOX"),
      imap_security:
        imap.security === "ssl" || imap.security === "none" || imap.security === "starttls"
          ? (imap.security as "starttls" | "ssl" | "none")
          : (imap.ssl_enabled === false && Number(imap.port) === 143)
            ? "starttls"
            : Number(imap.port) === 143
              ? "starttls"
              : "ssl",
      sms_api_url: String(gateway.api_url || ""),
      sms_api_key: String(gateway.api_key || ""),
      sms_webhook_public_key: String(gateway.webhook_public_key || ""),
      sms_sending_number: String(gateway.sending_number || ""),
      automations,
    });
  }, [settings]);

  const resetUserForm = () => {
    setEditingUser(null);
    setUserForm({ email: "", full_name: "", phone: "", role: "technician", password: "", is_active: true });
  };

  const openEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setUserForm({
      email: user.email,
      full_name: user.full_name,
      phone: user.phone || "",
      role: user.role,
      password: "",
      is_active: user.is_active,
    });
    setShowUserForm(true);
  };

  const saveUserMutation = useMutation({
    mutationFn: () => {
      const payload = {
        email: userForm.email,
        full_name: userForm.full_name,
        phone: userForm.phone || undefined,
        role: userForm.role,
        is_active: userForm.is_active,
        ...(userForm.password ? { password: userForm.password } : {}),
      };
      if (editingUser) return adminApi.updateUser(editingUser.id, payload);
      return adminApi.createUser({ ...payload, password: userForm.password });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setShowUserForm(false);
      resetUserForm();
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      adminApi.updateSettings({
        business_name: settingsForm.business_name,
        legal_name: settingsForm.legal_name || null,
        abn: settingsForm.abn || null,
        email: settingsForm.email || null,
        phone: settingsForm.phone,
        address_line1: settingsForm.address_line1 || null,
        city: settingsForm.city || null,
        state: settingsForm.state || null,
        postcode: settingsForm.postcode || null,
        tax_rate: parseFloat(settingsForm.tax_rate),
        ticket_prefix: settingsForm.ticket_prefix,
        next_ticket_seq: parseInt(settingsForm.next_ticket_seq, 10),
        branding: {
          logo_url: settingsForm.branding_logo_url || undefined,
          ...(settingsForm.branding_logo_data_url
            ? { logo_data_url: settingsForm.branding_logo_data_url }
            : {}),
          primary_color: settingsForm.branding_primary_color,
          accent_color: settingsForm.branding_accent_color,
          footer_text: settingsForm.branding_footer_text,
        },
        quote_template: settingsForm.quote_template,
        invoice_template: settingsForm.invoice_template,
        smtp: {
          host: settingsForm.smtp_host,
          port: parseInt(settingsForm.smtp_port, 10),
          username: settingsForm.smtp_username,
          password: settingsForm.smtp_password,
          from_email: settingsForm.smtp_from_email,
          security: settingsForm.smtp_security,
        },
        imap: {
          enabled: settingsForm.imap_enabled,
          host: settingsForm.imap_host,
          port: parseInt(settingsForm.imap_port, 10),
          username: settingsForm.imap_username,
          password: settingsForm.imap_password,
          mailbox: settingsForm.imap_mailbox,
          security: settingsForm.imap_security,
        },
        sms_gateway: {
          api_url: settingsForm.sms_api_url,
          api_key: settingsForm.sms_api_key,
          webhook_public_key: settingsForm.sms_webhook_public_key,
          sending_number: settingsForm.sms_sending_number,
        },
        automations: settingsForm.automations,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-settings"] }),
  });

  const testSmtpMutation = useMutation({
    mutationFn: () =>
      adminApi.testSmtp({
        to: settingsForm.email || undefined,
        smtp: {
          host: settingsForm.smtp_host,
          port: parseInt(settingsForm.smtp_port, 10),
          username: settingsForm.smtp_username,
          password: settingsForm.smtp_password,
          from_email: settingsForm.smtp_from_email,
          security: settingsForm.smtp_security,
        },
      }),
  });

  const testImapMutation = useMutation({
    mutationFn: () =>
      adminApi.testImap({
        imap: {
          host: settingsForm.imap_host,
          port: parseInt(settingsForm.imap_port, 10),
          username: settingsForm.imap_username,
          password: settingsForm.imap_password,
          mailbox: settingsForm.imap_mailbox,
          security: settingsForm.imap_security,
        },
      }),
  });

  // Template preview
  const [previewDoc, setPreviewDoc] = useState<"quote" | "invoice">("quote");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewTokenRef = useRef(0);

  const updatePreview = useCallback(
    async (docType: "quote" | "invoice") => {
      const token = ++previewTokenRef.current;
      try {
        const template = docType === "quote" ? settingsForm.quote_template : settingsForm.invoice_template;
        const blob =
          docType === "quote"
            ? await adminApi.previewQuoteTemplate(template as unknown as Record<string, unknown>)
            : await adminApi.previewInvoiceTemplate(template as unknown as Record<string, unknown>);
        if (token !== previewTokenRef.current) return;
        const url = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        // preview failed silently
      }
    },
    [settingsForm.quote_template, settingsForm.invoice_template],
  );

  const handlePreview = useCallback(() => {
    updatePreview(previewDoc);
  }, [previewDoc, updatePreview]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    const currentPreviewUrl = previewUrl;
    return () => {
      if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
    };
  }, [previewUrl]);

  const updateQuoteTemplate = (partial: Partial<DocumentTemplate>) => {
    setSettingsForm((prev) => ({
      ...prev,
      quote_template: { ...prev.quote_template, ...partial },
    }));
  };

  const updateInvoiceTemplate = (partial: Partial<DocumentTemplate>) => {
    setSettingsForm((prev) => ({
      ...prev,
      invoice_template: { ...prev.invoice_template, ...partial },
    }));
  };

  const templateEditor = (docType: "quote" | "invoice") => {
    const tpl = docType === "quote" ? settingsForm.quote_template : settingsForm.invoice_template;
    const update = docType === "quote" ? updateQuoteTemplate : updateInvoiceTemplate;
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <h3 className="font-semibold capitalize">{docType} template settings</h3>

          <section className="space-y-3 rounded-md border p-4">
            <h4 className="text-sm font-medium text-muted-foreground">Header</h4>
            <label className="block text-sm font-medium">
              Document title
              <Input
                className="mt-1"
                placeholder={docType === "quote" ? "QUOTATION" : "TAX INVOICE"}
                value={tpl.title}
                onChange={(e) => update({ title: e.target.value })}
              />
            </label>
            <label className="block text-sm font-medium">
              Subtitle
              <Input
                className="mt-1"
                placeholder="Optional subtitle under the title"
                value={tpl.subtitle}
                onChange={(e) => update({ subtitle: e.target.value })}
              />
            </label>
            <Toggle checked={tpl.show_logo} onChange={(v) => update({ show_logo: v })} label="Show logo" />
            <Toggle
              checked={tpl.show_business_address}
              onChange={(v) => update({ show_business_address: v })}
              label="Show business address"
            />
            <Toggle
              checked={tpl.show_business_contact}
              onChange={(v) => update({ show_business_contact: v })}
              label="Show phone / email / ABN"
            />
            <Toggle checked={tpl.accent_bar} onChange={(v) => update({ accent_bar: v })} label="Show accent bar" />
          </section>

          <section className="space-y-3 rounded-md border p-4">
            <h4 className="text-sm font-medium text-muted-foreground">Customer details</h4>
            <Toggle
              checked={tpl.show_customer_phone}
              onChange={(v) => update({ show_customer_phone: v })}
              label="Show customer phone"
            />
            <Toggle
              checked={tpl.show_customer_email}
              onChange={(v) => update({ show_customer_email: v })}
              label="Show customer email"
            />
            <Toggle
              checked={tpl.show_ticket_number}
              onChange={(v) => update({ show_ticket_number: v })}
              label="Show ticket number"
            />
          </section>

          <section className="space-y-3 rounded-md border p-4">
            <h4 className="text-sm font-medium text-muted-foreground">Line items table</h4>
            <Toggle
              checked={tpl.show_line_type}
              onChange={(v) => update({ show_line_type: v })}
              label='Show [labour] / [parts] labels'
            />
            <label className="block text-sm font-medium">
              Table style
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={tpl.table_style}
                onChange={(e) => update({ table_style: e.target.value })}
              >
                <option value="striped">Striped rows</option>
                <option value="bordered">Bordered</option>
                <option value="minimal">Minimal</option>
              </select>
            </label>
          </section>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Footer & terms</h3>

          <section className="space-y-3 rounded-md border p-4">
            <h4 className="text-sm font-medium text-muted-foreground">Footer</h4>
            <label className="block text-sm font-medium">
              Footer text
              <Input
                className="mt-1"
                value={tpl.footer_text}
                onChange={(e) => update({ footer_text: e.target.value })}
              />
            </label>
            <Toggle
              checked={tpl.show_page_numbers}
              onChange={(v) => update({ show_page_numbers: v })}
              label="Show page numbers"
            />
          </section>

          <section className="space-y-3 rounded-md border p-4">
            <h4 className="text-sm font-medium text-muted-foreground">Terms & conditions</h4>
            <label className="block text-sm font-medium">
              Terms text
              <textarea
                className="mt-1 flex min-h-[100px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                placeholder="Payment is due within 14 days..."
                value={tpl.terms_text}
                onChange={(e) => update({ terms_text: e.target.value })}
              />
            </label>
          </section>

          <div className="flex gap-2">
            <Button
              variant="accent"
              size="sm"
              onClick={() => {
                setPreviewDoc(docType);
                handlePreview();
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => update({ ...DEFAULT_DOCUMENT_TEMPLATE })}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset to defaults
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: "general", label: "General", icon: <Building2 className="h-4 w-4" /> },
    { key: "branding", label: "Branding", icon: <Palette className="h-4 w-4" /> },
    { key: "templates", label: "Document Templates", icon: <FileText className="h-4 w-4" /> },
    { key: "communications", label: "Communications", icon: <Shield className="h-4 w-4" /> },
    { key: "automations", label: "Automations", icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin</h2>
          <p className="text-muted-foreground">Manage staff accounts and business settings</p>
        </div>
        <Button
          variant="accent"
          onClick={() => {
            resetUserForm();
            setShowUserForm(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add user
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/30 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users + General Settings */}
      {activeTab === "general" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Users ({users?.length ?? 0})</CardTitle>
              <Shield className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0">
              {usersLoading && <p className="px-6 pb-4 text-sm text-muted-foreground">Loading...</p>}
              {users?.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => openEditUser(user)}
                  className="grid w-full gap-3 border-b px-6 py-4 text-left hover:bg-muted/50 md:grid-cols-[1fr_auto_auto] md:items-center"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <UserCog className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{user.full_name}</p>
                      <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">Last login: {formatDate(user.last_login_at)}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">{user.role}</span>
                  <span className={user.is_active ? "text-sm text-green-700" : "text-sm text-muted-foreground"}>
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Business settings</CardTitle>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {settingsLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
              <label className="block text-sm font-medium">
                Business name
                <Input
                  className="mt-1"
                  value={settingsForm.business_name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, business_name: e.target.value })}
                />
              </label>
              <label className="block text-sm font-medium">
                Email
                <Input
                  className="mt-1"
                  type="email"
                  value={settingsForm.email}
                  onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                />
              </label>
              <label className="block text-sm font-medium">
                Phone
                <Input
                  className="mt-1"
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                />
              </label>
              <label className="block text-sm font-medium">
                Legal name
                <Input
                  className="mt-1"
                  placeholder="Registered business name for invoices"
                  value={settingsForm.legal_name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, legal_name: e.target.value })}
                />
              </label>
              <label className="block text-sm font-medium">
                ABN
                <Input
                  className="mt-1"
                  value={settingsForm.abn}
                  onChange={(e) => setSettingsForm({ ...settingsForm, abn: e.target.value })}
                />
              </label>
              <label className="block text-sm font-medium">
                Street address
                <Input
                  className="mt-1"
                  value={settingsForm.address_line1}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address_line1: e.target.value })}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-sm font-medium">
                  City
                  <Input
                    className="mt-1"
                    value={settingsForm.city}
                    onChange={(e) => setSettingsForm({ ...settingsForm, city: e.target.value })}
                  />
                </label>
                <label className="block text-sm font-medium">
                  State
                  <Input
                    className="mt-1"
                    value={settingsForm.state}
                    onChange={(e) => setSettingsForm({ ...settingsForm, state: e.target.value })}
                  />
                </label>
                <label className="block text-sm font-medium">
                  Postcode
                  <Input
                    className="mt-1"
                    value={settingsForm.postcode}
                    onChange={(e) => setSettingsForm({ ...settingsForm, postcode: e.target.value })}
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  GST rate
                  <Input
                    className="mt-1"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={settingsForm.tax_rate}
                    onChange={(e) => setSettingsForm({ ...settingsForm, tax_rate: e.target.value })}
                  />
                </label>
                <label className="block text-sm font-medium">
                  Ticket prefix
                  <Input
                    className="mt-1"
                    value={settingsForm.ticket_prefix}
                    onChange={(e) => setSettingsForm({ ...settingsForm, ticket_prefix: e.target.value.toUpperCase() })}
                  />
                </label>
              </div>
              <label className="block text-sm font-medium">
                Next ticket number
                <Input
                  className="mt-1"
                  type="number"
                  min="1"
                  value={settingsForm.next_ticket_seq}
                  onChange={(e) => setSettingsForm({ ...settingsForm, next_ticket_seq: e.target.value })}
                />
              </label>
              <Button
                className="w-full"
                variant="accent"
                disabled={!settingsForm.business_name || saveSettingsMutation.isPending}
                onClick={() => saveSettingsMutation.mutate()}
              >
                <Save className="mr-2 h-4 w-4" />
                Save settings
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Branding */}
      {activeTab === "branding" && (
        <Card>
          <CardHeader>
            <CardTitle>Branding for PDFs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Logo and colours appear on generated quote and invoice PDFs.
              </p>
              <label className="block text-sm font-medium">
                Logo URL
                <Input
                  className="mt-1"
                  placeholder="https://yoursite.com/logo.png"
                  value={settingsForm.branding_logo_url}
                  onChange={(e) => setSettingsForm({ ...settingsForm, branding_logo_url: e.target.value })}
                />
              </label>
              <label className="block text-sm font-medium">
                Or upload logo
                <Input
                  className="mt-1"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () =>
                      setSettingsForm({
                        ...settingsForm,
                        branding_logo_data_url: String(reader.result || ""),
                      });
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {(settingsForm.branding_logo_data_url || settingsForm.branding_logo_url) && (
                <img
                  src={settingsForm.branding_logo_data_url || settingsForm.branding_logo_url}
                  alt="Logo preview"
                  className="h-16 max-w-[220px] rounded border bg-white object-contain p-2"
                />
              )}
            </section>
            <section className="space-y-3">
              <label className="block text-sm font-medium">
                Primary colour
                <div className="mt-1 flex gap-2">
                  <Input
                    type="color"
                    className="h-10 w-16 cursor-pointer p-1"
                    value={settingsForm.branding_primary_color}
                    onChange={(e) => setSettingsForm({ ...settingsForm, branding_primary_color: e.target.value })}
                  />
                  <Input
                    value={settingsForm.branding_primary_color}
                    onChange={(e) => setSettingsForm({ ...settingsForm, branding_primary_color: e.target.value })}
                  />
                </div>
              </label>
              <label className="block text-sm font-medium">
                Accent colour
                <div className="mt-1 flex gap-2">
                  <Input
                    type="color"
                    className="h-10 w-16 cursor-pointer p-1"
                    value={settingsForm.branding_accent_color}
                    onChange={(e) => setSettingsForm({ ...settingsForm, branding_accent_color: e.target.value })}
                  />
                  <Input
                    value={settingsForm.branding_accent_color}
                    onChange={(e) => setSettingsForm({ ...settingsForm, branding_accent_color: e.target.value })}
                  />
                </div>
              </label>
              <label className="block text-sm font-medium">
                PDF footer text
                <Input
                  className="mt-1"
                  value={settingsForm.branding_footer_text}
                  onChange={(e) => setSettingsForm({ ...settingsForm, branding_footer_text: e.target.value })}
                />
              </label>
              <Button
                variant="accent"
                disabled={saveSettingsMutation.isPending}
                onClick={() => saveSettingsMutation.mutate()}
              >
                <Save className="mr-2 h-4 w-4" />
                Save branding
              </Button>
            </section>
          </CardContent>
        </Card>
      )}

      {/* Document Templates */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sub-tabs for quote / invoice */}
              <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
                <button
                  type="button"
                  onClick={() => setPreviewDoc("quote")}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    previewDoc === "quote"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Quote template
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc("invoice")}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    previewDoc === "invoice"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Invoice template
                </button>
              </div>

              {templateEditor(previewDoc)}

              <div className="flex justify-end">
                <Button
                  variant="accent"
                  disabled={saveSettingsMutation.isPending}
                  onClick={() => saveSettingsMutation.mutate()}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save templates
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Live preview</CardTitle>
              <Button variant="outline" size="sm" onClick={handlePreview}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh preview
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-muted/20 p-2">
                {previewUrl ? (
                  <iframe
                    ref={previewRef}
                    src={previewUrl}
                    title="PDF preview"
                    className="h-[600px] w-full rounded border-0"
                  />
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    Click "Preview" to generate a sample PDF
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Communications */}
      {activeTab === "communications" && (
        <Card>
          <CardHeader>
            <CardTitle>Communications</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-3">
            <section className="space-y-3">
              <h3 className="font-semibold">SMTP email</h3>
              <Input placeholder="SMTP host" value={settingsForm.smtp_host} onChange={(e) => setSettingsForm({ ...settingsForm, smtp_host: e.target.value })} />
              <Input type="number" placeholder="SMTP port" value={settingsForm.smtp_port} onChange={(e) => setSettingsForm({ ...settingsForm, smtp_port: e.target.value })} />
              <Input placeholder="SMTP username" value={settingsForm.smtp_username} onChange={(e) => setSettingsForm({ ...settingsForm, smtp_username: e.target.value })} />
              <Input type="password" placeholder="SMTP password" value={settingsForm.smtp_password} onChange={(e) => setSettingsForm({ ...settingsForm, smtp_password: e.target.value })} />
              <Input type="email" placeholder="From email" value={settingsForm.smtp_from_email} onChange={(e) => setSettingsForm({ ...settingsForm, smtp_from_email: e.target.value })} />
              <label className="block text-sm font-medium">
                Security
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={settingsForm.smtp_security}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      smtp_security: e.target.value as "starttls" | "ssl" | "none",
                      smtp_port: e.target.value === "ssl" ? "465" : e.target.value === "starttls" ? "587" : settingsForm.smtp_port,
                    })
                  }
                >
                  <option value="starttls">STARTTLS (port 587)</option>
                  <option value="ssl">SSL/TLS (port 465)</option>
                  <option value="none">None (port 25)</option>
                </select>
              </label>
              <p className="text-xs text-muted-foreground">
                Use STARTTLS for Microsoft 365 and Gmail. Use SSL/TLS if your provider requires port 465.
              </p>
              <Button
                variant="accent"
                disabled={!settingsForm.smtp_host || testSmtpMutation.isPending}
                onClick={() => testSmtpMutation.mutate()}
              >
                {testSmtpMutation.isPending ? "Testing..." : "Test SMTP"}
              </Button>
              {testSmtpMutation.isSuccess && (
                <p className="text-sm text-green-700">{testSmtpMutation.data.message}</p>
              )}
              {testSmtpMutation.isError && (
                <p className="text-sm text-red-700">
                  {testSmtpMutation.error instanceof Error ? testSmtpMutation.error.message : "SMTP test failed"}
                </p>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold">IMAP inbound email</h3>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settingsForm.imap_enabled} onChange={(e) => setSettingsForm({ ...settingsForm, imap_enabled: e.target.checked })} />
                Poll mailbox every 2 minutes
              </label>
              <Input placeholder="IMAP host" value={settingsForm.imap_host} onChange={(e) => setSettingsForm({ ...settingsForm, imap_host: e.target.value })} />
              <Input type="number" placeholder="IMAP port" value={settingsForm.imap_port} onChange={(e) => setSettingsForm({ ...settingsForm, imap_port: e.target.value })} />
              <Input placeholder="IMAP username" value={settingsForm.imap_username} onChange={(e) => setSettingsForm({ ...settingsForm, imap_username: e.target.value })} />
              <Input type="password" placeholder="IMAP password" value={settingsForm.imap_password} onChange={(e) => setSettingsForm({ ...settingsForm, imap_password: e.target.value })} />
              <Input placeholder="Mailbox" value={settingsForm.imap_mailbox} onChange={(e) => setSettingsForm({ ...settingsForm, imap_mailbox: e.target.value })} />
              <label className="block text-sm font-medium">
                Security
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={settingsForm.imap_security}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      imap_security: e.target.value as "starttls" | "ssl" | "none",
                      imap_port: e.target.value === "ssl" ? "993" : e.target.value === "starttls" ? "143" : settingsForm.imap_port,
                    })
                  }
                >
                  <option value="ssl">SSL/TLS (port 993)</option>
                  <option value="starttls">STARTTLS (port 143)</option>
                  <option value="none">None (port 143)</option>
                </select>
              </label>
              <p className="text-xs text-muted-foreground">
                Use SSL/TLS for Microsoft 365 and Gmail. Use STARTTLS if your provider requires port 143.
              </p>
              <Button
                variant="accent"
                disabled={!settingsForm.imap_host || !settingsForm.imap_username || testImapMutation.isPending}
                onClick={() => testImapMutation.mutate()}
              >
                {testImapMutation.isPending ? "Testing..." : "Test IMAP"}
              </Button>
              {testImapMutation.isSuccess && (
                <p className="text-sm text-green-700">{testImapMutation.data.message}</p>
              )}
              {testImapMutation.isError && (
                <p className="text-sm text-red-700">
                  {testImapMutation.error instanceof Error ? testImapMutation.error.message : "IMAP test failed"}
                </p>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold">SMS Gateway</h3>
              <Input placeholder="API URL (e.g. https://api.provider.com/sms)" value={settingsForm.sms_api_url} onChange={(e) => setSettingsForm({ ...settingsForm, sms_api_url: e.target.value })} />
              <Input type="password" placeholder="API key" value={settingsForm.sms_api_key} onChange={(e) => setSettingsForm({ ...settingsForm, sms_api_key: e.target.value })} />
              <Input placeholder="Webhook public key (for signature verification)" value={settingsForm.sms_webhook_public_key} onChange={(e) => setSettingsForm({ ...settingsForm, sms_webhook_public_key: e.target.value })} />
              <Input placeholder="Sending number" value={settingsForm.sms_sending_number} onChange={(e) => setSettingsForm({ ...settingsForm, sms_sending_number: e.target.value })} />
              <p className="text-xs text-muted-foreground">Inbound SMS webhook: /api/v1/webhooks/sms/inbound</p>
            </section>
          </CardContent>
        </Card>
      )}

      {/* Automations */}
      {activeTab === "automations" && (
        <Card>
          <CardHeader>
            <CardTitle>Notification automations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {automationEvents.map(([key, label]) => (
              <div key={key} className="grid gap-3 rounded-md border px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <span className="font-medium">{label}</span>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settingsForm.automations[key]?.email || false}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        automations: {
                          ...settingsForm.automations,
                          [key]: { ...(settingsForm.automations[key] || { sms: false }), email: e.target.checked },
                        },
                      })
                    }
                  />
                  Email
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settingsForm.automations[key]?.sms || false}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        automations: {
                          ...settingsForm.automations,
                          [key]: { ...(settingsForm.automations[key] || { email: false }), sms: e.target.checked },
                        },
                      })
                    }
                  />
                  SMS
                </label>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* User form modal */}
      {showUserForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingUser ? "Edit user" : "Add user"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Full name"
                value={userForm.full_name}
                onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
              />
              <Input
                placeholder="Email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
              />
              <select
                className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <Input
                placeholder={editingUser ? "New password (leave blank to keep)" : "Password"}
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={userForm.is_active}
                  onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                />
                Active user
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUserForm(false);
                    resetUserForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="accent"
                  disabled={
                    !userForm.full_name ||
                    !userForm.email ||
                    (!editingUser && userForm.password.length < 8) ||
                    saveUserMutation.isPending
                  }
                  onClick={() => saveUserMutation.mutate()}
                >
                  Save user
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
