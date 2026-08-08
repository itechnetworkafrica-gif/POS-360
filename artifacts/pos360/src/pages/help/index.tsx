import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth";
import {
  Search, BookOpen, ShoppingCart, Package, Users, CreditCard, BarChart3,
  MessageCircle, Send, Loader2, Bot, User as UserIcon, ChevronRight,
  Sparkles, HelpCircle, X, Headset, ArrowRight
} from "lucide-react";

const sections = [
  {
    icon: BookOpen, label: "Getting Started", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    articles: [
      { title: "Setting up your first store", views: "2.1k" },
      { title: "Adding your first products", views: "1.8k" },
      { title: "Inviting staff members", views: "1.2k" },
      { title: "Connecting a barcode scanner", views: "932" },
    ],
  },
  {
    icon: ShoppingCart, label: "POS Terminal", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    articles: [
      { title: "Processing a sale step by step", views: "3.4k" },
      { title: "Accepting multiple payment methods", views: "2.1k" },
      { title: "Processing refunds and returns", views: "1.7k" },
      { title: "Applying discounts at checkout", views: "1.5k" },
    ],
  },
  {
    icon: Package, label: "Inventory", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    articles: [
      { title: "Adding products with images", views: "2.8k" },
      { title: "Creating purchase orders", views: "1.4k" },
      { title: "Managing stock levels and alerts", views: "2.0k" },
      { title: "Setting up product categories", views: "1.1k" },
    ],
  },
  {
    icon: Users, label: "Employees", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    articles: [
      { title: "Adding employee profiles & PINs", views: "1.6k" },
      { title: "Setting up access rights by role", views: "1.3k" },
      { title: "Tracking clock-in/clock-out", views: "980" },
      { title: "Owner vs Manager vs Cashier vs Kitchen", views: "1.1k" },
    ],
  },
  {
    icon: CreditCard, label: "Billing & Plans", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    articles: [
      { title: "Comparing Starter, Pro and Enterprise plans", views: "2.2k" },
      { title: "Upgrading your subscription", views: "1.9k" },
      { title: "Understanding your invoice", views: "890" },
      { title: "Cancelling or pausing your account", views: "760" },
    ],
  },
  {
    icon: BarChart3, label: "Reports & Analytics", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
    articles: [
      { title: "Reading the dashboard KPIs", views: "1.7k" },
      { title: "Exporting sales reports", views: "1.2k" },
      { title: "Employee performance tracking", views: "940" },
      { title: "Inventory valuation reports", views: "870" },
    ],
  },
];

const QUICK_PROMPTS = [
  "How do I add a product image?",
  "How do cashier employees log in?",
  "What's included in the free trial?",
  "How do I change the currency?",
  "How do I set up a discount?",
  "How do I receive a purchase order?",
];

interface Message { role: "user" | "assistant" | "system"; content: string; }

const HUMAN_REQUEST_PHRASES = [
  "talk to a human", "speak to a human", "human agent", "real person", "live agent",
  "connect me to", "customer service rep", "speak to someone", "talk to someone",
  "talk to support", "human support", "real agent",
];

function looksLikeHumanRequest(text: string) {
  const t = text.toLowerCase();
  return HUMAN_REQUEST_PHRASES.some(p => t.includes(p));
}

