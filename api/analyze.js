export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Alleen POST toegestaan" });
  }

  try {
    const { images = [], notes = "" } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY ontbreekt in Vercel" });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Upload minimaal één foto" });
    }

    const prompt = `
Je bent Quick2Sell Pro v3, een professionele AI-verkoopassistent voor Nederland en België.

Analyseer de foto's en extra info. Herken elk soort tweedehands product:
auto's, fietsen, elektronica, meubels, kleding, babyspullen, gereedschap, muziekinstrumenten, speelgoed, games, luxe artikelen en huisraad.

BELANGRIJK:
- Geef geen demo-prijzen.
- Als het een auto is: schat in duizenden euro's.
- Gebruik kenteken, interieur, uitvoering, bouwjaar, opties en zichtbare staat als dat zichtbaar is.
- Zoek indien mogelijk actuele vergelijkbare prijzen via web search.
- Denk aan Marktplaats, 2dehands, Vinted, eBay, AutoScout24, Gaspedaal, Facebook Marketplace.
- Als live vergelijking onzeker is, zeg dat eerlijk.
- Geef realistische bedragen in euro's.
- Noem zichtbare gebreken.
- Vraag altijd goedkeuring vóór plaatsing.

Extra info gebruiker:
${notes || "Geen extra info ingevuld."}

Geef exact deze structuur:

✅ IDENTIFICATIE
- Product:
- Categorie:
- Merk:
- Model/type:
- Kleur:
- Materiaal/uitvoering:
- Geschatte leeftijd/bouwjaar:
- Staat:
- Beschadigingen/gebreken:
- Accessoires/ontbrekend:
- Zekerheid:

🔍 MARKTVERGELIJKING
- Vergelijkbare markt:
- Vraag & aanbod:
- Populaire zoekwoorden:
- Opmerking live data:

💰 WAARDE-INSCHATTING
- Snelle verkoopprijs:
- Ideale vraagprijs:
- Maximale realistische vraagprijs:
- Minimale acceptatieprijs:
- Uitleg:

🌍 PLATFORMADVIES BENELUX
- Beste platform:
- Marktplaats:
- 2dehands:
- Vinted:
- eBay:
- Facebook Marketplace:

⭐ QUICK2SELL SCORE
- Score:
- Verkoopsnelheid:
- Populariteit:
- Winstpotentie:
- Risico:

📈 VERKOOPTIPS
- Beste foto's:
- Beste plaatsmoment:
- Ophalen/verzenden:
- Schoonmaak/reparatie:
- Bundeladvies:

🤝 ONDERHANDELSTRATEGIE
- Startprijs:
- Ideale verkoopprijs:
- Minimale prijs:
- Reactie op laag bod:

📝 ADVERTENTIE
TITEL:

BESCHRIJVING:

ZOEKWOORDEN:

Sluit af met:
📝 Advertentie gereed? Ja, maar plaats pas na jouw goedkeuring.
`;

    const content = [{ type: "input_text", text: prompt }];

    images.slice(0, 8).forEach((img) => {
      content.push({
        type: "input_image",
        image_url: img
      });
    });

    async function callOpenAI(useWebSearch) {
      const body = {
        model: "gpt-4.1",
        input: [{ role: "user", content }],
        max_output_tokens: 2500
      };

      if (useWebSearch) {
        body.tools = [{ type: "web_search" }];
      }

      return fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
    }

    let response = await callOpenAI(true);
    let data = await response.json();

    if (!response.ok) {
      response = await callOpenAI(false);
      data = await response.json();
    }

    if (!response.ok) {
      return res.status(500).json({
        error: "OpenAI fout",
        details: data
      });
    }

    const result =
      data.output_text ||
      data.output?.map(item =>
        item.content?.map(part => part.text || "").join("\n")
      ).join("\n") ||
      "Geen analyse ontvangen.";

    return res.status(200).json({ result });

  } catch (error) {
    return res.status(500).json({
      error: "Serverfout",
      message: error.message
    });
  }
}
