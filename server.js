import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors());
app.use(express.json());

// ⚠️ A CHAVE VEM DO RENDER (Environment Variables)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ROTA TESTE
app.get("/", (req, res) => {
  res.send("Backend Collor AI online 🚀");
});

// ROTA IA
app.post("/ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt não enviado" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "Você é um assistente útil." },
        { role: "user", content: prompt }
      ]
    });

    res.json({
      resposta: completion.choices[0].message.content
    });

  } catch (err) {
    console.error("ERRO OPENAI:", err);
    res.status(500).json({
      error: "Erro na IA",
      detalhe: err.message
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
