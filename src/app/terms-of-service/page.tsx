'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TermsOfService() {
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');

  const content = {
    zh: {
      title: '服務條款',
      lastUpdated: '最後更新：2024年11月',
      sections: [
        {
          title: '1. 服務條款接受',
          content: '訪問或使用 Lsx wholesale 網站及其服務，即表示您同意受本服務條款和隱私政策的約束。如果您不同意所有條款和條件，您可能無法訪問網站或使用任何服務。'
        },
        {
          title: '2. 帳戶註冊與安全',
          content: '要訪問我們的批發服務，您必須註冊帳戶。您同意在註冊過程中提供準確、最新和完整的信息，並更新此類信息以保持其準確、最新和完整。您負責保護您的密碼，並對您帳戶下發生的所有活動負責。'
        },
        {
          title: '3. 訂單、定價和付款',
          content: '通過網站下達的所有訂單均需 Lsx wholesale 接受。我們保留以任何理由拒絕或取消任何訂單的權利。我們產品的價格可能隨時更改，恕不另行通知。所有付款必須按照購買時指定的付款條款進行。'
        },
        {
          title: '4. 運送方式',
          content: '現貨商品：確認付款後，我們會在 4 天內完成宅配出貨（例假日/國定假日除外）。選擇超商取貨的訂單，配送時間將加上超商物流時間，通常於訂購後約 3 天抵達指定門市。出貨時間調整：我們將根據實際狀況靈活調整，可能提前或延遲。若遇特殊情況造成出貨延遲超過 4 天，我們將在 FB / IG 等社群平台公告說明。'
        },
        {
          title: '5. 物流費用',
          content: '7-11 店到店、全家店到店服務，每單酌收處理費 65 元。郵局配送，每單酌收處理費 100 元。退回運費：若因個人原因（如地址錯誤/無人收件/配送失敗）需重新寄送的退件，運費由消費者自行負擔。'
        },
        {
          title: '6. 海外運送方式',
          content: '我們提供順豐到付服務配送至中港澳、日本、韓國、澳洲、英國、歐洲、美國、加拿大等地，運費由收件方支付。請注意所有商品均由台灣直接寄出，海外訂單不適用 7 天鑑賞期。'
        },
        {
          title: '7. 退貨政策',
          content: 'Lsx wholesale 精選每一件商品，希望能夠與您分享這份精心挑選的喜悅。我們理解網購可能產生認知落差，若您對商品不滿意，請於收到商品隔日起 1-3 天內通知我們，並於 7 天內將商品退回。我們將盡快協助辦理退貨。'
        },
        {
          title: '8. 商品狀況',
          content: '依《消費者保護法》，消費者享有商品到貨 7 天鑑賞期。請保持商品全新狀態和完整包裝，包括未拆剪吊牌、外盒、特殊包裝等，避免在原廠包裝上貼附配送單或書寫文字。若退回商品有損壞或汙損情況，將無法退換。'
        },
        {
          title: '9. 注意事項',
          content: '服飾類：退回前請拍攝商品正反面，以確認無試穿、毀損及下水等情況。玩具類：木製玩具因材質會有木節、色澤不均等情形，屬正常範圍。若外層封膜已拆，則視同確定購買，無法退換。玩具類非電器產品，無所謂保固期。故請收到貨後立即確認商品。'
        },
        {
          title: '10. 玩具商品特別說明',
          content: '玩具商品是空海運來台，盡量包裝完整後出貨，但過程難免外盒有壓傷，要求完美者請諮詢後再下單。下標前請先看完商品內文。玩具皆為大量生產，如有塗裝、溢漆、掉色、色差、關節鬆等問題，不屬於商品瑕疵。商品敘述有誤、外盒或後續版本有更動以實物為準，不再另行通知。除非有瑕疵影響不能正常使用（商品收到後 7 天內提出），可辦理換退貨（尚有庫存可辦理換貨優先處理）。'
        },
        {
          title: '11. 知識產權',
          content: '網站及其原始內容、功能和功能是並將保持 Lsx wholesale 及其許可方的專有財產。我們的商標和商業外觀不得在未經 Lsx wholesale 事先書面同意的情況下與任何產品或服務相關聯。'
        },
        {
          title: '12. 責任限制',
          content: '在任何情況下，Lsx wholesale 及其董事、員工、合作夥伴、代理人、供應商或附屬公司均不對任何間接、附帶、特殊、後果性或懲罰性損害賠償負責，包括但不限於利潤損失、數據、使用、商譽或其他無形損失。'
        },
        {
          title: '13. 準據法',
          content: '本條款應受我們公司所在司法管轄區的法律管轄和解釋，不考慮其法律衝突條款。'
        },
        {
          title: '14. 聯絡信息',
          content: '如果您對這些條款有任何疑問，請通過 support@lsxwholesale.com 與我們聯繫。'
        }
      ]
    },
    en: {
      title: 'Terms of Service',
      lastUpdated: 'Last Updated: November 2024',
      sections: [
        {
          title: '1. Acceptance of Terms',
          content: 'By accessing or using the Lsx wholesale website and its services, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to all the terms and conditions, you may not access the website or use any of its services.'
        },
        {
          title: '2. Account Registration & Security',
          content: 'To access our wholesale services, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for all activities that occur under your account.'
        },
        {
          title: '3. Orders, Pricing, and Payment',
          content: 'All orders placed through the website are subject to acceptance by Lsx wholesale. We reserve the right to refuse or cancel any order for any reason. Prices for our products are subject to change without notice. All payments must be made in accordance with the payment terms specified at the time of purchase.'
        },
        {
          title: '4. Shipping Methods',
          content: 'In-stock items: After payment confirmation, we will complete home delivery within 4 days (excluding holidays). For orders selecting convenience store pickup, delivery time will include convenience store logistics time, usually arriving at the designated store within about 3 days of purchase. Shipping time adjustments: We will flexibly adjust based on actual conditions, which may be earlier or delayed. If special circumstances cause shipping delays exceeding 4 days, we will announce on social media platforms such as FB/IG.'
        },
        {
          title: '5. Logistics Fees',
          content: '7-Eleven store-to-store and FamilyMart store-to-store services charge a handling fee of NT$65 per order. Postal delivery charges a handling fee of NT$100 per order. Return shipping fees: If reshipment is needed due to personal reasons (such as incorrect address/no one to receive/delivery failure), the return shipping fee is borne by the consumer.'
        },
        {
          title: '6. Overseas Shipping',
          content: 'We provide SF Express collect-on-delivery service to China, Hong Kong, Macau, Japan, South Korea, Australia, UK, Europe, USA, Canada and other regions, with shipping fees paid by the recipient. Please note that all products are shipped directly from Taiwan, and overseas orders do not apply to the 7-day inspection period.'
        },
        {
          title: '7. Return Policy',
          content: 'Lsx wholesale carefully selects every product, hoping to share this carefully curated joy with you. We understand that online shopping may create cognitive gaps. If you are not satisfied with the product, please notify us within 1-3 days after receiving the product and return the product within 7 days. We will assist with the return process as soon as possible.'
        },
        {
          title: '8. Product Condition',
          content: 'According to the Consumer Protection Law, consumers enjoy a 7-day inspection period for products upon receipt. Please keep the product in brand new condition and complete packaging, including unopened tags, original boxes, special packaging, etc. Avoid attaching shipping labels or writing on the original packaging. If the returned product is damaged or soiled, it cannot be exchanged or returned.'
        },
        {
          title: '9. Important Notes',
          content: 'Clothing: Please take photos of the front and back of the product before returning to confirm no try-on, damage, or washing. Toys: Wooden toys may have wood knots and uneven color due to material, which is normal. If the outer film is opened, it is considered a confirmed purchase and cannot be exchanged or returned. Toys are non-electrical products and have no warranty period. Please confirm the product immediately upon receipt.'
        },
        {
          title: '10. Special Notes for Toy Products',
          content: 'Toy products are shipped to Taiwan by air and sea, packaged as completely as possible, but the outer box may inevitably have compression damage during the process. Those requiring perfection should consult before placing an order. Please read the product description completely before bidding. Toys are mass-produced, and issues such as painting, paint overflow, color fading, color difference, loose joints, etc., are not product defects. If the product description is incorrect or the outer box or subsequent versions are changed, the actual product shall prevail and no further notice will be given. Unless there are defects affecting normal use (raised within 7 days of receipt), exchanges or returns can be processed (exchanges will be prioritized if inventory is available).'
        },
        {
          title: '11. Intellectual Property',
          content: 'The website and its original content, features, and functionality are and will remain the exclusive property of Lsx wholesale and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Lsx wholesale.'
        },
        {
          title: '12. Limitation of Liability',
          content: 'In no event shall Lsx wholesale, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.'
        },
        {
          title: '13. Governing Law',
          content: 'These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which our company is established, without regard to its conflict of law provisions.'
        },
        {
          title: '14. Contact Information',
          content: 'If you have any questions about these Terms, please contact us at support@lsxwholesale.com.'
        }
      ]
    }
  };

  const currentContent = content[language];

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-6 text-primary">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
              </svg>
            </div>
            <h1 className="text-lg font-bold text-text-primary-light">Lsx wholesale</h1>
          </Link>

          {/* Language Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('zh')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                language === 'zh'
                  ? 'bg-primary text-white'
                  : 'bg-border-light text-text-primary-light hover:bg-gray-300'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                language === 'en'
                  ? 'bg-primary text-white'
                  : 'bg-border-light text-text-primary-light hover:bg-gray-300'
              }`}
            >
              English
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary-light mb-2">{currentContent.title}</h1>
          <p className="text-sm text-text-secondary-light">{currentContent.lastUpdated}</p>
        </div>

        <div className="space-y-8">
          {currentContent.sections.map((section, index) => (
            <section key={index} className="rounded-lg border border-border-light bg-card-light p-6">
              <h2 className="text-xl font-bold text-text-primary-light mb-3">{section.title}</h2>
              <p className="text-base text-text-primary-light leading-relaxed whitespace-pre-wrap">{section.content}</p>
            </section>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card-light border-t border-border-light mt-12">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-text-primary-light uppercase mb-4">公司</h3>
              <ul className="space-y-2">
                <li><Link href="/" className="text-text-secondary-light hover:text-primary">首頁</Link></li>
                <li><Link href="/products" className="text-text-secondary-light hover:text-primary">商品</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary-light uppercase mb-4">客戶服務</h3>
              <ul className="space-y-2">
                <li><a href="mailto:support@lsxwholesale.com" className="text-text-secondary-light hover:text-primary">聯絡我們</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary-light uppercase mb-4">法律</h3>
              <ul className="space-y-2">
                <li><Link href="/terms-of-service" className="text-primary font-medium">服務條款</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border-light pt-8 text-center">
            <p className="text-text-secondary-light">© {new Date().getFullYear()} Lsx wholesale. 版權所有。</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

