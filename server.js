import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());

// 🔑 OpenAI usa SOMENTE variável de ambiente
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Rota raiz (teste)
app.get("/", (req, res) => {
  res.send("Backend Collor AI online 🚀");
});

// Rota da IA (texto)
app.post("/ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "Envie um prompt no body"
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "Você é um assistente útil e profissional."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    res.json({
      resposta: completion.choices[0].message.content
    });

  } catch (error) {
    console.error("ERRO OPENAI:", error);
    res.status(500).json({
      error: "Erro na IA"
    });
  }
});

// Porta (Render usa process.env.PORT)
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
