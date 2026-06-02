import { useMutation } from "@tanstack/react-query";
import { Building2, ChevronRight, Lock, Settings } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { setupApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

type Step = "business" | "settings" | "owner";

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "business", label: "Business info", icon: Building2 },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "owner", label: "Owner account", icon: Lock },
];

const AU_TIMEZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Adelaide",
  "Australia/Perth",
  "Australia/Darwin",
  "Australia/Hobart",
  "Australia/Lord_Howe",
];

function autoSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

export function SetupPage() {
  const navigate = useNavigate();
  const { loginDirect } = useAuth();
  const [step, setStep] = useState<Step>("business");

  const [form, setForm] = useState({
    // Business
    business_name: "",
    business_slug: "",
    legal_name: "",
    abn: "",
    email: "",
    phone: "",
    address_line1: "",
    city: "",
    state: "",
    postcode: "",
    // Settings
    timezone: "Australia/Melbourne",
    currency: "AUD",
    ticket_prefix: "RCT",
    tax_rate: "10",
    // Owner
    owner_name: "",
    owner_email: "",
    owner_password: "",
    owner_password_confirm: "",
    verification_code: "",
  });

  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const f =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const sendVerificationCode = async () => {
    setVerificationError(null);
    setVerificationMessage(null);
    setVerificationSent(false);

    if (!form.owner_email) {
      setVerificationError("Enter an email address before requesting a code.");
      return;
    }

    try {
      const result = await setupApi.sendVerificationCode(form.owner_email);
      setVerificationSent(true);
      setVerificationMessage(
        result.debug_code
          ? `Verification code generated. Use code ${result.debug_code} to complete setup.`
          : "Verification code sent to your email."
      );
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : "Failed to send verification code.");
    }
  };

  const mutation = useMutation({
    mutationFn: () =>
      setupApi.run({
        business_name: form.business_name,
        business_slug: form.business_slug,
        legal_name: form.legal_name || undefined,
        abn: form.abn || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address_line1: form.address_line1 || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        postcode: form.postcode || undefined,
        timezone: form.timezone,
        currency: form.currency,
        ticket_prefix: form.ticket_prefix,
        tax_rate: parseFloat(form.tax_rate) / 100,
        owner_name: form.owner_name,
        owner_email: form.owner_email,
        owner_password: form.owner_password,
        verification_code: form.verification_code || undefined,
      }),
    onSuccess: (res) => {
      loginDirect(res.access_token, res.refresh_token, res.user);
      navigate("/");
    },
  });

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const canAdvanceBusiness =
    form.business_name.trim().length > 0 && form.business_slug.trim().length >= 2;

  const canAdvanceSettings =
    form.ticket_prefix.trim().length > 0 &&
    parseFloat(form.tax_rate) >= 0 &&
    parseFloat(form.tax_rate) <= 100;

  const canSubmit =
    form.owner_name.trim().length > 0 &&
    form.owner_email.trim().length > 0 &&
    verificationSent &&
    form.verification_code.trim().length === 6 &&
    form.owner_password.length >= 8 &&
    form.owner_password === form.owner_password_confirm;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900/40 p-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-accent" />
          <h1 className="text-2xl font-bold text-white">Welcome</h1>
          <p className="text-slate-400">Let's get your repair shop set up.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  i < stepIndex
                    ? "bg-green-500 text-white"
                    : i === stepIndex
                    ? "bg-accent text-white"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {i < stepIndex ? "✓" : i + 1}
              </div>
              <span
                className={`hidden text-sm sm:block ${
                  i === stepIndex ? "font-medium text-white" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-slate-600" />
              )}
            </div>
          ))}
        </div>

        {/* Step: Business info */}
        {step === "business" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Business name *</label>
                <Input
                  placeholder="e.g. Sunset Country Tech"
                  value={form.business_name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((p) => ({
                      ...p,
                      business_name: name,
                      business_slug: autoSlug(name),
                    }));
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">URL slug *</label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="e.g. sunset-country-tech"
                    value={form.business_slug}
                    onChange={f("business_slug")}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Lowercase letters, numbers, and hyphens only.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Legal name</label>
                <Input
                  placeholder="e.g. Sunset Country Tech Pty Ltd"
                  value={form.legal_name}
                  onChange={f("legal_name")}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">ABN</label>
                <Input placeholder="e.g. 12 345 678 901" value={form.abn} onChange={f("abn")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <Input type="email" placeholder="hello@yourdomain.com" value={form.email} onChange={f("email")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Phone</label>
                  <Input placeholder="03 5000 0000" value={form.phone} onChange={f("phone")} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Address</label>
                <Input placeholder="Street address" value={form.address_line1} onChange={f("address_line1")} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="mb-1 block text-sm font-medium">City</label>
                  <Input placeholder="Mildura" value={form.city} onChange={f("city")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">State</label>
                  <Input placeholder="VIC" value={form.state} onChange={f("state")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Postcode</label>
                  <Input placeholder="3500" value={form.postcode} onChange={f("postcode")} />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  variant="accent"
                  disabled={!canAdvanceBusiness}
                  onClick={() => setStep("settings")}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Settings */}
        {step === "settings" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Shop settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Timezone *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={form.timezone}
                  onChange={f("timezone")}
                >
                  {AU_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz.replace("Australia/", "")}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Currency</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                    value={form.currency}
                    onChange={f("currency")}
                  >
                    <option value="AUD">AUD — Australian Dollar</option>
                    <option value="NZD">NZD — New Zealand Dollar</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Tax rate (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="10"
                    value={form.tax_rate}
                    onChange={f("tax_rate")}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">GST is 10% in Australia.</p>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Ticket prefix *</label>
                <Input
                  placeholder="e.g. RCT"
                  maxLength={10}
                  value={form.ticket_prefix}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      ticket_prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                    }))
                  }
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Tickets will be numbered {form.ticket_prefix || "RCT"}-0001, {form.ticket_prefix || "RCT"}-0002…
                </p>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep("business")}>Back</Button>
                <Button
                  variant="accent"
                  disabled={!canAdvanceSettings}
                  onClick={() => setStep("owner")}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Owner account */}
        {step === "owner" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Owner account
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                This will be the primary administrator account.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Full name *</label>
                <Input placeholder="Your name" value={form.owner_name} onChange={f("owner_name")} />
              </div>
              <div className="space-y-2">
                <label className="mb-1 block text-sm font-medium">Email address *</label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="email"
                    placeholder="you@yourdomain.com"
                    value={form.owner_email}
                    onChange={(e) => {
                      setVerificationSent(false);
                      setVerificationMessage(null);
                      setVerificationError(null);
                      setForm((p) => ({ ...p, owner_email: e.target.value, verification_code: "" }));
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={sendVerificationCode}
                    disabled={!form.owner_email || verificationSent}
                  >
                    {verificationSent ? "Code sent" : "Send verification code"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  We will send a one-time verification code to this email address.
                </p>
                {verificationMessage && (
                  <p className="text-sm text-emerald-400">{verificationMessage}</p>
                )}
                {verificationError && (
                  <p className="text-sm text-red-600">{verificationError}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Verification code *</label>
                <Input
                  placeholder="Enter verification code"
                  value={form.verification_code}
                  onChange={f("verification_code")}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Password *</label>
                <Input
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={form.owner_password}
                  onChange={f("owner_password")}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Confirm password *</label>
                <Input
                  type="password"
                  placeholder="Repeat password"
                  value={form.owner_password_confirm}
                  onChange={f("owner_password_confirm")}
                />
                {form.owner_password_confirm.length > 0 &&
                  form.owner_password !== form.owner_password_confirm && (
                    <p className="mt-1 text-xs text-destructive">Passwords do not match.</p>
                  )}
              </div>
              {mutation.isError && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {(mutation.error as Error).message}
                </p>
              )}
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep("settings")}>Back</Button>
                <Button
                  variant="accent"
                  disabled={!canSubmit || mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  {mutation.isPending ? "Setting up…" : "Complete setup"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