function SupportChat({ onMessage }: { onMessage?: (text: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your Gotecx POS AI assistant 👋\n\nI'm here 24/7 to help with setup, sales, inventory, billing, and more. If I can't solve it, I'll connect you with a human from our team. How can I help?",
    },
  ]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [escalated, setEscalated] = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const escalateToHuman = () => {
    setEscalated(true);
    setMessages(prev => [
      ...prev,
      { role: "system", content: "🔔 Connecting you to a human agent — our support team has been notified and will follow up here or by email shortly." },
    ]);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Message = { role: "user", content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    onMessage?.(trimmed);

    if (looksLikeHumanRequest(trimmed)) {
      escalateToHuman();
      return;
    }

    if (escalated) return; // AI stays quiet once escalated — human agent takes over

    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: updated.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply ?? "Sorry, something went wrong." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble connecting. Please try again shortly." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((m, i) => {
          if (m.role === "system") {
            return (
              <div key={i} className="flex items-center gap-2 justify-center py-1">
                <div className="text-xs text-center bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-full px-3 py-1.5 border border-amber-200 dark:border-amber-900">
                  {m.content}
                </div>
              </div>
            );
          }
          return (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "assistant" ? "bg-primary/15" : "bg-muted"}`}>
                {m.role === "assistant" ? <Bot className="h-4 w-4 text-primary" /> : <UserIcon className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "assistant" ? "bg-muted rounded-tl-sm" : "bg-primary text-primary-foreground rounded-tr-sm"
              }`}>
                {m.content}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-4">
                {[0,1,2].map(i => (
                  <div key={i} className="h-2 w-2 rounded-full bg-muted-foreground/50"
                    style={{ animation: `dotBounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => send(p)}
              className="text-xs px-3 py-1.5 rounded-full border hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors text-muted-foreground">
              {p}
            </button>
          ))}
        </div>
      )}

      {!escalated && (
        <div className="px-4 pb-2">
          <button onClick={escalateToHuman}
            className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-full border border-dashed hover:border-primary hover:text-primary transition-colors text-muted-foreground">
            <Headset className="h-3.5 w-3.5" /> Request a human agent instead
          </button>
        </div>
      )}

      <div className="p-4 border-t flex gap-2 shrink-0">
        <Textarea
          placeholder={escalated ? "Leave a message for our team..." : "Ask anything about Gotecx POS..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          className="resize-none min-h-[40px] max-h-[120px] text-sm"
          rows={1}
          disabled={loading}
        />
        <Button size="icon" onClick={() => send(input)} disabled={!input.trim() || loading} className="shrink-0 self-end h-10 w-10">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <style>{`@keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}

export default function HelpCenter() {
  const { user }                 = useAuth();
  const [search, setSearch]     = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(() => {
    try { return localStorage.getItem("pos360-help-last-message"); } catch { return null; }
  });

  const firstName = (user?.name?.split(" ")[0]) || "there";

  const filtered = sections
    .map(s => ({ ...s, articles: s.articles.filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase())) }))
    .filter(s => !search || s.articles.length > 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-3xl px-6 py-8 sm:px-10 sm:py-10 text-white"
        style={{ background: "linear-gradient(135deg, #5AC85A 0%, #2f8f3e 100%)" }}
      >
        <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-white/10" />
        <div className="relative z-10 space-y-1">
          <p className="text-sm font-medium text-white/80">Hi {firstName} 👋</p>
          <h1 className="text-2xl sm:text-3xl font-black">How can we help?</h1>
        </div>
        <div className="relative z-10 mt-5 max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search for help..." className="pl-10 h-11 rounded-xl bg-white text-foreground border-0 shadow-lg"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Recent message */}
      {lastMessage && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setChatOpen(true)}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Recent conversation</p>
              <p className="text-sm font-medium truncate">{lastMessage}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardContent>
        </Card>
      )}

      {/* Ask a question CTA */}
      <Card className="border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
        onClick={() => setChatOpen(true)}>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex -space-x-2 shrink-0">
            <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background">
              <Bot className="h-5 w-5" />
            </div>
            <div className="h-11 w-11 rounded-full bg-emerald-600 text-white flex items-center justify-center border-2 border-background">
              <Headset className="h-5 w-5" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Ask a question</p>
            <p className="text-sm text-muted-foreground">AI Agent and our team can help — available 24/7</p>
          </div>
          <Button size="icon" className="shrink-0 rounded-full h-10 w-10" onClick={e => { e.stopPropagation(); setChatOpen(true); }}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Promo card */}
      <Card className="border-0 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="h-12 w-12 rounded-xl bg-white dark:bg-background shadow-sm flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Get more out of Gotecx POS</p>
            <p className="text-sm text-muted-foreground">Explore Reports & Analytics to track sales, top products, and staff performance.</p>
          </div>
        </CardContent>
      </Card>

      {/* Sections grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(section => {
          const Icon = section.icon;
          return (
            <Card key={section.label} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <span className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${section.color}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {section.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0.5 pt-0">
                {section.articles.map(article => (
                  <button key={article.title} onClick={() => setChatOpen(true)}
                    className="w-full flex items-center justify-between gap-2 py-2 px-2 rounded-lg hover:bg-muted/60 text-left group transition-colors">
                    <span className="text-sm text-muted-foreground group-hover:text-foreground leading-snug flex-1">{article.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">{article.views}</Badge>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary" />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contact bar */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4 p-5">
          <div className="flex-1 text-center sm:text-left">
            <p className="font-semibold">Still need help?</p>
            <p className="text-sm text-muted-foreground">Our team is available Mon–Fri 8am–6pm WAT</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => window.open("mailto:support@gotecx.com")}>Email Support</Button>
            <Button size="sm" className="gap-1.5" onClick={() => setChatOpen(true)}>
              <MessageCircle className="h-4 w-4" /> Live Chat
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chat panel */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-[400px] h-[580px] max-h-[88vh] bg-background rounded-2xl shadow-2xl border flex flex-col overflow-hidden"
            style={{ animation: "slideUp 0.22s ease-out" }}>
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-primary/5 shrink-0">
              <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Gotecx POS AI Assistant</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online · Powered by OpenAI
                </p>
              </div>
              <button onClick={() => setChatOpen(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <SupportChat onMessage={(text) => {
                setLastMessage(text);
                try { localStorage.setItem("pos360-help-last-message", text); } catch {}
              }} />
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}
