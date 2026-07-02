import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import {
  Plus, Pencil, Trash2, Minus, Search, Bell, Moon, Sun, Menu, X,
  ChevronLeft, ChevronRight, AlertTriangle, PackageX, TrendingUp,
  TrendingDown, DollarSign, Users, Calendar as CalendarIcon, FileText,
  Home, Package, Receipt, ArrowUpRight, ArrowDownRight, CheckCircle2,
  ShieldCheck, ClipboardList
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* CONSTANTS & HELPERS                                                     */
/* ---------------------------------------------------------------------- */

const LIGHT = {
  bg: "#F7FAF8",
  surface: "#FFFFFF",
  tint: "#EBF5ED",
  border: "#DCE8DF",
  text: "#222222",
  subtext: "#5B6B60",
  green: "#146E3B",
  greenDark: "#0F5A2F",
  navy: "#144273",
  navyLight: "#E7EDF5",
  amber: "#B7791F",
  amberBg: "#FBF0DB",
  red: "#B42318",
  redBg: "#FBE7E5",
  grey: "#8A9A90",
  greyBg: "#EEF2EF",
};

const DARK = {
  bg: "#0F1613",
  surface: "#161F1B",
  tint: "#1B2A22",
  border: "#26332C",
  text: "#ECF2EE",
  subtext: "#9FB3A7",
  green: "#2E9A5C",
  greenDark: "#227B48",
  navy: "#6E9AD6",
  navyLight: "#1B2536",
  amber: "#E0A94A",
  amberBg: "#3A2E14",
  red: "#F0776B",
  redBg: "#3A1917",
  grey: "#7E9188",
  greyBg: "#1E2823",
};

const INVENTORY_CATEGORIES = ["Chemical", "Bait", "Termiticide", "Equipment", "Other"];
const UNITS = ["bottle", "litre", "kg", "box", "piece"];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Card", "Cheque"];
const PAYMENT_STATUSES = ["Paid in full", "Partial", "Pending"];
const REVENUE_CATEGORIES = [
  { key: "termite", label: "Termite Control", short: "Termite" },
  { key: "products", label: "Products Sold", short: "Products" },
  { key: "fumigation", label: "Cockroach / General Fumigation", short: "Fumigation" },
];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayStr = () => new Date().toISOString().slice(0, 10);
const monthKeyOf = (dateStr) => (dateStr || todayStr()).slice(0, 7);
const thisMonthKey = () => monthKeyOf(todayStr());
const shiftMonthKey = (key, delta) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const lastMonthKey = () => shiftMonthKey(thisMonthKey(), -1);

const fmtPKR = (n) => "PKR " + Math.round(Number(n) || 0).toLocaleString("en-US");
const fmtDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};
const daysUntil = (dateStr) => {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr + "T00:00:00");
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
};
const isExpired = (item) => daysUntil(item.expiryDate) < 0;
const isExpiringSoon = (item) => {
  const d = daysUntil(item.expiryDate);
  return d >= 0 && d <= 30;
};
const isLowStock = (item) => item.quantity > 0 && item.quantity <= (item.lowStockThreshold ?? 5);

/* ---------------------------------------------------------------------- */
/* SEED DATA                                                               */
/* ---------------------------------------------------------------------- */

function seedInventory() {
  const t = new Date();
  const iso = (offsetDays) => {
    const d = new Date(t);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };
  return [
    { id: uid(), name: "Termidor SC 25EC", category: "Termiticide", quantity: 8, unit: "litre", unitPrice: 9500, supplier: "Bayer Pakistan", expiryDate: iso(400), dateAdded: iso(-60), notes: "", lowStockThreshold: 3, status: "active" },
    { id: uid(), name: "K-Othrine Bait Gel", category: "Bait", quantity: 4, unit: "box", unitPrice: 3200, supplier: "Bayer Pakistan", expiryDate: iso(20), dateAdded: iso(-30), notes: "", lowStockThreshold: 5, status: "active" },
    { id: uid(), name: "Cypermethrin 10% EC", category: "Chemical", quantity: 2, unit: "bottle", unitPrice: 1800, supplier: "FMC Corp", expiryDate: iso(-5), dateAdded: iso(-120), notes: "Store away from sunlight", lowStockThreshold: 3, status: "active" },
    { id: uid(), name: "Backpack Sprayer 16L", category: "Equipment", quantity: 3, unit: "piece", unitPrice: 6500, supplier: "Local Distributor", expiryDate: "", dateAdded: iso(-200), notes: "", lowStockThreshold: 1, status: "active" },
    { id: uid(), name: "Fipronil Gel Bait", category: "Bait", quantity: 0, unit: "box", unitPrice: 2900, supplier: "Syngenta", expiryDate: iso(90), dateAdded: iso(-15), notes: "", lowStockThreshold: 4, status: "out_of_stock" },
    { id: uid(), name: "General Fumigation Fogger", category: "Equipment", quantity: 6, unit: "piece", unitPrice: 4200, supplier: "Local Distributor", expiryDate: "", dateAdded: iso(-90), notes: "", lowStockThreshold: 2, status: "active" },
  ];
}

function seedRevenue() {
  const t = new Date();
  const iso = (offsetDays) => {
    const d = new Date(t);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };
  return [
    { id: uid(), category: "termite", description: "Full villa termite treatment", location: "DHA Phase 5, Lahore", amount: 45000, paymentMethod: "Bank Transfer", paymentStatus: "Paid in full", date: iso(-3), customerName: "Ahmed Raza", customerContact: "0300-1234567", notes: "" },
    { id: uid(), category: "fumigation", description: "General cockroach fumigation - kitchen & store", location: "Gulberg III, Lahore", amount: 8000, paymentMethod: "Cash", paymentStatus: "Paid in full", date: iso(-2), customerName: "Sana Malik", customerContact: "", notes: "" },
    { id: uid(), category: "termite", description: "Pre-construction soil treatment", location: "Bahria Town, Lahore", amount: 60000, paymentMethod: "Cheque", paymentStatus: "Partial", date: iso(-1), customerName: "Imran Constructions", customerContact: "0321-9876543", notes: "50% advance received" },
    { id: uid(), category: "fumigation", description: "Warehouse general pest fumigation", location: "Kot Lakhpat, Lahore", amount: 15000, paymentMethod: "Bank Transfer", paymentStatus: "Paid in full", date: iso(-32), customerName: "Ali Textiles", customerContact: "", notes: "" },
    { id: uid(), category: "termite", description: "Termite re-treatment under warranty top-up", location: "Johar Town, Lahore", amount: 12000, paymentMethod: "Cash", paymentStatus: "Paid in full", date: iso(-35), customerName: "Bilal Hussain", customerContact: "", notes: "" },
  ];
}

/* ---------------------------------------------------------------------- */
/* SMALL UI PRIMITIVES                                                     */
/* ---------------------------------------------------------------------- */

