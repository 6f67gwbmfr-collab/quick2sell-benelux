export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Alleen POST toegestaan" });
  }

  try {
    const { images = [], notes = "" } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY ontbreekt in Vercel" });
    }

    if (!images.length) {
      return res.status(400).json({ error: "Geen foto's ontvangen" });
    }

    const content = [
      {
        type: "input_text",
        text:
`Je bent Quick2Sell, een AI-verkoopassistent voor Nederland en België.

Analyseer dit tweedehands product op basis van de foto's en extra info.

Extra info gebruiker:
${notes || "Geen extra info"}

Geef antwoord in het Nederlands met exact deze onderdelen:

✅ IDENTIFICATIE
- Product
- Merk
- Model/type
- Kleur
- Materiaal
- Staat
- Beschadigingen
- Zekerheid

💰 WAARDE-INSCHATTING
- Snelle verkoopprijs
- Ideale verkoopprijs
- Maximale vraagprijs
- Korte uitleg

⭐ QUICK2SELL SCORE
- Score 1 t/m 5 sterren
- Verkoopsnelheid
- Populariteit
- Risico

📈 VERKOOPTIPS
- Beste platform
- Beste foto's
- Ophalen/verzenden
- Onderhandeladvies

📝 ADVERTENTIE-ADVIES
- Titel
- Korte beschrijving

Wees realistisch. Als het een auto is, geef autowaarden in duizenden euro's, niet in kleine productprijzen.`
      }
    ];

    images.slice(0, 5).forEach((img) => {
      content.push({
        type: "input_image",
        image_url: img
      });
    });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content
          }
        ],
        max_output_tokens: 1200
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "OpenAI fout",
        details: data
      });
    }

    const text =
      data.output_text ||
      data.output?.map(o =>
        o.content?.map(c => c.text).join("\n")
      ).join("\n") ||
      "Geen analyse ontvangen.";

    return res.status(200).json({ result: text });

  } catch (err) {
    return res.status(500).json({
      error: "Serverfout",
      message: err.message
    });
  }
}
