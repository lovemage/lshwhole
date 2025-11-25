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

    console.log(`Translating text using custom endpoint: "${text.substring(0, 20)}..."`);

    // Call Custom OpenAI Endpoint (v1/responses)
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        input: `Translate to Traditional Chinese (Taiwan): ${text}`,
        store: true
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
      console.error("OpenAI Custom API error:", JSON.stringify(error));
      return NextResponse.json({ error: "Translation failed", details: error }, { status: 500 });
    }

    const data = await response.json();
    console.log("Custom API Response:", JSON.stringify(data));

    // Attempt to extract text from unknown response format
    // Assuming it might have 'response', 'output', 'text', or similar
    let translatedText = "";
    if (data.response) translatedText = data.response;
    else if (data.output) translatedText = data.output;
    else if (data.text) translatedText = data.text;
    else if (data.choices && data.choices[0]) {
        // Fallback to standard format just in case
        translatedText = data.choices[0].text || data.choices[0].message?.content || "";
    } else {
        // Fallback: try to find any string value that looks like a translation
        translatedText = JSON.stringify(data); 
    }

    return NextResponse.json({ translatedText: translatedText.trim() });

  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
