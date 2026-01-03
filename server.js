import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

// 🔴 CHAVE DIRETA (TEMPORÁRIO)
const openai = new OpenAI({
  apiKey: "COLE_SUA_CHAVE_OPENAI_AQUI"
});

// rota teste
app.get("/", (req, res) => {
  res.send("Backend Collor AI online 🚀");
});

// rota IA teste
app.post("/ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: prompt }
      ]
    });

    res.json({
      resposta: response.choices[0].message.content
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro na IA" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