function Badge({ children, tone = "grey", c }) {
  const map = {
    red: { bg: c.redBg, fg: c.red },
    amber: { bg: c.amberBg, fg: c.amber },
    green: { bg: c.tint, fg: c.green },
    navy: { bg: c.navyLight, fg: c.navy },
    grey: { bg: c.greyBg, fg: c.grey },
  };
  const s = map[tone] || map.grey;
  return (
    <span style={{
      background: s.bg, color: s.fg, fontSize: 11, fontWeight: 700,
      padding: "3px 9px", borderRadius: 999, letterSpacing: 0.3,
      whiteSpace: "nowrap", textTransform: "uppercase",
    }}>{children}</span>
  );
}

function Card({ children, c, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16,
      boxShadow: "0 1px 2px rgba(20,40,20,0.04)", ...style,
    }}>{children}</div>
  );
}

function Button({ children, onClick, variant = "primary", c, style, type = "button", disabled }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center",
    fontWeight: 600, fontSize: 13.5, borderRadius: 10, padding: "9px 16px",
    cursor: disabled ? "not-allowed" : "pointer", border: "1px solid transparent",
    transition: "filter .15s ease", opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap",
  };
  const variants = {
    primary: { background: c.green, color: "#fff" },
    navy: { background: c.navy, color: "#fff" },
    ghost: { background: "transparent", color: c.text, border: `1px solid ${c.border}` },
    danger: { background: c.redBg, color: c.red },
    subtle: { background: c.tint, color: c.green },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.95)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
      style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function Field({ label, children, c, hint }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12.5, fontWeight: 600, color: c.subtext }}>
      {label}
      {children}
      {hint && <span style={{ fontSize: 11, fontWeight: 500, color: c.amber }}>{hint}</span>}
    </label>
  );
}

function inputStyle(c) {
  return {
    border: `1px solid ${c.border}`, borderRadius: 9, padding: "9px 11px",
    fontSize: 13.5, background: c.bg, color: c.text, outline: "none", width: "100%",
    fontFamily: "inherit",
  };
}

function Modal({ title, onClose, children, c, width = 520 }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(10,20,15,0.45)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: c.surface, borderRadius: 18, width: "100%", maxWidth: width,
        maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        border: `1px solid ${c.border}`,
      }}>
        <div style={{
          position: "sticky", top: 0, background: c.surface, display: "flex",
          alignItems: "center", justifyContent: "space-between", padding: "18px 22px",
          borderBottom: `1px solid ${c.border}`, borderRadius: "18px 18px 0 0", zIndex: 2,
        }}>
          <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: c.navy }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: c.subtext, padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* LOGO                                                                    */
/* ---------------------------------------------------------------------- */

function PestexLogo({ size = 40, c }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill={c.surface} stroke={c.green} strokeWidth="3" />
      <path d="M 4 50 A 46 46 0 0 1 96 50 Z" fill={c.green} />
      <text x="50" y="49" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic"
        fontWeight="800" fontSize="24" fill={c.navy}>Pestex</text>
      <text x="50" y="65" textAnchor="middle" fontFamily="Arial" fontWeight="700"
        fontSize="7" letterSpacing="1" fill={c.text}>PEST-FREE</text>
    </svg>
  );
}

/* ---------------------------------------------------------------------- */
/* INVENTORY MODULE                                                        */
/* ---------------------------------------------------------------------- */

