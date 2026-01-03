import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: "COLE_SUA_CHAVE_OPENAI_AQUI"
});

app.get("/", (req, res) => {
  res.send("Backend Collor AI online 🚀");
});

app.post("/ai", async (req, res) => {
  try {
    const { prompt } = req.body;

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
  } catch (error) {
    console.error("ERRO OPENAI:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
