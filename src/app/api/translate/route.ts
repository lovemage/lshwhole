import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang = "zh-TW" } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: "Translation failed" }, { status: 500 });
    }

    const data = await response.json();
    // Google Translate API returns [[["Translated Text", "Original Text", ...], ...], ...]
    // We need to join all parts if it splits sentences
    const translatedText = data[0].map((part: any) => part[0]).join("");

    return NextResponse.json({ translatedText });
  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
