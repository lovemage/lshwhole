'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PrivacyPolicy() {
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');

  const content = {
    zh: {
      title: '隱私權政策',
      lastUpdated: '最後更新：2024年11月',
      sections: [
        {
          title: '1. 政策簡介',
          content: '歡迎來到 LshWholesale。我們致力於保護您的隱私。本隱私政策說明我們在您訪問我們的網站時如何收集、使用、披露和保護您的信息。請仔細閱讀本隱私政策。如果您不同意本隱私政策的條款，請不要訪問該網站。'
        },
        {
          title: '2. 我們收集的數據',
          content: '我們可能以多種方式收集有關您的信息。我們在網站上可能收集的信息包括：\n\n• 個人識別信息（如姓名、電子郵件地址、電話號碼、郵寄地址）\n• 帳戶信息（用戶名、密碼、帳戶偏好設置）\n• 交易信息（訂單歷史、付款方式、發貨地址）\n• 設備信息（IP 地址、瀏覽器類型、操作系統）\n• 使用數據（訪問的頁面、停留時間、點擊的鏈接）'
        },
        {
          title: '3. 我們如何使用您的數據',
          content: '擁有關於您的準確信息使我們能夠為您提供順暢、高效和定制的體驗。具體來說，我們可能會使用通過網站收集的有關您的信息來：\n\n• 完成和管理購買、訂單、付款和其他交易\n• 向您發送確認電子郵件並與您溝通有關您的帳戶或訂單\n• 改進我們的網站、產品、營銷和客戶服務\n• 在您同意的情況下向您發送促銷信息，如新聞通訊'
        },
        {
          title: '4. 數據共享和披露',
          content: '我們可能在某些情況下共享我們收集的有關您的信息。您的信息可能按以下方式披露：\n\n• 根據法律或保護權利：如果我們認為披露有關您的信息是必要的，以回應法律程序、調查或補救我們政策的潛在違規，或保護他人的權利、財產和安全。\n• 第三方服務提供商：我們可能與為我們或代表我們執行服務的第三方共享您的信息，包括支付處理、運輸合作夥伴、數據分析、電子郵件傳遞和營銷協助。'
        },
        {
          title: '5. 您的權利',
          content: '您對您的個人數據擁有某些權利，包括：\n\n• 訪問權 – 您有權要求獲得您個人數據的副本\n• 更正權 – 您有權要求我們更正您認為不準確或不完整的任何信息\n• 刪除權 – 在某些情況下，您有權要求我們刪除您的個人數據\n• 數據可攜帶權 – 您有權以結構化、常用和機器可讀的格式接收您的數據'
        },
        {
          title: '6. 安全措施',
          content: '我們使用行政、技術和物理安全措施來幫助保護您的個人信息。雖然我們已採取合理步驟來保護您提供給我們的個人信息，但請注意，儘管我們的努力，沒有安全措施是完美或無懈可擊的，沒有數據傳輸方法可以保證不被任何攔截或其他類型的濫用。'
        },
        {
          title: '7. Cookie 和追蹤技術',
          content: '我們可能在網站上使用 Cookie、網絡信標、追蹤像素和其他追蹤技術來幫助自定義網站並改進您的體驗。當您訪問網站時，不會通過使用追蹤技術收集您的個人信息。'
        },
        {
          title: '8. 兒童隱私',
          content: '我們的網站不針對 13 歲以下的兒童。我們不會故意收集 13 歲以下兒童的個人信息。如果我們發現我們已收集 13 歲以下兒童的個人信息，我們將立即從我們的服務器中刪除此類信息。'
        },
        {
          title: '9. 政策變更',
          content: '我們保留隨時以任何理由對本隱私政策進行更改的權利。我們將通過更新本隱私政策的「最後更新」日期來提醒您任何更改。我們鼓勵您定期查看本隱私政策以了解最新信息。'
        },
        {
          title: '10. 聯絡我們',
          content: '如果您對本隱私政策有任何疑問或意見，請通過以下方式與我們聯繫：\n\n電子郵件：privacy@lsxwholesale.com\n地址：台灣'
        }
      ]
    },
    en: {
      title: 'Privacy Policy',
      lastUpdated: 'Last Updated: November 2024',
      sections: [
        {
          title: '1. Introduction',
          content: 'Welcome to LshWholesale. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.'
        },
        {
          title: '2. Data We Collect',
          content: 'We may collect information about you in a variety of ways. The information we may collect on the Site includes:\n\n• Personal identification information (such as name, email address, phone number, mailing address)\n• Account information (username, password, account preferences)\n• Transaction information (order history, payment methods, shipping address)\n• Device information (IP address, browser type, operating system)\n• Usage data (pages visited, time spent, links clicked)'
        },
        {
          title: '3. How We Use Your Data',
          content: 'Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:\n\n• Fulfill and manage purchases, orders, payments, and other transactions\n• Send you a confirmation email and communicate with you about your account or orders\n• Improve our website, products, marketing, and customer service\n• Send you promotional information, such as newsletters, with your consent'
        },
        {
          title: '4. Data Sharing and Disclosure',
          content: 'We may share information we have collected about you in certain situations. Your information may be disclosed as follows:\n\n• By Law or to Protect Rights: If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others.\n• Third-Party Service Providers: We may share your information with third parties that perform services for us or on our behalf, including payment processing, shipping partners, data analysis, email delivery, and marketing assistance.'
        },
        {
          title: '5. Your Rights',
          content: 'You have certain rights regarding your personal data, including:\n\n• The right to access – You have the right to request copies of your personal data\n• The right to rectification – You have the right to request that we correct any information you believe is inaccurate or complete information you believe is incomplete\n• The right to erasure – You have the right to request that we erase your personal data, under certain conditions\n• The right to data portability – You have the right to receive your data in a structured, commonly used and machine-readable format'
        },
        {
          title: '6. Security Measures',
          content: 'We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.'
        },
        {
          title: '7. Cookies and Tracking Technologies',
          content: 'We may use cookies, web beacons, tracking pixels, and other tracking technologies on the Site to help customize the Site and improve your experience. When you access the Site, your personal information is not collected through the use of tracking technology.'
        },
        {
          title: '8. Children\'s Privacy',
          content: 'Our Site is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If we discover that we have collected personal information from a child under 13, we will immediately delete such information from our servers.'
        },
        {
          title: '9. Changes to this Policy',
          content: 'We reserve the right to make changes to this Privacy Policy at any time and for any reason. We will alert you about any changes by updating the "Last updated" date of this Privacy Policy. You are encouraged to periodically review this Privacy Policy to stay informed of updates.'
        },
        {
          title: '10. Contact Us',
          content: 'If you have questions or comments about this Privacy Policy, please contact us:\n\nEmail: privacy@lsxwholesale.com\nAddress: Taiwan'
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
            <h1 className="text-lg font-bold text-text-primary-light">LshWholesale</h1>
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
                <li><Link href="/terms-of-service" className="text-text-secondary-light hover:text-primary">服務條款</Link></li>
                <li><Link href="/privacy-policy" className="text-primary font-medium">隱私政策</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border-light pt-8 text-center">
            <p className="text-text-secondary-light">© {new Date().getFullYear()} LshWholesale. 版權所有。</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

