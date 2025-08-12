import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const MORALIS_API = process.env.MORALIS_API;

const wallets = [
  "0x47C7c4E3b59D2C03E98bf54C104e7481474842E5",
  "0x980F71B0D813d6cC81a248e39964c8D1a7BE01E5"
];

const chains = ["eth", "bsc", "polygon", "avax", "fantom", "arbitrum", "optimism"];

async function fetchBalances(chain, wallet) {
  try {
    const url = `https://deep-index.moralis.io/api/v2.2/wallets/${wallet}/tokens?chain=${chain}&exclude_spam=true`;
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "X-API-Key": MORALIS_API
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} - ${await res.text()}`);
    }

    const tokens = await res.json();
    return tokens.map(t => ({
      chain,
      wallet,
      symbol: t.symbol,
      name: t.name,
      balance: Number(t.balance_formatted ?? 0),
      usdValue: Number(t.usd_value ?? 0),
      price: t.usd_price ?? null
    }));
  } catch (err) {
    console.error(`[Moralis ERROR] ${chain} - ${wallet}:`, err.message);
    return [];
  }
}

app.get("/portfolio", async (req, res) => {
  try {
    const results = await Promise.all(
      wallets.flatMap(wallet =>
        chains.map(chain => fetchBalances(chain, wallet))
      )
    );
    res.json(results.flat().filter(t => t.balance > 0));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Moralis Portfolio Tracker is live 🚀");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
