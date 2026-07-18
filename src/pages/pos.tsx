import { useState, useEffect, useRef, useCallback } from "react";
import { useListProducts, useListCategories, useCreateSale, getListProductsQueryKey } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Search, ShoppingBag, Plus, Minus, Trash2, CreditCard, Banknote,
  ShoppingCart, Scan, Camera, CameraOff, Bluetooth, BluetoothConnected,
  BluetoothOff, Printer, Smartphone, ClipboardList, X, CheckCircle2,
  Wifi, AlertCircle, User, Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Product } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrency } from "@/context/currency";

interface CartItem extends Product {
  cartItemId: string;
  cartQuantity: number;
}

// ─── Bluetooth Printer ────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let printerDevice: any | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let printerCharacteristic: any | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function connectBluetooth(): Promise<{ device: any; char: any }> {
  const device = await (navigator as any).bluetooth.requestDevice({
    filters: [
      { namePrefix: "POS" },
      { namePrefix: "Printer" },
      { namePrefix: "RPP" },
      { namePrefix: "Thermal" },
      { namePrefix: "TSP" },
    ],
    optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
  });
  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb");
  const char = await service.getCharacteristic("00002af1-0000-1000-8000-00805f9b34fb");
  return { device, char };
}

function encodeReceipt(lines: string[]): Uint8Array {
  const ESC = 0x1b;
  const GS  = 0x1d;
  const init    = [ESC, 0x40];
  const center  = [ESC, 0x61, 0x01];
  const left    = [ESC, 0x61, 0x00];
  const bold    = [ESC, 0x45, 0x01];
  const boldOff = [ESC, 0x45, 0x00];
  const cut     = [GS,  0x56, 0x00];

  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const cmd = (arr: number[]) => parts.push(new Uint8Array(arr));
  const txt = (s: string) => parts.push(encoder.encode(s + "\n"));

  cmd(init);
  cmd(center); cmd(bold);
  txt("POS360");
  txt("iTech Network Africa");
  cmd(boldOff);
  txt("--------------------------------");
  lines.forEach(l => { cmd(left); txt(l); });
  txt("--------------------------------");
  cmd(center);
  txt("Thank you! Come again.");
  txt(new Date().toLocaleString("en-NG"));
  cmd(cut);

  const total = parts.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  parts.forEach(p => { out.set(p, off); off += p.length; });
  return out;
}

