import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang = "zh-TW" } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Check for API Key
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Fallback / Mock translation if no key provided
      // In a real scenario, you would integrate with OpenAI or Google Translate here
      console.warn("OPENAI_API_KEY not found, using mock translation");
      return NextResponse.json({ 
        translatedText: `[翻譯] ${text}`,
        mock: true 
      });
    }

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a helpful translator. Translate the following text to ${targetLang === "zh-TW" ? "Traditional Chinese (Taiwan)" : targetLang}. Keep it natural for e-commerce product titles or descriptions.`
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI API error:", error);
      return NextResponse.json({ error: "Translation failed" }, { status: 500 });
    }

    const data = await response.json();
    const translatedText = data.choices[0]?.message?.content?.trim();

    return NextResponse.json({ translatedText });

  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
