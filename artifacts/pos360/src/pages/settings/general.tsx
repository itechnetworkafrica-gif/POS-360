import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Globe, ImagePlus, Loader2, X, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency, CURRENCIES } from "@/context/currency";
import { useAuth } from "@/context/auth";

async function uploadFile(file: File): Promise<string> {
  // Step 1: Reserve upload URL (server stamps ownership at this point)
  const urlRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!urlRes.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath, reservationToken } = await urlRes.json() as { uploadURL: string; objectPath: string; reservationToken: string };
  // Step 2: Upload directly to GCS
  const putRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!putRes.ok) throw new Error("Upload failed");
  // Step 3: Confirm upload — server verifies reservationToken and sets private ACL
  const confirmRes = await fetch("/api/storage/uploads/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ objectPath, reservationToken }),
  });
  if (!confirmRes.ok) throw new Error("Failed to confirm upload");
  return `/api${objectPath}`;
}

function LogoPicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast({ title: "Image too large", description: "Max 2 MB", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const url = await uploadFile(file);
      onChange(url);
      toast({ title: "Logo uploaded ✓" });
    } catch {
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Business Logo</Label>
      <div className="flex items-center gap-4">
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="relative h-20 w-20 rounded-xl border-2 border-dashed border-border hover:border-primary/60 flex items-center justify-center cursor-pointer overflow-hidden transition-colors"
        >
          {value ? (
            <>
              <img src={value} alt="Logo" className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onChange(""); }}
                className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </>
          ) : uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground opacity-50" />
          )}
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Upload your logo</p>
          <p>PNG, JPG, SVG · max 2 MB</p>
          <p>Shown on receipts and app header</p>
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "Choose File"}
          </Button>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
}

export default function GeneralSettings() {
  const { currency, setCurrency } = useCurrency();
  const { user } = useAuth();
  const { toast } = useToast();

  const SETTINGS_KEY = "pos360_general_settings";
  const saved = (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}"); } catch { return {}; } })();

  const [form, setForm] = useState({
    businessName:          saved.businessName   ?? user?.businessName ?? "My Business",
    logoUrl:               saved.logoUrl        ?? "",
    currency:              saved.currency       ?? currency.code,
    language:              saved.language       ?? "en",
    timezone:              saved.timezone       ?? "Africa/Lagos",
    dateFormat:            saved.dateFormat     ?? "DD/MM/YYYY",
    lowStockNotifications: saved.lowStockNotifications ?? true,
    salesNotifications:    saved.salesNotifications    ?? true,
    autoBackup:            saved.autoBackup             ?? true,
  });

  const set = (key: string, value: string | boolean) => setForm(f => ({ ...f, [key]: value }));

  const save = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(form));
    if (form.currency !== currency.code) setCurrency(form.currency);
    toast({ title: "Settings saved ✓", description: "Changes applied across the system." });
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">General Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Business-wide configuration</p>
        </div>
        <Button onClick={save}><Save className="h-4 w-4 mr-2" />Save Changes</Button>
      </div>

      {/* Business Identity */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Business Identity</CardTitle></CardHeader>
        <CardContent className="grid gap-5">
          <LogoPicker value={form.logoUrl} onChange={url => set("logoUrl", url)} />
          <div className="grid gap-2">
            <Label>Business Name</Label>
            <Input value={form.businessName} onChange={e => set("businessName", e.target.value)} placeholder="Your business name" />
          </div>
        </CardContent>
      </Card>

      {/* Locale */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Locale & Regional</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label>Currency <span className="text-xs text-muted-foreground ml-1">— changes currency throughout the whole system</span></Label>
            <Select value={form.currency} onValueChange={v => set("currency", v)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} {c.code} — {c.name} ({c.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.currency !== currency.code && (
              <p className="text-xs text-amber-600 dark:text-amber-400">⚠ Currency will update system-wide when you Save Changes.</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Timezone</Label>
            <Select value={form.timezone} onValueChange={v => set("timezone", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Lagos">Africa/Lagos (WAT, UTC+1)</SelectItem>
                <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT, UTC+3)</SelectItem>
                <SelectItem value="Africa/Accra">Africa/Accra (GMT, UTC+0)</SelectItem>
                <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (SAST, UTC+2)</SelectItem>
                <SelectItem value="Africa/Monrovia">Africa/Monrovia (GMT, UTC+0)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
                <SelectItem value="Asia/Dubai">Asia/Dubai (GST, UTC+4)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Date Format</Label>
            <Select value={form.dateFormat} onValueChange={v => set("dateFormat", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Language</Label>
            <Select value={form.language} onValueChange={v => set("language", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="fr">🇫🇷 Français</SelectItem>
                <SelectItem value="yo">🇳🇬 Yorùbá</SelectItem>
                <SelectItem value="ha">🇳🇬 Hausa</SelectItem>
                <SelectItem value="ig">🇳🇬 Igbo</SelectItem>
                <SelectItem value="sw">🇰🇪 Kiswahili</SelectItem>
                <SelectItem value="ar">🇸🇦 Arabic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader><CardTitle>Notifications & Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "lowStockNotifications", label: "Low Stock Alerts",    desc: "Notify when items fall below reorder level" },
            { key: "salesNotifications",    label: "Daily Sales Summary", desc: "Receive end-of-day sales report" },
            { key: "autoBackup",            label: "Automatic Backup",    desc: "Back up data daily to the cloud" },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <Label className="text-base">{item.label}</Label>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={form[item.key as keyof typeof form] as boolean}
                onCheckedChange={v => set(item.key, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} size="lg" className="gap-2"><Save className="h-4 w-4" />Save Changes</Button>
      </div>
    </div>
  );
}