// ─── Quick Sale Form ──────────────────────────────────────────────────
interface QuickSaleItem { name: string; qty: number; price: number; }
function QuickSaleDialog({ onComplete }: { onComplete: (items: QuickSaleItem[], method: string, customer: string) => void }) {
  const { sym } = useCurrency();
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [method, setMethod] = useState("cash");
  const [items, setItems] = useState<QuickSaleItem[]>([{ name: "", qty: 1, price: 0 }]);
  const { data: products } = useListProducts({});

  const addRow = () => setItems(p => [...p, { name: "", qty: 1, price: 0 }]);
  const removeRow = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof QuickSaleItem, value: string | number) =>
    setItems(p => p.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  // Auto-fill price when product name matches
  const handleNameChange = (i: number, val: string) => {
    updateRow(i, "name", val);
    const match = products?.find(p => p.name.toLowerCase() === val.toLowerCase() || p.sku?.toLowerCase() === val.toLowerCase());
    if (match) setItems(p => p.map((r, idx) => idx === i ? { ...r, name: match.name, price: match.price } : r));
  };

  const total = items.reduce((s, r) => s + r.qty * r.price, 0);
  const valid = items.some(r => r.name.trim() && r.price > 0);

  const submit = () => {
    onComplete(items.filter(r => r.name.trim() && r.price > 0), method, customer);
    setOpen(false);
    setCustomer(""); setMethod("cash");
    setItems([{ name: "", qty: 1, price: 0 }]);
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <ClipboardList className="h-4 w-4" /> Quick Sale
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Quick Sale Form
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Customer Name (optional)</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Walk-in customer" value={customer} onChange={e => setCustomer(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Items</Label>
                <Button size="sm" variant="ghost" onClick={addRow} className="h-7 text-xs gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add Row
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_60px_80px_32px] gap-2 items-center">
                    <Input
                      placeholder="Product / service name"
                      value={row.name}
                      onChange={e => handleNameChange(i, e.target.value)}
                      list="product-suggestions"
                      className="text-sm"
                    />
                    <datalist id="product-suggestions">
                      {products?.map(p => <option key={p.id} value={p.name} />)}
                    </datalist>
                    <Input
                      type="number" min={1} value={row.qty}
                      onChange={e => updateRow(i, "qty", parseInt(e.target.value) || 1)}
                      className="text-sm text-center"
                    />
                    <Input
                      type="number" min={0} step="0.01" value={row.price || ""}
                      onChange={e => updateRow(i, "price", parseFloat(e.target.value) || 0)}
                      placeholder={sym}
                      className="text-sm"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeRow(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{sym}{total.toLocaleString()}</span>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "cash", label: "Cash", icon: Banknote },
                  { id: "card", label: "Card", icon: CreditCard },
                  { id: "mobile_money", label: "Mobile Money", icon: Smartphone },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-sm font-medium ${method === m.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}
                  >
                    <m.icon className="h-5 w-5" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!valid} className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Complete Sale · {sym}{total.toLocaleString()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Camera Scanner ───────────────────────────────────────────────────
function CameraScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting");
  const [lastCode, setLastCode] = useState("");

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: 640, height: 480 } });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("scanning");

        if (!("BarcodeDetector" in window)) { setStatus("error"); return; }
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"] });

        const scan = async () => {
          if (!mounted || !videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              setLastCode(code);
              onDetect(code);
            }
          } catch {}
          animRef.current = requestAnimationFrame(scan);
        };
        animRef.current = requestAnimationFrame(scan);
      } catch (e) {
        setStatus("error");
      }
    };
    start();
    return () => {
      mounted = false;
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [onDetect]);

  return (
    <div className="space-y-3">
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {status === "scanning" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-primary rounded-lg">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-bounce" />
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-4">
            <AlertCircle className="h-10 w-10 text-red-400 mb-2" />
            <p className="text-sm font-medium">Camera not available or BarcodeDetector not supported</p>
            <p className="text-xs text-gray-400 mt-1">Requires Chrome/Edge 83+. Use USB scanner instead.</p>
          </div>
        )}
      </div>
      {lastCode && (
        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
          <CheckCircle2 className="h-4 w-4" /> Scanned: {lastCode}
        </div>
      )}
      <p className="text-xs text-muted-foreground text-center">
        Point camera at a barcode or QR code. Detected codes add product to cart automatically.
      </p>
    </div>
  );
}

