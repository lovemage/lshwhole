import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="relative flex min-h-screen w-full flex-col items-center justify-center p-4"
          style={{ backgroundColor: "#f8f8f5" }}
        >
          <div className="text-center text-sm text-gray-600">載入中...</div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
