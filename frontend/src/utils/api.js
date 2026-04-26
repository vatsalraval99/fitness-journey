// All AI calls route through the backend proxy
// In dev: Vite proxies /api → localhost:3001
// In prod: uses VITE_API_URL env variable

const BASE = import.meta.env.VITE_API_URL || "";

export async function callClaude({ system, userMessage, maxTokens = 500 }) {
  const res = await fetch(`${BASE}/api/claude`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, userMessage, maxTokens }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.text;
}

// ── Food calorie database (local fallback) ────────────────────────────────────
const FOOD_DB = {
  "egg": 78, "boiled egg": 78, "fried egg": 90, "scrambled egg": 100,
  "bread": 80, "brown bread": 70, "white bread": 80, "toast": 90,
  "butter": 102, "rice": 206, "cup rice": 206, "dal": 150, "lentils": 230,
  "oats": 150, "cup oats": 150, "milk": 150, "cup milk": 150, "banana": 105,
  "apple": 95, "orange": 62, "mango": 100, "chicken breast": 165,
  "grilled chicken": 165, "roti": 120, "chapati": 120, "paratha": 200,
  "naan": 260, "idli": 58, "dosa": 168, "sambar": 100, "salad": 50,
  "paneer": 265, "sabzi": 120, "vegetable curry": 150, "curd": 100,
  "yogurt": 100, "chai": 80, "coffee": 60, "black coffee": 5,
  "protein shake": 150, "nuts": 170, "almonds": 160, "sandwich": 350,
  "burger": 450, "pizza slice": 285, "biryani": 400,
};

export function estimateCaloriesLocally(desc) {
  const lower = desc.toLowerCase();
  let total = 0;
  const found = [];
  const sorted = Object.keys(FOOD_DB).sort((a, b) => b.length - a.length);
  const used = new Set();

  for (const food of sorted) {
    if (lower.includes(food) && !used.has(food)) {
      let qty = 1;
      const before = lower.substring(0, lower.indexOf(food));
      const numMatch = before.match(/(\d+(?:\.\d+)?)\s*(?:cup|slice|piece|tbsp|g|kg|serving|bowl|handful)?\s*$/);
      if (numMatch) qty = parseFloat(numMatch[1]);
      const wordMatch = before.match(/\b(two|three|four|five|six|half)\b\s*$/);
      if (wordMatch) qty = { two:2, three:3, four:4, five:5, six:6, half:0.5 }[wordMatch[1]] || 1;
      const cal = Math.round(FOOD_DB[food] * qty);
      found.push({ name: food, qty: String(qty), cal });
      total += cal;
      food.split(" ").forEach(w => used.add(w));
      used.add(food);
    }
  }

  if (!found.length) {
    total = 300;
    found.push({ name: "estimated meal", qty: "1", cal: 300 });
  }
  return { items: found, total };
}
