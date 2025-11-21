import { NextRequest, NextResponse } from "next/server";

// Proxy 取代舊有 middleware：可在此做認證、導流、改寫、加/改 header 等。
export function proxy(request: NextRequest) {
  // 目前不攔截，直接放行
  return NextResponse.next();
}

// 套用範圍（與原先 middleware 相同）
export const config = {
  matcher: [
    // 排除 API、Next 靜態資源、圖片優化與 favicon
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

