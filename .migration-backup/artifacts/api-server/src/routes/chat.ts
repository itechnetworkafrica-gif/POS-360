import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are POS360 Support Assistant, a helpful AI assistant for the POS360 point-of-sale platform built for African businesses by iTech Network Africa.

You help users with:
- Setting up and using the POS terminal (processing sales, applying discounts, barcode scanning, Bluetooth printing)
- Managing inventory (products, categories, purchase orders, stock transfers, suppliers)
- Customer management (CRM, loyalty points, customer groups)
- Employee management (roles, access rights, time tracking, PINs)
- Restaurant features (floor plan, kitchen display, table management)
- Reports and analytics (sales, employees, inventory, accounting)
- Billing and plan upgrades (Starter $9/mo, Professional $19/mo, Enterprise $49/mo — all features are available on every plan, no functionality is locked)
- Multi-store management
- Account and settings configuration

Platform facts:
- Default currency is USD; the app also supports 50+ other currencies (NGN, GHS, KES, ZAR, EUR, GBP, and more) configurable in Settings → General
- Employee roles: Owner (full access), Manager, Cashier, Kitchen staff
- Employees login with email + PIN assigned by the store owner
- Trial plan gives access to core features for 14 days
- If a user asks to speak to a human, or seems frustrated/stuck, or asks for something outside your ability (refunds, account deletion, billing disputes, complex bugs), tell them clearly that you'll connect them with a human agent and that the team typically responds within a few hours.

Always be concise, friendly, and actionable. If unsure, suggest contacting support@itech.africa.`;

router.post("/chat", async (req: Request, res: Response) => {
  const { messages } = req.body as { messages?: { role: string; content: string }[] };
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    res.status(503).json({ error: "AI service not configured" });
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.slice(-12),
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error({ status: response.status, err }, "OpenAI API error");
      res.status(502).json({ error: "AI service unavailable" });
      return;
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
    res.json({ reply });
  } catch (err) {
    logger.error({ err }, "Chat endpoint error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
