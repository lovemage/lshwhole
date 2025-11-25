import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang = "zh-TW" } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Determine source language
    let sourceLang = "en"; // Default
    const hasJapanese = /[\u3040-\u30ff\u31f0-\u31ff]/.test(text);
    const hasKorean = /[\uac00-\ud7af]/.test(text);
    
    if (hasJapanese) sourceLang = "ja";
    else if (hasKorean) sourceLang = "ko";

    // Use MyMemory Translation API (Free, limited quota)
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    
    console.log(`Translating via MyMemory: ${sourceLang} -> ${targetLang}`);

    const response = await fetch(url);
    
    if (!response.ok) {
        console.error("Translation API error");
        return NextResponse.json({ error: "Translation failed" }, { status: 500 });
    }

    const data = await response.json();
    
    if (data.responseStatus !== 200) {
        console.error("MyMemory API Error:", data.responseDetails);
        // Fallback to mock if quota exceeded or error
        return NextResponse.json({ 
            translatedText: `[翻譯] ${text}`,
            note: "Free translation quota exceeded or error"
        });
    }

    return NextResponse.json({ 
        translatedText: data.responseData.translatedText 
    });

  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
