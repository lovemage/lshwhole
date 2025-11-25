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
      console.warn("OPENAI_API_KEY not found in process.env");
      return NextResponse.json({ 
        translatedText: `[翻譯] ${text}`,
        mock: true,
        message: "API Key missing"
      });
    }

    console.log(`Translating text: "${text.substring(0, 20)}..." to ${targetLang}`);

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
            content: `You are a professional translator for an e-commerce platform. 
            Translate the following product information to Traditional Chinese (Taiwan/繁體中文). 
            Ensure the tone is commercial and attractive. 
            Do not include explanations, just the translated text.
            If the text is already in Traditional Chinese, return it as is.`
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
      console.error("OpenAI API error:", JSON.stringify(error));
      return NextResponse.json({ error: "Translation failed", details: error }, { status: 500 });
    }

    const data = await response.json();
    const translatedText = data.choices[0]?.message?.content?.trim();

    console.log("Translation success");
    return NextResponse.json({ translatedText });

  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
