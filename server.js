import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: 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
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
