import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;
const MORALIS_API = process.env.MORALIS_API;

// --- Simple Moralis GET helper with loud logging
async function moralisGet(url) {
  const res = await fetch(url, { headers: { accept: "application/json", "X-API-Key": MORALIS_API }});
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

// --- HEALTH: confirms API key is present
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    hasApiKey: Boolean(MORALIS_API),
    apiKeyPrefix: MORALIS_API ? MORALIS_API.slice(0, 6) + "..." : null
  });
});

// --- DEBUG: calls a single endpoint and returns the RAW response
// Usage: /debug?wallet=0x...&chain=eth
app.get("/debug", async (req, res) => {
  try {
    const wallet = req.query.wallet;
    const chain = req.query.chain || "eth";
    if (!wallet) return res.status(400).json({ error: "Provide ?wallet=0x..." });

    // Use the most reliable balance endpoint first
    const url = `https://deep-index.moralis.io/api/v2.2/${wallet}/erc20?chain=${chain}`;
    const out = await moralisGet(url);
    res.status(out.ok ? 200 : out.status).send(out.body);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Your portfolio (keep it; we’ll fix mapping after debug)
const wallets = [
  "0x47C7c4E3b59D2C03E98bf54C104e7481474842E5",
  "0x980F71B0D813d6cC81a248e39964c8D1a7BE01E5"
];
const chains = ["eth","bsc","polygon","avax","fantom","arbitrum","optimism"];

async function fetchBalances(chain, wallet) {
  try {
    // use the simpler endpoint first (erc20)
    const url = `https://deep-index.moralis.io/api/v2.2/${wallet}/erc20?chain=${chain}`;
    const res = await fetch(url, { headers: { accept: "application/json", "X-API-Key": MORALIS_API }});
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);
    const arr = await res.json(); // should be an array
    return arr.map(t => ({
      chain, wallet,
      symbol: t.symbol,
      name: t.name,
      balance: Number(t.balance) / (10 ** Number(t.decimals || 0)),
      usdValue: Number(t.usd_value ?? 0),
    }));
  } catch (err) {
    console.error(`[Moralis ERROR] ${chain} - ${wallet}:`, err.message);
    return [];
  }
}

app.get("/portfolio", async (req, res) => {
  try {
    const results = await Promise.all(
      wallets.flatMap(w => chains.map(c => fetchBalances(c, w)))
    );
    res.json(results.flat());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => res.send("Moralis Portfolio Tracker is live 🚀"));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