// ─── Bluetooth Printer Panel ──────────────────────────────────────────
function PrinterPanel({ cart, subtotal, tax, total, onClose }: {
  cart: CartItem[]; subtotal: number; tax: number; total: number; onClose: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "printing" | "error">("idle");
  const [deviceName, setDeviceName] = useState("");
  const { toast } = useToast();
  const { sym } = useCurrency();

  const supported = "bluetooth" in (navigator as any);

  const connect = async () => {
    if (!supported) { toast({ title: "Bluetooth not supported", description: "Use Chrome on desktop/Android", variant: "destructive" }); return; }
    setStatus("connecting");
    try {
      const { device, char } = await connectBluetooth();
      printerDevice = device;
      printerCharacteristic = char;
      setDeviceName(device.name ?? "Printer");
      setStatus("connected");
      toast({ title: `Connected to ${device.name ?? "Bluetooth Printer"}` });
    } catch (e: any) {
      setStatus("error");
      toast({ title: "Connection failed", description: e.message, variant: "destructive" });
    }
  };

  const print = async () => {
    if (!printerCharacteristic) return;
    setStatus("printing");
    try {
      const lines = [
        `Date: ${new Date().toLocaleString("en-NG")}`,
        "",
        ...cart.map(i => `${i.name.padEnd(20)} x${i.cartQuantity}`),
        ...cart.map(i => `  ${sym}${(i.price * i.cartQuantity).toFixed(2)}`),
        "",
        `Subtotal:   ${sym}${subtotal.toFixed(2)}`,
        `Tax (10%):  ${sym}${tax.toFixed(2)}`,
        `TOTAL:      ${sym}${total.toFixed(2)}`,
      ];
      const data = encodeReceipt(lines);
      // Send in 512-byte chunks
      for (let i = 0; i < data.length; i += 512) {
        await printerCharacteristic.writeValueWithoutResponse(data.slice(i, i + 512));
        await new Promise(r => setTimeout(r, 50));
      }
      setStatus("connected");
      toast({ title: "Receipt printed!" });
    } catch (e: any) {
      setStatus("error");
      toast({ title: "Print failed", description: e.message, variant: "destructive" });
    }
  };

  const printBrowserFallback = () => {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(`
      <html><head><title>Receipt</title><style>
        body{font-family:monospace;padding:20px;max-width:320px;margin:auto}
        h2,h3{text-align:center;margin:4px 0} hr{border:none;border-top:1px dashed #000;margin:8px 0}
        .row{display:flex;justify-content:space-between} .center{text-align:center}
      </style></head><body>
      <h2>POS360</h2><h3>iTech Network Africa</h3><hr/>
      ${cart.map(i => `<div class="row"><span>${i.name} x${i.cartQuantity}</span><span>${sym}${(i.price * i.cartQuantity).toFixed(2)}</span></div>`).join("")}
      <hr/><div class="row"><span>Subtotal</span><span>${sym}${subtotal.toFixed(2)}</span></div>
      <div class="row"><span>Tax (10%)</span><span>${sym}${tax.toFixed(2)}</span></div>
      <div class="row"><strong>TOTAL</strong><strong>${sym}${total.toFixed(2)}</strong></div>
      <hr/><p class="center">Thank you! Come again.</p>
      <p class="center" style="font-size:11px">${new Date().toLocaleString("en-NG")}</p>
      <script>window.print(); window.onafterprint=()=>window.close();</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div className="space-y-4">
      <div className={`p-3 rounded-lg border-2 flex items-center gap-3 ${status === "connected" ? "border-green-500 bg-green-50 dark:bg-green-950/30" : status === "error" ? "border-red-500 bg-red-50 dark:bg-red-950/30" : "border-border bg-muted/20"}`}>
        {status === "connected" ? <BluetoothConnected className="h-5 w-5 text-green-600 shrink-0" /> :
         status === "error" ? <BluetoothOff className="h-5 w-5 text-red-500 shrink-0" /> :
         <Bluetooth className="h-5 w-5 text-muted-foreground shrink-0" />}
        <div className="min-w-0">
          <p className="text-sm font-semibold">{status === "connected" ? deviceName : status === "connecting" ? "Searching..." : "No printer connected"}</p>
          <p className="text-xs text-muted-foreground">{status === "connected" ? "Ready to print" : "Pair a Bluetooth thermal printer"}</p>
        </div>
      </div>

      {status !== "connected" && (
        <Button onClick={connect} disabled={status === "connecting"} className="w-full gap-2">
          <Bluetooth className="h-4 w-4" />
          {status === "connecting" ? "Connecting..." : "Connect Bluetooth Printer"}
        </Button>
      )}

      {status === "connected" && (
        <Button onClick={print} disabled={cart.length === 0} className="w-full gap-2">
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
      )}

      <div className="relative flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Button variant="outline" onClick={printBrowserFallback} disabled={cart.length === 0} className="w-full gap-2">
        <Printer className="h-4 w-4" /> Print via Browser (USB/Network)
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Bluetooth requires Chrome on desktop/Android. USB/network printers work via browser print dialog.
      </p>
    </div>
  );
}

// ─── Main POS Component ───────────────────────────────────────────────
export default function POS() {
  const { sym } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [printerOpen, setPrinterOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const usbBuffer = useRef("");
  const usbLastTime = useRef(0);

  const { data: products, isLoading: productsLoading } = useListProducts({
    categoryId: selectedCategory,
    search: searchTerm || undefined,
  });
  const { data: categories } = useListCategories({});
  const createSale = useCreateSale();

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      return [...prev, { ...product, cartItemId: Math.random().toString(), cartQuantity: 1 }];
    });
  }, []);

  const handleBarcode = useCallback((code: string) => {
    if (!products) return;
    const product = products.find(p => p.sku === code || p.sku?.toLowerCase() === code.toLowerCase());
    if (product) {
      addToCart(product);
      toast({ title: `✓ Added: ${product.name}`, description: `SKU: ${code}` });
      setScannerOpen(false);
    } else {
      // Try partial name match
      const nameMatch = products.find(p => p.name.toLowerCase().includes(code.toLowerCase()));
      if (nameMatch) { addToCart(nameMatch); toast({ title: `✓ Added: ${nameMatch.name}` }); setScannerOpen(false); }
      else { setSearchTerm(code); toast({ title: `Barcode: ${code}`, description: "No product found. Showing search results.", variant: "destructive" }); }
    }
  }, [products, addToCart, toast]);

  // USB Barcode scanner (keyboard wedge) — detects fast sequential keypresses ending in Enter
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (scannerOpen) return;
      const now = Date.now();
      const timeDelta = now - usbLastTime.current;
      usbLastTime.current = now;

      if (e.key === "Enter") {
        const code = usbBuffer.current.trim();
        usbBuffer.current = "";
        if (code.length >= 3) handleBarcode(code);
      } else if (e.key.length === 1) {
        if (timeDelta > 80 && usbBuffer.current.length === 0) {
          // Likely manual typing — only accumulate if we see fast follow-up
          usbBuffer.current = e.key;
        } else if (timeDelta < 80) {
          // Fast input = scanner
          usbBuffer.current += e.key;
        } else {
          usbBuffer.current = "";
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleBarcode, scannerOpen]);

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => item.cartItemId === id ? { ...item, cartQuantity: Math.max(1, item.cartQuantity + delta) } : item));
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.cartItemId !== id));

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const handleCheckout = (method: "cash" | "card" | "mobile_money") => {
    if (cart.length === 0) return;
    createSale.mutate({
      data: {
        storeId: 1, employeeId: 1, paymentMethod: method,
        total,
        items: cart.map(item => ({ productId: item.id, quantity: item.cartQuantity, unitPrice: item.price, total: item.price * item.cartQuantity })),
      },
    }, {
      onSuccess: () => {
        toast({ title: "✓ Sale completed!", description: `${sym}${total.toLocaleString()} received` });
        setCart([]);
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      },
      onError: () => toast({ title: "Sale failed", variant: "destructive" }),
    });
  };

  const handleQuickSale = (items: { name: string; qty: number; price: number }[], method: string, customer: string) => {
    const sub = items.reduce((s, i) => s + i.qty * i.price, 0);
    const t = sub * 0.1;
    createSale.mutate({
      data: {
        storeId: 1, employeeId: 1, paymentMethod: method as any,
        total: sub + t,
        items: items.map(i => ({ productId: 1, quantity: i.qty, unitPrice: i.price, total: i.qty * i.price })),
      },
    }, {
      onSuccess: () => {
        toast({ title: "✓ Quick sale completed!", description: customer ? `Customer: ${customer}` : undefined });
      },
      onError: () => toast({ title: "Quick sale failed", variant: "destructive" }),
    });
  };

  const CartContent = () => (
    <>
      <div className="p-3 border-b flex items-center justify-between bg-primary/5 shrink-0">
        <h2 className="font-bold text-base flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" /> Order
          {cart.length > 0 && <Badge className="text-xs px-1.5 py-0">{cart.length}</Badge>}
        </h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setPrinterOpen(true)} className="h-7 w-7 p-0">
            <Printer className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCart([])} disabled={cart.length === 0} className="h-7 text-xs">
            Clear
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
              <ShoppingBag className="h-10 w-10 opacity-20" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs text-center opacity-70">Tap a product, scan a barcode, or use Quick Sale</p>
            </div>
          ) : cart.map(item => (
            <div key={item.cartItemId} className="flex gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                <p className="text-muted-foreground text-xs">{sym}{item.price.toLocaleString()} each</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <p className="font-bold text-sm">{sym}{(item.price * item.cartQuantity).toLocaleString()}</p>
                <div className="flex items-center gap-0.5 bg-background border rounded-md">
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => updateQuantity(item.cartItemId, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-7 text-center text-sm font-bold">{item.cartQuantity}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => updateQuantity(item.cartItemId, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm text-destructive" onClick={() => removeFromCart(item.cartItemId)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 border-t bg-card space-y-3 shrink-0">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{sym}{subtotal.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax (10%)</span><span>{sym}{tax.toLocaleString()}</span></div>
          <div className="flex justify-between font-bold text-lg pt-1.5 border-t">
            <span>Total</span>
            <span className="text-primary">{sym}{total.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            className="h-12 flex-col gap-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            onClick={() => handleCheckout("cash")} disabled={cart.length === 0 || createSale.isPending}
          >
            <Banknote className="h-4 w-4" /> Cash
          </Button>
          <Button
            className="h-12 flex-col gap-0.5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
            onClick={() => handleCheckout("card")} disabled={cart.length === 0 || createSale.isPending}
          >
            <CreditCard className="h-4 w-4" /> Card
          </Button>
          <Button
            className="h-12 flex-col gap-0.5 bg-purple-600 hover:bg-purple-700 text-white text-xs"
            onClick={() => handleCheckout("mobile_money")} disabled={cart.length === 0 || createSale.isPending}
          >
            <Smartphone className="h-4 w-4" /> Mobile
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-full w-full bg-muted/10 flex-col md:flex-row">
      {/* Product Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="p-3 border-b bg-card flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products, barcode, SKU..."
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setScannerOpen(true)} className="gap-1.5 shrink-0">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Scan</span>
          </Button>
          <QuickSaleDialog onComplete={handleQuickSale} />
          {/* Mobile cart toggle */}
          <Button className="md:hidden relative gap-1.5 shrink-0" size="sm" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="h-4 w-4" />
            {cart.length > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-white text-primary text-[10px] font-bold rounded-full flex items-center justify-center">{cart.length}</span>}
          </Button>
        </div>

        {/* USB scanner status */}
        <div className="px-3 py-1.5 bg-muted/30 border-b flex items-center gap-2 text-xs text-muted-foreground">
          <Scan className="h-3.5 w-3.5" />
          <span>USB barcode scanner ready — scan any product barcode to add to cart instantly</span>
        </div>

        {/* Categories */}
        <div className="flex gap-2 p-3 overflow-x-auto bg-card border-b shrink-0">
          <Button variant={selectedCategory === undefined ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(undefined)} className="rounded-full shrink-0 text-xs">
            All
          </Button>
          {categories?.map(cat => (
            <Button key={cat.id} variant={selectedCategory === cat.id ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat.id)} className="rounded-full shrink-0 text-xs">
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Product Grid */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-3">
            {productsLoading
              ? Array(12).fill(0).map((_, i) => <Card key={i} className="h-40 animate-pulse bg-muted" />)
              : products?.map(product => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:border-primary hover:shadow-md transition-all active:scale-95 flex flex-col overflow-hidden select-none"
                  onClick={() => addToCart(product)}
                >
                  <div className="h-24 bg-muted flex items-center justify-center relative">
                    {product.imageUrl
                      ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      : <Package className="h-8 w-8 text-muted-foreground/30" />}
                    {product.stockQuantity <= (product.lowStockThreshold ?? 5) && (
                      <div className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded font-bold">
                        {product.stockQuantity} left
                      </div>
                    )}
                  </div>
                  <div className="p-2 flex flex-col flex-1 justify-between">
                    <span className="font-medium line-clamp-2 text-xs leading-snug">{product.name}</span>
                    <span className="font-bold text-primary text-sm mt-1">{sym}{product.price.toLocaleString()}</span>
                  </div>
                </Card>
              ))}
          </div>
        </ScrollArea>
      </div>

      {/* Desktop Cart Sidebar */}
      <div className="hidden md:flex w-80 lg:w-96 border-l bg-card flex-col shrink-0 shadow-xl">
        <CartContent />
      </div>

      {/* Mobile Cart Drawer */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="p-0 flex flex-col max-w-full h-[90dvh] sm:max-w-md mx-0 sm:mx-auto rounded-t-2xl sm:rounded-2xl">
          <div className="flex-1 flex flex-col min-h-0">
            <CartContent />
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Camera Barcode Scanner
            </DialogTitle>
          </DialogHeader>
          <CameraScanner onDetect={handleBarcode} onClose={() => setScannerOpen(false)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setScannerOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bluetooth Printer Dialog */}
      <Dialog open={printerOpen} onOpenChange={setPrinterOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" /> Receipt Printer
            </DialogTitle>
          </DialogHeader>
          <PrinterPanel cart={cart} subtotal={subtotal} tax={tax} total={total} onClose={() => setPrinterOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
