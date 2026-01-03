app.post("/ai", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt vazio" });

  // 1️⃣ GEMINI (PRINCIPAL)
  try {
    const model = gemini.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);

    return res.json({
      nome: "COLLOR AI",
      usada: "gemini",
      resposta: result.response.text()
    });
  } catch (e) {
    console.log("❌ Gemini falhou");
  }

  // 2️⃣ OPENAI (BACKUP PREMIUM)
  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }]
    });

    return res.json({
      nome: "COLLOR AI",
      usada: "openai",
      resposta: r.choices[0].message.content
    });
  } catch (e) {
    console.log("❌ OpenAI falhou");
  }

  // 3️⃣ GROQ (ÚLTIMO RECURSO)
  try {
    const r = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }]
    });

    return res.json({
      nome: "COLLOR AI",
      usada: "groq",
      resposta: r.choices[0].message.content
    });
  } catch (e) {
    console.log("❌ Groq falhou");
  }

  res.status(500).json({
    error: "Todas as IAs estão indisponíveis"
  });
});
