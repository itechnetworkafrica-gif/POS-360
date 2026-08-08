import { useListProducts, useListCategories, useDeleteProduct, getListProductsQueryKey, useCreateProduct, useUpdateProduct } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash2, ImagePlus, X, Loader2, Package } from "lucide-react";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/currency";

// ─── Image upload helper ────────────────────────────────────────────
async function uploadImage(file: File): Promise<string> {
  // 1. Request presigned URL (server reserves ownership at this point)
  const urlRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!urlRes.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath, reservationToken } = await urlRes.json() as { uploadURL: string; objectPath: string; reservationToken: string };

  // 2. Upload directly to GCS
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error("Upload failed");

  // 3. Confirm upload — server verifies reservationToken and sets private ACL
  const confirmRes = await fetch("/api/storage/uploads/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ objectPath, reservationToken }),
  });
  if (!confirmRes.ok) throw new Error("Failed to confirm upload");

  return objectPath; // e.g. /objects/abc123
}

// ─── Image picker component ─────────────────────────────────────────
function ImagePicker({ value, onChange }: { value?: string; onChange: (url: string) => void }) {
  const inputRef         = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(value ?? "");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Image too large", description: "Max 5 MB", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const path = await uploadImage(file);
      const publicUrl = `/api${path}`;
      setPreview(URL.createObjectURL(file));
      onChange(publicUrl);
    } catch {
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const clear = () => { setPreview(""); onChange(""); if (inputRef.current) inputRef.current.value = ""; };

  return (
    <div className="space-y-2">
      <Label>Product Image</Label>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl overflow-hidden flex items-center justify-center cursor-pointer transition-colors ${
          preview ? "border-primary/40" : "border-border hover:border-primary/60 hover:bg-muted/30"
        }`}
        style={{ height: 160 }}
      >
        {preview ? (
          <>
            <img src={preview} alt="Product" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); clear(); }}
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
            {uploading
              ? <Loader2 className="h-8 w-8 animate-spin text-primary" />
              : <ImagePlus className="h-8 w-8 opacity-40" />}
            <span className="text-xs">{uploading ? "Uploading…" : "Click to upload image"}</span>
            <span className="text-[10px] opacity-50">PNG, JPG, WEBP · max 5 MB</span>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
}

// ─── Product form dialog ─────────────────────────────────────────────
type ProductFormData = {
  name: string; price: number | string; cost: number | string;
  stockQuantity: number | string; sku: string; categoryId?: number | string;
  imageUrl?: string; trackStock: boolean; description?: string;
};

function ProductFormDialog({ mode, product, onClose }: {
  mode: "create" | "edit"; product?: any; onClose?: () => void;
}) {
  const { sym } = useCurrency();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductFormData>(() => product
    ? { name: product.name ?? "", price: product.price ?? 0, cost: product.cost ?? 0,
        stockQuantity: product.stockQuantity ?? 0, sku: product.sku ?? "",
        categoryId: product.categoryId ?? "", imageUrl: product.imageUrl ?? "",
        trackStock: product.trackStock ?? true, description: product.description ?? "" }
    : { name: "", price: "", cost: "", stockQuantity: "", sku: "", categoryId: "",
        imageUrl: "", trackStock: true, description: "" });

  const { data: categories } = useListCategories({});
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const queryClient    = useQueryClient();
  const { toast }      = useToast();

  const close = () => { setOpen(false); onClose?.(); };

  const submit = () => {
    if (!form.name.trim()) { toast({ title: "Product name required", variant: "destructive" }); return; }
    const payload = {
      name: form.name.trim(),
      description: form.description || undefined,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || undefined,
      stockQuantity: Number(form.stockQuantity) || 0,
      sku: form.sku || undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      imageUrl: form.imageUrl || undefined,
      trackStock: form.trackStock,
      storeId: undefined,
    };
    const invalidate = () => queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    if (mode === "create") {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Product created ✓" }); invalidate(); close(); },
        onError: () => toast({ title: "Failed to create product", variant: "destructive" }),
      });
    } else {
      updateMutation.mutate({ id: product.id, data: payload }, {
        onSuccess: () => { toast({ title: "Product updated ✓" }); invalidate(); close(); },
        onError: () => toast({ title: "Failed to update product", variant: "destructive" }),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      {mode === "create"
        ? <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
        : <Button variant="ghost" size="icon" onClick={() => setOpen(true)}><Edit className="h-4 w-4" /></Button>}

      <Dialog open={open} onOpenChange={v => { if (!v) close(); else setOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Add Product" : "Edit Product"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Image */}
            <ImagePicker
              value={form.imageUrl}
              onChange={url => setForm(f => ({ ...f, imageUrl: url }))}
            />

            {/* Name + Description */}
            <div className="space-y-1.5">
              <Label>Product Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Coca-Cola 50cl" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional description" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Price + Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Selling Price ({sym})</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Cost Price ({sym})</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.cost}
                  onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
              </div>
            </div>

            {/* SKU + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>SKU / Barcode</Label>
                <Input placeholder="e.g. SKU-001" value={form.sku}
                  onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={String(form.categoryId ?? "")} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No category</SelectItem>
                    {(categories ?? []).map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Stock Quantity</Label>
                <Input type="number" min="0" placeholder="0" value={form.stockQuantity}
                  onChange={e => setForm(f => ({ ...f, stockQuantity: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Track Inventory</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={form.trackStock}
                    onCheckedChange={v => setForm(f => ({ ...f, trackStock: v }))} />
                  <span className="text-sm text-muted-foreground">{form.trackStock ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={close} disabled={isPending}>Cancel</Button>
            <Button onClick={submit} disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create Product" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Products page ───────────────────────────────────────────────────
export default function Products() {
  const { fmt } = useCurrency();
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useListProducts({ search: search || undefined });
  const { data: categories } = useListCategories({});
  const deleteProduct  = useDeleteProduct();
  const queryClient    = useQueryClient();
  const { toast }      = useToast();

  const catMap = Object.fromEntries((categories ?? []).map(c => [c.id, c.name]));

  const handleDelete = (id: number) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    deleteProduct.mutate({ id }, {
      onSuccess: () => { toast({ title: "Product deleted" }); queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); },
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your product catalog</p>
        </div>
        <ProductFormDialog mode="create" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading products…
            </div>
          ) : !products?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Package className="h-10 w-10 opacity-30" />
              <p className="text-sm">No products yet. Add your first product above.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(products ?? []).map(product => {
                  const qty = parseFloat(String(product.stockQuantity));
                  const low = product.lowStockThreshold ? qty <= parseFloat(String(product.lowStockThreshold)) : qty <= 5;
                  return (
                    <TableRow key={product.id} className="group">
                      <TableCell>
                        {product.imageUrl
                          ? <img src={product.imageUrl} alt={product.name} className="h-9 w-9 rounded-lg object-cover border" />
                          : <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground/50" />
                            </div>}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{product.name}</div>
                        {product.description && <div className="text-xs text-muted-foreground truncate max-w-[180px]">{product.description}</div>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {product.categoryId ? catMap[product.categoryId] ?? "—" : "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground font-mono">
                        {product.sku || "—"}
                      </TableCell>
                      <TableCell className="font-semibold text-sm">{fmt(parseFloat(String(product.price)))}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {low && qty > 0 && <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />}
                          {qty === 0 && <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />}
                          <span className={`text-sm ${qty === 0 ? "text-red-600 font-semibold" : low ? "text-amber-600" : ""}`}>{qty}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ProductFormDialog mode="edit" product={product} />
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="text-destructive h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