function ItemFormModal({ c, initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || {
    name: "", category: "Chemical", quantity: 0, unit: "bottle", unitPrice: 0,
    supplier: "", expiryDate: "", dateAdded: todayStr(), notes: "", lowStockThreshold: 5,
  });
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const pastExpiry = form.expiryDate && daysUntil(form.expiryDate) < 0;

  const submit = () => {
    if (!form.name.trim()) return setError("Item name is required.");
    if (form.quantity < 0) return setError("Quantity cannot be negative.");
    if (form.unitPrice < 0) return setError("Unit price cannot be negative.");
    setError("");
    onSave(form);
  };

  return (
    <Modal title={initial ? "Edit inventory item" : "Add inventory item"} onClose={onClose} c={c}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Item name" c={c}>
            <input style={inputStyle(c)} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Termidor SC 25EC" />
          </Field>
        </div>
        <Field label="Category" c={c}>
          <select style={inputStyle(c)} value={form.category} onChange={(e) => set("category", e.target.value)}>
            {INVENTORY_CATEGORIES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Supplier" c={c}>
          <input style={inputStyle(c)} value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="e.g. Bayer Pakistan" />
        </Field>
        <Field label="Quantity in stock" c={c}>
          <input type="number" min="0" style={inputStyle(c)} value={form.quantity} onChange={(e) => set("quantity", Number(e.target.value))} />
        </Field>
        <Field label="Unit" c={c}>
          <select style={inputStyle(c)} value={form.unit} onChange={(e) => set("unit", e.target.value)}>
            {UNITS.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Unit price (PKR)" c={c}>
          <input type="number" min="0" style={inputStyle(c)} value={form.unitPrice} onChange={(e) => set("unitPrice", Number(e.target.value))} />
        </Field>
        <Field label="Low-stock alert threshold" c={c}>
          <input type="number" min="0" style={inputStyle(c)} value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Number(e.target.value))} />
        </Field>
        <Field label="Expiry date" c={c} hint={pastExpiry ? "This date is already in the past." : ""}>
          <input type="date" style={inputStyle(c)} value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
        </Field>
        <Field label="Date added" c={c}>
          <input type="date" style={inputStyle(c)} value={form.dateAdded} onChange={(e) => set("dateAdded", e.target.value)} />
        </Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Notes" c={c}>
            <textarea style={{ ...inputStyle(c), minHeight: 60, resize: "vertical" }} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" />
          </Field>
        </div>
      </div>
      {error && <div style={{ color: c.red, fontSize: 12.5, fontWeight: 600, marginTop: 12 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <Button variant="ghost" c={c} onClick={onClose}>Cancel</Button>
        <Button variant="primary" c={c} onClick={submit}>{initial ? "Save changes" : "Add item"}</Button>
      </div>
    </Modal>
  );
}

/* Stock reduction / delete -> sold vs used flow */
function StockActionModal({ c, item, quantity, isDelete, onClose, onResolve }) {
  const [step, setStep] = useState("confirm"); // confirm | sold | used
  const [saleForm, setSaleForm] = useState({
    quantity, salePrice: quantity * (item.unitPrice || 0), location: "",
    paymentCollected: quantity * (item.unitPrice || 0), paymentMethod: "Cash",
    paymentStatus: "Paid in full", customerName: "", customerContact: "",
  });
  const [usedNote, setUsedNote] = useState("");
  const [error, setError] = useState("");

  if (step === "confirm") {
    return (
      <Modal title={isDelete ? "Before you delete this item" : "Before you reduce this stock"} onClose={onClose} c={c} width={460}>
        <p style={{ margin: "0 0 18px", fontSize: 14, color: c.text, lineHeight: 1.5 }}>
          Was <strong>{quantity} {item.unit}{quantity !== 1 ? "s" : ""}</strong> of <strong>{item.name}</strong> sold, or used in a job?
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Button c={c} variant="primary" style={{ flex: 1 }} onClick={() => setStep("sold")}>
            <DollarSign size={15} /> Sold
          </Button>
          <Button c={c} variant="navy" style={{ flex: 1 }} onClick={() => setStep("used")}>
            <ClipboardList size={15} /> Used in a job
          </Button>
        </div>
      </Modal>
    );
  }

  if (step === "sold") {
    const set = (k, v) => setSaleForm((f) => ({ ...f, [k]: v }));
    const submit = () => {
      if (saleForm.quantity <= 0) return setError("Quantity must be greater than zero.");
      if (saleForm.quantity > item.quantity) return setError(`Only ${item.quantity} ${item.unit}(s) in stock.`);
      if (saleForm.salePrice <= 0) return setError("Enter a sale price, or use \"Used in a job\" instead.");
      if (!saleForm.location.trim()) return setError("Location is required.");
      setError("");
      onResolve({ action: "sold", quantity: saleForm.quantity, sale: saleForm });
    };
    return (
      <Modal title={`Log sale — ${item.name}`} onClose={onClose} c={c}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label={`Quantity sold (${item.unit})`} c={c}>
            <input type="number" min="1" max={item.quantity} style={inputStyle(c)} value={saleForm.quantity}
              onChange={(e) => set("quantity", Number(e.target.value))} />
          </Field>
          <Field label="Sale price (PKR)" c={c}>
            <input type="number" min="0" style={inputStyle(c)} value={saleForm.salePrice}
              onChange={(e) => set("salePrice", Number(e.target.value))} />
          </Field>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Location / area serviced" c={c}>
              <input style={inputStyle(c)} value={saleForm.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Model Town, Lahore" />
            </Field>
          </div>
          <Field label="Payment collected (PKR)" c={c}>
            <input type="number" min="0" style={inputStyle(c)} value={saleForm.paymentCollected}
              onChange={(e) => set("paymentCollected", Number(e.target.value))} />
          </Field>
          <Field label="Payment method" c={c}>
            <select style={inputStyle(c)} value={saleForm.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
              {PAYMENT_METHODS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Payment status" c={c}>
            <select style={inputStyle(c)} value={saleForm.paymentStatus} onChange={(e) => set("paymentStatus", e.target.value)}>
              {PAYMENT_STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Customer name (optional)" c={c}>
            <input style={inputStyle(c)} value={saleForm.customerName} onChange={(e) => set("customerName", e.target.value)} />
          </Field>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Customer contact (optional)" c={c}>
              <input style={inputStyle(c)} value={saleForm.customerContact} onChange={(e) => set("customerContact", e.target.value)} />
            </Field>
          </div>
        </div>
        {error && <div style={{ color: c.red, fontSize: 12.5, fontWeight: 600, marginTop: 12 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 20 }}>
          <Button variant="ghost" c={c} onClick={() => setStep("confirm")}>Back</Button>
          <Button variant="primary" c={c} onClick={submit}>Log sale &amp; update stock</Button>
        </div>
      </Modal>
    );
  }

  // used
  return (
    <Modal title={`Log job usage — ${item.name}`} onClose={onClose} c={c} width={440}>
      <p style={{ margin: "0 0 14px", fontSize: 13.5, color: c.subtext }}>
        {quantity} {item.unit}{quantity !== 1 ? "s" : ""} will be deducted from stock. This does not create a revenue entry.
      </p>
      <Field label="Job / technician note (optional, internal only)" c={c}>
        <textarea style={{ ...inputStyle(c), minHeight: 70, resize: "vertical" }} value={usedNote}
          onChange={(e) => setUsedNote(e.target.value)} placeholder="e.g. Used by Asif on Gulberg termite job" />
      </Field>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 20 }}>
        <Button variant="ghost" c={c} onClick={() => setStep("confirm")}>Back</Button>
        <Button variant="navy" c={c} onClick={() => onResolve({ action: "used", quantity, note: usedNote })}>Confirm usage</Button>
      </div>
    </Modal>
  );
}

function InventoryView({ c, inventory, setInventory, addRevenueFromSale }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [expiryFilter, setExpiryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [editing, setEditing] = useState(null); // item | "new" | null
  const [stockAction, setStockAction] = useState(null); // {item, quantity, isDelete}

  const alertCount = useMemo(() => inventory.filter((i) => isExpired(i) || isExpiringSoon(i)).length, [inventory]);

  const filtered = useMemo(() => {
    let list = inventory.filter((i) => {
      if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (catFilter !== "All" && i.category !== catFilter) return false;
      if (stockFilter === "Low stock" && !isLowStock(i)) return false;
      if (stockFilter === "Out of stock" && i.status !== "out_of_stock") return false;
      if (expiryFilter === "Expired" && !isExpired(i)) return false;
      if (expiryFilter === "Expiring soon" && !isExpiringSoon(i)) return false;
      if (expiryFilter === "Needs attention" && !(isExpired(i) || isExpiringSoon(i))) return false;
      return true;
    });
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "quantity") return a.quantity - b.quantity;
      if (sortBy === "price") return a.unitPrice - b.unitPrice;
      if (sortBy === "expiry") return (a.expiryDate || "9999").localeCompare(b.expiryDate || "9999");
      return 0;
    });
    return list;
  }, [inventory, search, catFilter, stockFilter, expiryFilter, sortBy]);

  const saveItem = (form) => {
    if (editing === "new") {
      setInventory((prev) => [...prev, { ...form, id: uid(), status: form.quantity === 0 ? "out_of_stock" : "active" }]);
      setEditing(null);
      return;
    }
    const old = editing;
    if (form.quantity < old.quantity) {
      // reduction via edit -> trigger flow for the difference
      setEditing(null);
      setStockAction({ item: { ...old }, quantity: old.quantity - form.quantity, isDelete: false, pendingEdit: form });
      return;
    }
    setInventory((prev) => prev.map((i) => i.id === old.id ? { ...form, id: old.id, status: form.quantity === 0 ? "out_of_stock" : "active" } : i));
    setEditing(null);
  };

  const resolveStockAction = (result) => {
    const { item, isDelete, pendingEdit } = stockAction;
    if (result.action === "sold") {
      addRevenueFromSale({
        description: `${item.name} (sold from inventory)`,
        location: result.sale.location,
        amount: result.sale.salePrice,
        paymentMethod: result.sale.paymentMethod,
        paymentStatus: result.sale.paymentStatus,
        date: todayStr(),
        customerName: result.sale.customerName,
        customerContact: result.sale.customerContact,
        notes: `Linked inventory sale, item: ${item.name}`,
      });
    }
    setInventory((prev) => {
      if (isDelete) return prev.filter((i) => i.id !== item.id);
      return prev.map((i) => {
        if (i.id !== item.id) return i;
        const newQty = pendingEdit ? pendingEdit.quantity : Math.max(0, i.quantity - result.quantity);
        const merged = pendingEdit ? { ...pendingEdit, id: i.id } : { ...i, quantity: newQty };
        merged.status = newQty === 0 ? "out_of_stock" : "active";
        return merged;
      });
    });
    setStockAction(null);
  };

  const requestReduce = (item) => {
    const q = window.prompt(`Reduce how many ${item.unit}(s) of "${item.name}"? (currently ${item.quantity})`, "1");
    if (q === null) return;
    const n = Math.min(item.quantity, Math.max(1, Number(q) || 0));
    if (n <= 0) return;
    setStockAction({ item, quantity: n, isDelete: false });
  };

  const requestAdd = (item) => {
    const q = window.prompt(`Add how many ${item.unit}(s) to "${item.name}"?`, "1");
    if (q === null) return;
    const n = Math.max(0, Number(q) || 0);
    if (n <= 0) return;
    setInventory((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + n, status: "active" } : i));
  };

  const requestDelete = (item) => {
    if (item.quantity === 0) {
      if (window.confirm(`Delete "${item.name}" from inventory? This cannot be undone.`)) {
        setInventory((prev) => prev.filter((i) => i.id !== item.id));
      }
      return;
    }
    setStockAction({ item, quantity: item.quantity, isDelete: true });
  };

  const th = { textAlign: "left", padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: c.subtext, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${c.border}` };
  const td = { padding: "12px 14px", fontSize: 13.5, color: c.text, borderBottom: `1px solid ${c.border}` };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: c.navy }}>Inventory</h2>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: c.subtext }}>{inventory.length} items tracked</p>
        </div>
        <Button c={c} variant="primary" onClick={() => setEditing("new")}><Plus size={16} /> Add item</Button>
      </div>

      {alertCount > 0 && (
        <div onClick={() => setExpiryFilter("Needs attention")} style={{
          cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: c.redBg,
          color: c.red, padding: "12px 16px", borderRadius: 12, marginBottom: 16, fontSize: 13.5, fontWeight: 600,
        }}>
          <AlertTriangle size={18} />
          {alertCount} item{alertCount !== 1 ? "s" : ""} expired or expiring within 30 days — click to view
        </div>
      )}

      <Card c={c} style={{ padding: 14, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: c.subtext }} />
          <input style={{ ...inputStyle(c), paddingLeft: 32 }} placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select style={{ ...inputStyle(c), width: 160 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option>All</option>
          {INVENTORY_CATEGORIES.map((x) => <option key={x}>{x}</option>)}
        </select>
        <select style={{ ...inputStyle(c), width: 160 }} value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
          <option>All</option><option>Low stock</option><option>Out of stock</option>
        </select>
        <select style={{ ...inputStyle(c), width: 170 }} value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value)}>
          <option>All</option><option>Needs attention</option><option>Expired</option><option>Expiring soon</option>
        </select>
        <select style={{ ...inputStyle(c), width: 150 }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Sort: Name</option>
          <option value="quantity">Sort: Quantity</option>
          <option value="price">Sort: Price</option>
          <option value="expiry">Sort: Expiry</option>
        </select>
      </Card>

      <Card c={c} style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
          <thead><tr>
            <th style={th}>Item</th><th style={th}>Category</th><th style={th}>Stock</th>
            <th style={th}>Expiry</th>
            <th style={th}>Status</th><th style={th}></th>
          </tr></thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td style={{ ...td, fontWeight: 600 }}>{item.name}{item.notes && <div style={{ fontSize: 11.5, fontWeight: 400, color: c.subtext, marginTop: 2 }}>{item.notes}</div>}</td>
                <td style={td}>{item.category}</td>
                <td style={td}>{item.quantity} {item.unit}{item.quantity !== 1 ? "s" : ""}</td>
                <td style={td}>{item.expiryDate ? fmtDate(item.expiryDate) : "—"}</td>
                <td style={td}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {isExpired(item) && <Badge c={c} tone="red">Expired</Badge>}
                    {!isExpired(item) && isExpiringSoon(item) && <Badge c={c} tone="amber">Expiring soon</Badge>}
                    {item.status === "out_of_stock" && <Badge c={c} tone="grey">Out of stock</Badge>}
                    {item.status !== "out_of_stock" && isLowStock(item) && <Badge c={c} tone="amber">Low stock</Badge>}
                    {!isExpired(item) && !isExpiringSoon(item) && item.status !== "out_of_stock" && !isLowStock(item) && <Badge c={c} tone="green">OK</Badge>}
                  </div>
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button title="Add stock" onClick={() => requestAdd(item)} style={iconBtn(c)}><Plus size={14} /></button>
                    <button title="Reduce stock" disabled={item.quantity === 0} onClick={() => requestReduce(item)} style={iconBtn(c, item.quantity === 0)}><Minus size={14} /></button>
                    <button title="Edit" onClick={() => setEditing(item)} style={iconBtn(c)}><Pencil size={14} /></button>
                    <button title="Delete" onClick={() => requestDelete(item)} style={iconBtn(c)}><Trash2 size={14} color={c.red} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: c.subtext, padding: 30 }}>No items match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {editing && (
        <ItemFormModal c={c} initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={saveItem} />
      )}
      {stockAction && (
        <StockActionModal c={c} item={stockAction.item} quantity={stockAction.quantity} isDelete={stockAction.isDelete}
          onClose={() => setStockAction(null)} onResolve={resolveStockAction} />
      )}
    </div>
  );
}

function iconBtn(c, disabled) {
  return {
    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
    border: `1px solid ${c.border}`, borderRadius: 7, background: c.bg, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
  };
}

/* ---------------------------------------------------------------------- */
/* REVENUE MODULE                                                          */
/* ---------------------------------------------------------------------- */

function RevenueFormModal({ c, category, onClose, onSave }) {
  const [form, setForm] = useState({
    description: "", location: "", amount: 0, paymentMethod: "Cash",
    paymentStatus: "Paid in full", date: todayStr(), customerName: "", customerContact: "", notes: "",
  });
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = () => {
    if (!form.description.trim()) return setError("Description is required.");
    if (!form.location.trim()) return setError("Location is required.");
    if (form.amount <= 0 && !form.notes.trim()) return setError("Amount is PKR 0 — add a note explaining why, or enter an amount.");
    setError("");
    onSave({ ...form, category });
  };
  const catLabel = REVENUE_CATEGORIES.find((x) => x.key === category)?.label;
  return (
    <Modal title={`New entry — ${catLabel}`} onClose={onClose} c={c}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Description" c={c}>
            <input style={inputStyle(c)} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Full house termite treatment" />
          </Field>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Location / area serviced" c={c}>
            <input style={inputStyle(c)} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Model Town, Lahore" />
          </Field>
        </div>
        <Field label="Payment collected (PKR)" c={c}>
          <input type="number" min="0" style={inputStyle(c)} value={form.amount} onChange={(e) => set("amount", Number(e.target.value))} />
        </Field>
        <Field label="Date" c={c}>
          <input type="date" style={inputStyle(c)} value={form.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Payment method" c={c}>
          <select style={inputStyle(c)} value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
            {PAYMENT_METHODS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Payment status" c={c}>
          <select style={inputStyle(c)} value={form.paymentStatus} onChange={(e) => set("paymentStatus", e.target.value)}>
            {PAYMENT_STATUSES.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Customer name (optional)" c={c}>
          <input style={inputStyle(c)} value={form.customerName} onChange={(e) => set("customerName", e.target.value)} />
        </Field>
        <Field label="Customer contact (optional)" c={c}>
          <input style={inputStyle(c)} value={form.customerContact} onChange={(e) => set("customerContact", e.target.value)} />
        </Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Notes (optional)" c={c}>
            <textarea style={{ ...inputStyle(c), minHeight: 55, resize: "vertical" }} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
      </div>
      {error && <div style={{ color: c.red, fontSize: 12.5, fontWeight: 600, marginTop: 12 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <Button variant="ghost" c={c} onClick={onClose}>Cancel</Button>
        <Button variant="primary" c={c} onClick={submit}>Save entry</Button>
      </div>
    </Modal>
  );
}

function computeTotals(revenue, monthKey) {
  const entries = revenue.filter((r) => monthKeyOf(r.date) === monthKey);
  const byCat = {};
  REVENUE_CATEGORIES.forEach((cat) => { byCat[cat.key] = 0; });
  let total = 0;
  entries.forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + Number(r.amount || 0); total += Number(r.amount || 0); });
  return { total, byCat, entries };
}

function RevenueView({ c, revenue, setRevenue, inventory }) {
  const [tab, setTab] = useState("termite");
  const [viewMonth, setViewMonth] = useState("this"); // this | last
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const tmKey = thisMonthKey(), lmKey = lastMonthKey();
  const tmTotals = useMemo(() => computeTotals(revenue, tmKey), [revenue, tmKey]);
  const lmTotals = useMemo(() => computeTotals(revenue, lmKey), [revenue, lmKey]);
  const activeKey = viewMonth === "this" ? tmKey : lmKey;
  const activeTotals = viewMonth === "this" ? tmTotals : lmTotals;

  const growth = tmTotals.total === 0 && lmTotals.total === 0 ? 0 :
    lmTotals.total === 0 ? 100 : ((tmTotals.total - lmTotals.total) / lmTotals.total) * 100;

  const tabEntries = useMemo(() =>
    activeTotals.entries.filter((r) => r.category === tab).sort((a, b) => b.date.localeCompare(a.date)),
    [activeTotals, tab]);

  const addEntry = (entry) => setRevenue((prev) => [...prev, { ...entry, id: uid() }]);
  const removeEntry = (id) => setRevenue((prev) => prev.filter((r) => r.id !== id));

  const th = { textAlign: "left", padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: c.subtext, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${c.border}` };
  const td = { padding: "12px 14px", fontSize: 13.5, color: c.text, borderBottom: `1px solid ${c.border}` };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: c.navy }}>Revenue</h2>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: c.subtext }}>Three streams, tracked separately, never merged</p>
        </div>
        <Button c={c} variant="primary" onClick={() => setShowForm(true)}><Plus size={16} /> Add entry</Button>
      </div>

      {/* Last month comparison panel */}
      <Card c={c} style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.subtext, textTransform: "uppercase", letterSpacing: 0.4 }}>This month · {monthLabel(tmKey)}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.green }}>{fmtPKR(tmTotals.total)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13.5, color: growth >= 0 ? c.green : c.red }}>
            {growth >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {Math.abs(growth).toFixed(1)}% vs last month
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.subtext, textTransform: "uppercase", letterSpacing: 0.4 }}>Last month · {monthLabel(lmKey)}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.navy }}>{fmtPKR(lmTotals.total)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          {REVENUE_CATEGORIES.map((cat) => {
            const tm = tmTotals.byCat[cat.key], lm = lmTotals.byCat[cat.key];
            const share = tmTotals.total ? (tm / tmTotals.total) * 100 : 0;
            const d = lm === 0 ? (tm > 0 ? 100 : 0) : ((tm - lm) / lm) * 100;
            return (
              <div key={cat.key} style={{ flex: "1 1 200px", background: c.tint, borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.green }}>{cat.short}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: c.text }}>{fmtPKR(tm)}</div>
                <div style={{ fontSize: 11.5, color: c.subtext, display: "flex", justifyContent: "space-between" }}>
                  <span>{share.toFixed(0)}% of total</span>
                  <span style={{ color: d >= 0 ? c.green : c.red, fontWeight: 700 }}>{d >= 0 ? "▲" : "▼"} {Math.abs(d).toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6, background: c.tint, padding: 4, borderRadius: 11 }}>
          {REVENUE_CATEGORIES.map((cat) => (
            <button key={cat.key} onClick={() => setTab(cat.key)} style={{
              border: "none", cursor: "pointer", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: tab === cat.key ? c.green : "transparent", color: tab === cat.key ? "#fff" : c.green,
            }}>{cat.short}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, background: c.tint, padding: 4, borderRadius: 11 }}>
          {["this", "last"].map((m) => (
            <button key={m} onClick={() => setViewMonth(m)} style={{
              border: "none", cursor: "pointer", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: viewMonth === m ? c.navy : "transparent", color: viewMonth === m ? "#fff" : c.navy,
            }}>{m === "this" ? "This month" : "Last month"}</button>
          ))}
        </div>
      </div>

      <Card c={c} style={{ padding: "12px 18px", marginBottom: 12, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 13.5, color: c.subtext }}>{monthLabel(activeKey)} · {REVENUE_CATEGORIES.find(x => x.key === tab)?.label}</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: c.green }}>{fmtPKR(activeTotals.byCat[tab])} · {tabEntries.length} entries</span>
      </Card>

      <Card c={c} style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead><tr>
            <th style={th}>Date</th><th style={th}>Description</th><th style={th}>Location</th>
            <th style={th}>Customer</th><th style={th}>Method</th><th style={th}>Status</th>
            <th style={th}>Amount</th><th style={th}></th>
          </tr></thead>
          <tbody>
            {tabEntries.map((r) => (
              <tr key={r.id}>
                <td style={td}>{fmtDate(r.date)}</td>
                <td style={td}>{r.description}</td>
                <td style={td}>{r.location}</td>
                <td style={td}>{r.customerName || "—"}</td>
                <td style={td}>{r.paymentMethod}</td>
                <td style={td}><Badge c={c} tone={r.paymentStatus === "Paid in full" ? "green" : r.paymentStatus === "Partial" ? "amber" : "red"}>{r.paymentStatus}</Badge></td>
                <td style={{ ...td, fontWeight: 700 }}>{fmtPKR(r.amount)}</td>
                <td style={td}>
                  <button style={iconBtn(c)} onClick={() => setDeleteTarget(r)}><Trash2 size={14} color={c.red} /></button>
                </td>
              </tr>
            ))}
            {tabEntries.length === 0 && (
              <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: c.subtext, padding: 30 }}>No entries yet for this period.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {showForm && <RevenueFormModal c={c} category={tab} onClose={() => setShowForm(false)} onSave={(e) => { addEntry(e); setShowForm(false); }} />}
      {deleteTarget && (
        <Modal title="Delete this entry?" onClose={() => setDeleteTarget(null)} c={c} width={400}>
          <p style={{ fontSize: 14, color: c.text }}>This will remove "{deleteTarget.description}" ({fmtPKR(deleteTarget.amount)}) permanently.</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
            <Button variant="ghost" c={c} onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" c={c} onClick={() => { removeEntry(deleteTarget.id); setDeleteTarget(null); }}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* DASHBOARD                                                               */
/* ---------------------------------------------------------------------- */

function KPI({ c, icon, label, value, sub, subColor }) {
  return (
    <Card c={c} style={{ padding: 18, flex: "1 1 200px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: c.green, marginBottom: 10 }}>
        {icon}<span style={{ fontSize: 12, fontWeight: 700, color: c.subtext, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: c.text }}>{value}</div>
      {sub && <div style={{ fontSize: 12.5, fontWeight: 600, color: subColor || c.subtext, marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

function DashboardView({ c, inventory, revenue, dark }) {
  const tmKey = thisMonthKey(), lmKey = lastMonthKey();
  const tmTotals = useMemo(() => computeTotals(revenue, tmKey), [revenue, tmKey]);
  const lmTotals = useMemo(() => computeTotals(revenue, lmKey), [revenue, lmKey]);
  const growth = lmTotals.total === 0 ? (tmTotals.total > 0 ? 100 : 0) : ((tmTotals.total - lmTotals.total) / lmTotals.total) * 100;
  const expiringCount = inventory.filter((i) => isExpired(i) || isExpiringSoon(i)).length;
  const lowStockCount = inventory.filter((i) => isLowStock(i) || i.status === "out_of_stock").length;

  const pieData = REVENUE_CATEGORIES.map((cat) => ({ name: cat.short, value: tmTotals.byCat[cat.key] }));
  const pieColors = [c.green, c.navy, c.amber];

  const recent = useMemo(() => [...revenue].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6), [revenue]);

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: c.navy }}>Dashboard</h2>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: c.subtext }}>{monthLabel(tmKey)} overview</p>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <KPI c={c} icon={<DollarSign size={16} />} label="This month revenue" value={fmtPKR(tmTotals.total)}
          sub={`${growth >= 0 ? "▲" : "▼"} ${Math.abs(growth).toFixed(1)}% vs last month`} subColor={growth >= 0 ? c.green : c.red} />
        <KPI c={c} icon={<Receipt size={16} />} label="Last month revenue" value={fmtPKR(lmTotals.total)} sub={monthLabel(lmKey)} />
        <KPI c={c} icon={<TrendingUp size={16} />} label="Growth" value={`${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`} sub="Month over month" />
        <KPI c={c} icon={<AlertTriangle size={16} />} label="Items expiring / expired" value={expiringCount} sub={expiringCount > 0 ? "Needs attention" : "All clear"} subColor={expiringCount > 0 ? c.red : c.green} />
        <KPI c={c} icon={<PackageX size={16} />} label="Low / out of stock" value={lowStockCount} sub={lowStockCount > 0 ? "Restock soon" : "Well stocked"} subColor={lowStockCount > 0 ? c.amber : c.green} />
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card c={c} style={{ padding: 20, flex: "1 1 320px" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: c.navy }}>Revenue split — this month</h3>
          {tmTotals.total === 0 ? (
            <p style={{ color: c.subtext, fontSize: 13.5 }}>No revenue logged yet this month.</p>
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                  </Pie>
                  <RTooltip formatter={(v) => fmtPKR(v)} contentStyle={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 12.5 }} />
                  <Legend wrapperStyle={{ fontSize: 12.5 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card c={c} style={{ padding: 20, flex: "1 1 320px" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: c.navy }}>Recent activity</h3>
          {recent.length === 0 ? <p style={{ color: c.subtext, fontSize: 13.5 }}>Nothing logged yet.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recent.map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: `1px solid ${c.border}` }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: c.text }}>{r.description}</div>
                    <div style={{ fontSize: 11.5, color: c.subtext }}>{fmtDate(r.date)} · {REVENUE_CATEGORIES.find(x => x.key === r.category)?.short}</div>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: c.green }}>{fmtPKR(r.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* CUSTOMERS                                                               */
/* ---------------------------------------------------------------------- */

function CustomersView({ c, revenue }) {
  const customers = useMemo(() => {
    const map = new Map();
    revenue.forEach((r) => {
      const name = r.customerName?.trim();
      if (!name) return;
      if (!map.has(name)) map.set(name, { name, contact: r.customerContact || "", total: 0, count: 0, last: r.date, categories: new Set() });
      const rec = map.get(name);
      rec.total += Number(r.amount || 0);
      rec.count += 1;
      rec.categories.add(r.category);
      if (r.date > rec.last) rec.last = r.date;
      if (!rec.contact && r.customerContact) rec.contact = r.customerContact;
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [revenue]);

  const th = { textAlign: "left", padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: c.subtext, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${c.border}` };
  const td = { padding: "12px 14px", fontSize: 13.5, color: c.text, borderBottom: `1px solid ${c.border}` };

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: c.navy }}>Customers</h2>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: c.subtext }}>Built automatically from named revenue entries</p>
      <Card c={c} style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
          <thead><tr><th style={th}>Customer</th><th style={th}>Contact</th><th style={th}>Services</th><th style={th}>Visits</th><th style={th}>Last visit</th><th style={th}>Total spent</th></tr></thead>
          <tbody>
            {customers.map((cu) => (
              <tr key={cu.name}>
                <td style={{ ...td, fontWeight: 600 }}><Users size={13} style={{ marginRight: 6, verticalAlign: -2 }} />{cu.name}</td>
                <td style={td}>{cu.contact || "—"}</td>
                <td style={td}>{[...cu.categories].map((k) => REVENUE_CATEGORIES.find(x => x.key === k)?.short).join(", ")}</td>
                <td style={td}>{cu.count}</td>
                <td style={td}>{fmtDate(cu.last)}</td>
                <td style={{ ...td, fontWeight: 700, color: c.green }}>{fmtPKR(cu.total)}</td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: c.subtext, padding: 30 }}>No named customers logged yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* CALENDAR                                                                 */
/* ---------------------------------------------------------------------- */

function CalendarView({ c, revenue }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDay, setSelectedDay] = useState(null);

  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = useMemo(() => {
    const map = {};
    revenue.forEach((r) => {
      if (monthKeyOf(r.date) !== `${year}-${String(month + 1).padStart(2, "0")}`) return;
      const day = Number(r.date.slice(8, 10));
      (map[day] = map[day] || []).push(r);
    });
    return map;
  }, [revenue, year, month]);

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selEntries = selectedDay ? (byDay[selectedDay] || []) : [];

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: c.navy }}>Calendar</h2>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: c.subtext }}>Revenue entries by day</p>

      <Card c={c} style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button style={iconBtn(c)} onClick={() => { const d = new Date(cursor); d.setMonth(d.getMonth() - 1); setCursor(d); setSelectedDay(null); }}><ChevronLeft size={15} /></button>
          <div style={{ fontWeight: 800, color: c.navy, fontSize: 15 }}>{cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
          <button style={iconBtn(c)} onClick={() => { const d = new Date(cursor); d.setMonth(d.getMonth() + 1); setCursor(d); setSelectedDay(null); }}><ChevronRight size={15} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, fontSize: 11, fontWeight: 700, color: c.subtext, marginBottom: 6, textAlign: "center" }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {cells.map((d, i) => {
            const entries = d ? byDay[d] : null;
            const total = entries ? entries.reduce((s, r) => s + Number(r.amount || 0), 0) : 0;
            return (
              <div key={i} onClick={() => d && entries && setSelectedDay(d)} style={{
                minHeight: 58, borderRadius: 9, padding: 6, cursor: d && entries ? "pointer" : "default",
                background: d ? (selectedDay === d ? c.green : entries ? c.tint : c.bg) : "transparent",
                border: `1px solid ${c.border}`, color: selectedDay === d ? "#fff" : c.text,
              }}>
                {d && <div style={{ fontSize: 12, fontWeight: 700 }}>{d}</div>}
                {entries && <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 4, color: selectedDay === d ? "#fff" : c.green }}>{entries.length} entr{entries.length !== 1 ? "ies" : "y"}</div>}
                {entries && <div style={{ fontSize: 10, color: selectedDay === d ? "#fff" : c.subtext }}>{fmtPKR(total)}</div>}
              </div>
            );
          })}
        </div>
      </Card>

      {selectedDay && (
        <Card c={c} style={{ padding: 18, marginTop: 16 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14.5, fontWeight: 700, color: c.navy }}>
            {new Date(year, month, selectedDay).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
          </h3>
          {selEntries.map((r) => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${c.border}` }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.description}</div>
                <div style={{ fontSize: 11.5, color: c.subtext }}>{r.location} · {REVENUE_CATEGORIES.find(x => x.key === r.category)?.short}</div>
              </div>
              <div style={{ fontWeight: 700, color: c.green }}>{fmtPKR(r.amount)}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* REPORTS                                                                  */
/* ---------------------------------------------------------------------- */

function ReportsView({ c, revenue, inventory }) {
  const months = useMemo(() => {
    let key = thisMonthKey();
    const arr = [];
    for (let i = 5; i >= 0; i--) arr.push(shiftMonthKey(key, -i));
    return arr;
  }, []);

  const chartData = months.map((k) => {
    const t = computeTotals(revenue, k);
    return { month: monthLabel(k).split(" ")[0], Termite: t.byCat.termite, Products: t.byCat.products, Fumigation: t.byCat.fumigation };
  });

  const stockValue = inventory.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const expiredItems = inventory.filter(isExpired);
  const lowItems = inventory.filter((i) => isLowStock(i) || i.status === "out_of_stock");

  const th = { textAlign: "left", padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: c.subtext, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${c.border}` };
  const td = { padding: "12px 14px", fontSize: 13.5, color: c.text, borderBottom: `1px solid ${c.border}` };

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: c.navy }}>Reports</h2>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: c.subtext }}>Six-month trend & inventory health</p>

      <Card c={c} style={{ padding: 20, marginBottom: 18 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: c.navy }}>Revenue trend by category</h3>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: c.subtext }} />
              <YAxis tick={{ fontSize: 11, fill: c.subtext }} tickFormatter={(v) => (v / 1000) + "k"} />
              <RTooltip formatter={(v) => fmtPKR(v)} contentStyle={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 12.5 }} />
              <Legend wrapperStyle={{ fontSize: 12.5 }} />
              <Bar dataKey="Termite" stackId="a" fill={c.green} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Products" stackId="a" fill={c.navy} />
              <Bar dataKey="Fumigation" stackId="a" fill={c.amber} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card c={c} style={{ padding: 20, flex: "1 1 260px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: c.navy, marginBottom: 8 }}>
            <ShieldCheck size={17} /><h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>Inventory value</h3>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: c.text }}>{fmtPKR(stockValue)}</div>
          <p style={{ fontSize: 12.5, color: c.subtext }}>Total value of stock on hand, at cost/unit price</p>
        </Card>
        <Card c={c} style={{ padding: 20, flex: "1 1 260px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: c.red, marginBottom: 8 }}>
            <AlertTriangle size={17} /><h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>Expired items</h3>
          </div>
          {expiredItems.length === 0 ? <p style={{ fontSize: 13, color: c.subtext }}>None — nice work.</p> :
            expiredItems.map((i) => <div key={i.id} style={{ fontSize: 13, padding: "4px 0" }}>{i.name} <span style={{ color: c.subtext }}>({fmtDate(i.expiryDate)})</span></div>)}
        </Card>
        <Card c={c} style={{ padding: 20, flex: "1 1 260px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: c.amber, marginBottom: 8 }}>
            <PackageX size={17} /><h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>Low / out of stock</h3>
          </div>
          {lowItems.length === 0 ? <p style={{ fontSize: 13, color: c.subtext }}>All items well stocked.</p> :
            lowItems.map((i) => <div key={i.id} style={{ fontSize: 13, padding: "4px 0" }}>{i.name} <span style={{ color: c.subtext }}>({i.quantity} {i.unit}{i.quantity !== 1 ? "s" : ""})</span></div>)}
        </Card>
      </div>

      <Card c={c} style={{ marginTop: 18, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead><tr><th style={th}>Month</th><th style={th}>Termite</th><th style={th}>Products</th><th style={th}>Fumigation</th><th style={th}>Total</th></tr></thead>
          <tbody>
            {months.slice().reverse().map((k) => {
              const t = computeTotals(revenue, k);
              return (
                <tr key={k}>
                  <td style={{ ...td, fontWeight: 600 }}>{monthLabel(k)}</td>
                  <td style={td}>{fmtPKR(t.byCat.termite)}</td>
                  <td style={td}>{fmtPKR(t.byCat.products)}</td>
                  <td style={td}>{fmtPKR(t.byCat.fumigation)}</td>
                  <td style={{ ...td, fontWeight: 700, color: c.green }}>{fmtPKR(t.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* NOTIFICATIONS                                                           */
/* ---------------------------------------------------------------------- */

function NotificationsPanel({ c, inventory, onClose }) {
  const expired = inventory.filter(isExpired);
  const expiring = inventory.filter((i) => !isExpired(i) && isExpiringSoon(i));
  const low = inventory.filter((i) => i.status !== "out_of_stock" && isLowStock(i));
  const out = inventory.filter((i) => i.status === "out_of_stock");
  const total = expired.length + expiring.length + low.length + out.length;

  const Row = ({ icon, tone, title, sub }) => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${c.border}` }}>
      <div style={{ color: tone, marginTop: 1 }}>{icon}</div>
      <div><div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{title}</div><div style={{ fontSize: 11.5, color: c.subtext }}>{sub}</div></div>
    </div>
  );

  return (
    <div style={{ position: "absolute", top: 54, right: 0, width: 320, maxHeight: 420, overflowY: "auto", background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, boxShadow: "0 12px 30px rgba(0,0,0,0.15)", padding: 16, zIndex: 60 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: c.navy }}>Notifications</h4>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: c.subtext }}><X size={16} /></button>
      </div>
      {total === 0 && <p style={{ fontSize: 13, color: c.subtext, textAlign: "center", padding: "20px 0" }}>You're all caught up.</p>}
      {expired.map((i) => <Row key={i.id} icon={<AlertTriangle size={15} />} tone={c.red} title={`${i.name} has expired`} sub={fmtDate(i.expiryDate)} />)}
      {expiring.map((i) => <Row key={i.id} icon={<AlertTriangle size={15} />} tone={c.amber} title={`${i.name} expires soon`} sub={fmtDate(i.expiryDate)} />)}
      {out.map((i) => <Row key={i.id} icon={<PackageX size={15} />} tone={c.grey} title={`${i.name} is out of stock`} sub="Reorder needed" />)}
      {low.map((i) => <Row key={i.id} icon={<PackageX size={15} />} tone={c.amber} title={`${i.name} is low on stock`} sub={`${i.quantity} ${i.unit}(s) left`} />)}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* MAIN APP                                                                 */
/* ---------------------------------------------------------------------- */

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "revenue", label: "Revenue", icon: Receipt },
  { key: "customers", label: "Customers", icon: Users },
  { key: "calendar", label: "Calendar", icon: CalendarIcon },
  { key: "reports", label: "Reports", icon: FileText },
];

export default function PestexOS() {
  const [loaded, setLoaded] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("pestex-store", false);
        if (res && res.value) {
          const data = JSON.parse(res.value);
          setInventory(data.inventory || seedInventory());
          setRevenue(data.revenue || seedRevenue());
          setDark(!!data.dark);
        } else {
          setInventory(seedInventory());
          setRevenue(seedRevenue());
        }
      } catch (e) {
        setInventory(seedInventory());
        setRevenue(seedRevenue());
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await window.storage.set("pestex-store", JSON.stringify({ inventory, revenue, dark }), false);
      } catch (e) { /* ignore */ }
    }, 400);
  }, [inventory, revenue, dark, loaded]);

  const c = dark ? DARK : LIGHT;

  const addRevenueFromSale = useCallback((entry) => {
    setRevenue((prev) => [...prev, { ...entry, category: "products", id: uid() }]);
  }, []);

  const notifCount = useMemo(() => {
    return inventory.filter((i) => isExpired(i) || isExpiringSoon(i) || i.status === "out_of_stock" || isLowStock(i)).length;
  }, [inventory]);

  if (!loaded) {
    return (
      <div style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", color: LIGHT.subtext }}>
        Loading PestexOS…
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Inter','Poppins',sans-serif", background: c.bg, color: c.text, minHeight: "100vh",
      display: "flex", transition: "background .2s ease",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        input, select, textarea, button { font-family: inherit; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${c.border}; border-radius: 8px; }
        @media (max-width: 860px) {
          .pestex-sidebar { position: fixed; left: 0; top: 0; bottom: 0; z-index: 90; transform: translateX(-100%); transition: transform .2s ease; }
          .pestex-sidebar.open { transform: translateX(0); }
          .pestex-hamburger { display: flex !important; }
          .pestex-main { padding: 16px !important; }
        }
      `}</style>

      {mobileNavOpen && (
        <div onClick={() => setMobileNavOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 80 }} />
      )}

      {/* Sidebar */}
      <aside className={`pestex-sidebar${mobileNavOpen ? " open" : ""}`} style={{
        width: 230, background: c.surface, borderRight: `1px solid ${c.border}`, padding: "20px 14px",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 20px" }}>
          <PestexLogo size={38} c={c} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: c.navy, fontFamily: "Poppins, sans-serif" }}>PestexOS</div>
            <div style={{ fontSize: 10.5, color: c.subtext, fontWeight: 600, letterSpacing: 0.3 }}>PEST-FREE SYSTEMS</div>
          </div>
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button key={item.key} onClick={() => { setTab(item.key); setMobileNavOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
              border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600, textAlign: "left",
              background: active ? c.green : "transparent", color: active ? "#fff" : c.text,
            }}>
              <Icon size={17} /> {item.label}
            </button>
          );
        })}
        <div style={{ marginTop: "auto", padding: "14px 8px 0", borderTop: `1px solid ${c.border}` }}>
          <div style={{ fontSize: 11, color: c.subtext }}>PestexOS · Daily Ops</div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px",
          borderBottom: `1px solid ${c.border}`, background: c.surface, position: "sticky", top: 0, zIndex: 50,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="pestex-hamburger" onClick={() => setMobileNavOpen(true)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: c.text }}><Menu size={22} /></button>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: c.subtext, textTransform: "uppercase", letterSpacing: 0.4 }}>This month's revenue</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: c.green }}>{fmtPKR(computeTotals(revenue, thisMonthKey()).total)}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
            <button onClick={() => setDark((d) => !d)} style={iconBtn(c)}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            <button onClick={() => setNotifOpen((o) => !o)} style={{ ...iconBtn(c), position: "relative" }}>
              <Bell size={16} />
              {notifCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: c.red, color: "#fff", fontSize: 9.5, fontWeight: 700, borderRadius: 999, minWidth: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{notifCount}</span>}
            </button>
            {notifOpen && <NotificationsPanel c={c} inventory={inventory} onClose={() => setNotifOpen(false)} />}
          </div>
        </header>

        <main className="pestex-main" style={{ padding: 24, maxWidth: 1180 }}>
          {tab === "dashboard" && <DashboardView c={c} inventory={inventory} revenue={revenue} dark={dark} />}
          {tab === "inventory" && <InventoryView c={c} inventory={inventory} setInventory={setInventory} addRevenueFromSale={addRevenueFromSale} />}
          {tab === "revenue" && <RevenueView c={c} revenue={revenue} setRevenue={setRevenue} inventory={inventory} />}
          {tab === "customers" && <CustomersView c={c} revenue={revenue} />}
          {tab === "calendar" && <CalendarView c={c} revenue={revenue} />}
          {tab === "reports" && <ReportsView c={c} revenue={revenue} inventory={inventory} />}
        </main>
      </div>
    </div>
  );
}
