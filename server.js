import express from "express";
import cors from "cors";
import OpenAI from "openai";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

/* =========================
   CLIENTES DAS IAs
========================= */

// OpenAI
const openai =
  process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// Groq (via fetch)
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Gemini
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;

/* =========================
   FUNÇÕES DAS IAs
========================= */

async function usarOpenAI(prompt) {
  if (!openai) throw new Error("OpenAI sem chave");

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return {
    provider: "OpenAI",
    resposta: res.choices[0].message.content,
  };
}

async function usarGroq(prompt) {
  if (!process.env.GROQ_API_KEY) throw new Error("Groq sem chave");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();

  return {
    provider: "Groq",
    resposta: data.choices[0].message.content,
  };
}

async function usarGemini(prompt) {
  if (!process.env.GEMINI_API_KEY) throw new Error("Gemini sem chave");

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const data = await res.json();

  return {
    provider: "Gemini",
    resposta: data.candidates[0].content.parts[0].text,
  };
}

/* =========================
   ROTA PRINCIPAL
========================= */

app.post("/ai", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt não enviado" });
  }

  // ORDEM DE PRIORIDADE (AUTO)
  const tentativas = [usarOpenAI, usarGroq, usarGemini];

  for (const ia of tentativas) {
    try {
      const resposta = await ia(prompt);
      return res.json({
        nome: "COLLOR AI",
        ia: resposta.provider,
        resposta: resposta.resposta,
      });
    } catch (err) {
      console.log("Falha na IA:", err.message);
    }
  }

  return res.status(500).json({
    error: "Nenhuma IA disponível no momento",
  });
});

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  res.send("Backend Collor AI online 🚀");
});

app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
