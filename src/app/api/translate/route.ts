import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang = "zh-TW" } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Translation API error:", response.status, text);
      return NextResponse.json({ error: "Translation failed" }, { status: response.status });
    }

    const data = await response.json();
    // Google Translate API returns [[["Translated Text", "Original Text", ...], ...], ...]
    // We need to join all parts if it splits sentences
    if (!data || !data[0]) {
       return NextResponse.json({ translatedText: text }); // Fallback to original
    }
    
    const translatedText = data[0].map((part: any) => part[0]).join("");

    return NextResponse.json({ translatedText });
  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
