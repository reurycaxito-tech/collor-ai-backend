import express from "express";
import cors from "cors";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

// ===== CLIENTES =====
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const gemini = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

// ===== FUNÇÃO INTELIGENTE =====
async function collorAI(prompt) {
  // 1️⃣ GEMINI
  try {
    const model = gemini.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    return {
      ai: "GEMINI",
      resposta: result.response.text(),
    };
  } catch (e) {
    console.log("Gemini falhou");
  }

  // 2️⃣ GROQ
  try {
    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
    });

    return {
      ai: "GROQ",
      resposta: completion.choices[0].message.content,
    };
  } catch (e) {
    console.log("Groq falhou");
  }

  // 3️⃣ OPENAI
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    return {
      ai: "OPENAI",
      resposta: completion.choices[0].message.content,
    };
  } catch (e) {
    console.log("OpenAI falhou");
  }

  throw new Error("Nenhuma IA disponível");
}

// ===== ROTAS =====
app.get("/", (req, res) => {
  res.send("Backend COLLOR AI online 🚀");
});

app.post("/ai", async (req, res) => {
  try {
    const { prompt } = req.body;
    const resposta = await collorAI(prompt);
    res.json(resposta);
  } catch (err) {
    res.status(500).json({
      error: "COLLOR AI indisponível",
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log("COLLOR AI rodando na porta", PORT)
);
