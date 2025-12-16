'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ReturnPolicyPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">退換貨政策</h1>
          <p className="text-sm text-gray-500">最後更新：2024年11月</p>
        </div>

        <div className="space-y-8">
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">品牌理念</h2>
            <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
              在我們的Lsh studio，我們相信孩子應該擁有最好的穿著體驗。
              從初生到成長的每一刻，我們專注h於挑選高品質、舒適且具風格的童裝，讓每一位小朋友都能自在地穿出自己的可愛與甜美。我們精選全球最優質的面料，確保每件衣物都帶有精緻的細節和柔和的觸感，為孩子們打造如同親膚般的溫柔呵護。加入我們，讓您的孩子在每一天的穿搭中都能感受到我們的愛與用心。
            </p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">運送方式</h2>
            <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
              現貨商品：確認付款後，我們會在 4天內完成宅配出貨（例假日/國定假日除外）。選擇超商取貨的訂單，配送時間將加上超商物流時間，通常於訂購後約 3 天抵達指定門市。
              出貨時間調整：我們將根據實際狀況靈活調整，可能提前或延遲。若遇特殊情況造成出貨延遲超過 4 天，我們將在 FB / IG 等社群平台公告說明。
            </p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">物流費用</h2>
            <div className="space-y-3 text-base text-gray-800 leading-relaxed">
              <p>7-11 店到店、全家店到店服務，每單酌收處理費 65 元。</p>
              <p>郵局配送，每單酌收處理費 100 元。</p>
              <p>退回運費：若因個人原因（如地址錯誤/無人收件/配送失敗）需重新寄送的退件，運費由消費者自行負擔。</p>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">海外運送方式</h2>
            <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
              我們提供順豐到付服務配送至中港澳、日本、韓國、澳洲、英國、歐洲、美國、加拿大等地，運費由收件方支付。請注意所有商品均由台灣直接寄出，海外訂單不適用 7 天鑑賞期。
            </p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">退貨政策</h2>
            <div className="space-y-4">
              <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                Lsh studio 精選每一件商品，希望能夠與您分享這份精心挑選的喜悅。我們理解網購可能產生認知落差，若您對商品不滿意，請於收到商品隔日起1- 3 天內通知我們，並於 7 天內將商品退回。我們將盡快協助辦理退貨。
              </p>
              <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                商品狀況：依《消費者保護法》，消費者享有商品到貨 7 天鑑賞期。請保持商品全新狀態和完整包裝，包括未拆剪吊牌、外盒、特殊包裝等，避免在原廠包裝上貼附配送單或書寫文字。若退回商品有損壞或汙損情況，將無法退換。
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">注意事項</h2>
            <div className="space-y-4 text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
              <p>
                服飾類：退回前請拍攝商品正反面，以確認無試穿、毀損及下水等情況。
              </p>
              <p>
                玩具類：木製玩具因材質會有木節、色澤不均等情形，屬正常範圍。若外層封膜已拆，則視同確定購買，無法退換。🔧👨‍🔧本店玩具商品暫無支援商品修理服務。
              </p>
              <p>
                ✔️玩具類非電器產品，無所謂保固期。故請收到貨後立即確認商品。
              </p>
              <p>
                ⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛⇛
              </p>
              <p>🚚注意事項⚠️</p>
              <p>1.玩具商品是空海運來台,盡量包裝完整後出貨🚚但過程難免外盒有壓傷,要求完美者請諮詢後再下單。</p>
              <p>2.下標前請先看完商品內文。</p>
              <p>3.玩具皆為大量生產,如有塗裝、溢漆、掉色、色差、關 節鬆...等問題,不屬於商品瑕疵。</p>
              <p>4.商品敘述有誤、外盒或後續版本有更動以實物為準,不再另行通知。</p>
              <p>5.除非有瑕疵影響不能正常使用(商品收到後7天內提出),可辦理換退貨(尚有庫存可辦理換貨優先處理)。</p>
              <p>6.開封錄影📹</p>
            </div>
          </section>

          <div className="pt-2">
            <Link href="/" className="text-sm text-gray-600 hover:text-primary hover:underline">
              返回首頁
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
