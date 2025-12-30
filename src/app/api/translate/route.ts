import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang = "zh-TW" } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Truncate text if too long (MyMemory has 500 char limit for free tier)
    const maxLength = 500;
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;

    // Determine source language
    let sourceLang = "en"; // Default
    const hasJapanese = /[\u3040-\u30ff\u31f0-\u31ff]/.test(truncatedText);
    const hasKorean = /[\uac00-\ud7af]/.test(truncatedText);
    const hasChinese = /[\u4e00-\u9fff]/.test(truncatedText);

    if (hasJapanese) sourceLang = "ja";
    else if (hasKorean) sourceLang = "ko";
    else if (hasChinese) {
      // Already in Chinese, no need to translate
      return NextResponse.json({ translatedText: text });
    }

    // Use MyMemory Translation API (Free, limited quota)
    // MyMemory uses lowercase language codes, zh-TW for Traditional Chinese
    const targetCode = targetLang.toLowerCase() === "zh-tw" ? "zh-TW" : targetLang;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(truncatedText)}&langpair=${sourceLang}|${targetCode}`;

    console.log(`Translating via MyMemory: ${sourceLang} -> ${targetCode}, text length: ${truncatedText.length}`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error("Translation API error, status:", response.status);
      return NextResponse.json({ error: "Translation failed" }, { status: 500 });
    }

    const data = await response.json();

    // MyMemory API responseStatus: 200 = success, 403 = quota exceeded
    if (data.responseStatus !== 200) {
      console.error("MyMemory API Error:", data.responseStatus, data.responseDetails);
      // Fallback to mock if quota exceeded or error
      return NextResponse.json({
        translatedText: `[翻譯] ${text}`,
        note: "Free translation quota exceeded or error"
      });
    }

    // Clean up the translated text
    const translatedText = data.responseData?.translatedText || text;

    // If the API returns the same text or empty, return original
    if (!translatedText || translatedText.trim() === truncatedText.trim()) {
      return NextResponse.json({ translatedText: text });
    }

    return NextResponse.json({
      translatedText: translatedText
    });

  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
