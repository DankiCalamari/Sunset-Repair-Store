import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Save, Shield, UserCog } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";
import type { AdminUser } from "@/types/commerce";

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
];

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AdminPage() {
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
    email: "",
    phone: "",
    tax_rate: "0.1",
    ticket_prefix: "",
    next_ticket_seq: "1",
    smtp_host: "",
    smtp_port: "587",
    smtp_username: "",
    smtp_password: "",
    smtp_from_email: "",
    smtp_tls_enabled: true,
    imap_enabled: false,
    imap_host: "",
    imap_port: "993",
    imap_username: "",
    imap_password: "",
    imap_mailbox: "INBOX",
    imap_ssl_enabled: true,
    sms_api_url: "",
    sms_api_key: "",
    sms_webhook_public_key: "",
    sms_sending_number: "",
    automations: {} as Record<string, { email: boolean; sms: boolean }>,
  });
  const qc = useQueryClient();

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
    const smtp = emailSettings.smtp || {};
    const imap = emailSettings.imap || {};
    const gateway = smsSettings.gateway || {};
    const automations = Object.fromEntries(
      automationEvents.map(([key]) => [
        key,
        {
          email: Boolean(emailSettings.automations?.[key]?.email),
          sms: Boolean(emailSettings.automations?.[key]?.sms),
        },
      ])
    );
    setSettingsForm({
      business_name: settings.business_name,
      email: settings.email || "",
      phone: settings.phone || "",
      tax_rate: String(settings.tax_rate),
      ticket_prefix: settings.ticket_prefix,
      next_ticket_seq: String(settings.next_ticket_seq),
      smtp_host: String(smtp.host || ""),
      smtp_port: String(smtp.port || "587"),
      smtp_username: String(smtp.username || ""),
      smtp_password: String(smtp.password || ""),
      smtp_from_email: String(smtp.from_email || ""),
      smtp_tls_enabled: smtp.tls_enabled !== false,
      imap_enabled: Boolean(imap.enabled),
      imap_host: String(imap.host || ""),
      imap_port: String(imap.port || "993"),
      imap_username: String(imap.username || ""),
      imap_password: String(imap.password || ""),
      imap_mailbox: String(imap.mailbox || "INBOX"),
      imap_ssl_enabled: imap.ssl_enabled !== false,
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
        email: settingsForm.email || null,
        phone: settingsForm.phone,
        tax_rate: parseFloat(settingsForm.tax_rate),
        ticket_prefix: settingsForm.ticket_prefix,
        next_ticket_seq: parseInt(settingsForm.next_ticket_seq, 10),
        smtp: {
          host: settingsForm.smtp_host,
          port: parseInt(settingsForm.smtp_port, 10),
          username: settingsForm.smtp_username,
          password: settingsForm.smtp_password,
          from_email: settingsForm.smtp_from_email,
          tls_enabled: settingsForm.smtp_tls_enabled,
        },
        imap: {
          enabled: settingsForm.imap_enabled,
          host: settingsForm.imap_host,
          port: parseInt(settingsForm.imap_port, 10),
          username: settingsForm.imap_username,
          password: settingsForm.imap_password,
          mailbox: settingsForm.imap_mailbox,
          ssl_enabled: settingsForm.imap_ssl_enabled,
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
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settingsForm.smtp_tls_enabled} onChange={(e) => setSettingsForm({ ...settingsForm, smtp_tls_enabled: e.target.checked })} />
              TLS enabled
            </label>
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
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settingsForm.imap_ssl_enabled} onChange={(e) => setSettingsForm({ ...settingsForm, imap_ssl_enabled: e.target.checked })} />
              SSL enabled
            </label>
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
