"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface TopupRecord {
  id: string | number;
  type: "LEDGER" | "REQUEST";
  amount_twd: number;
  external_ref: string;
  note: string;
  created_at: string;
  status?: string; // For Request: PENDING, REJECTED
}

export default function TopupHistoryPage() {
  const [records, setRecords] = useState<TopupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchTopupHistory = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        // 1. Fetch Ledger (Success)
        const { data: ledgerData, error: ledgerError } = await supabase
          .from("wallet_ledger")
          .select("id, type, amount_twd, external_ref, note, created_at")
          .eq("user_id", session.user.id)
          .eq("type", "TOPUP")
          .order("created_at", { ascending: false });

        if (ledgerError) {
          console.error("Error fetching ledger:", ledgerError);
          setError("載入儲值記錄失敗");
          return;
        }

        // 2. Fetch Requests (Pending/Rejected)
        const { data: requestData, error: reqError } = await supabase
          .from("wallet_topup_requests")
          .select("id, amount_twd, status, created_at, bank_account_last_5")
          .eq("user_id", session.user.id)
          .in("status", ["PENDING", "REJECTED"])
          .order("created_at", { ascending: false });

        if (reqError) {
          console.error("Error fetching requests:", reqError);
        }

        // 3. Combine
        const combinedRecords: TopupRecord[] = [];

        // Map Ledger items
        (ledgerData || []).forEach((item: any) => {
          combinedRecords.push({
            id: `ledger-${item.id}`,
            type: "LEDGER",
            amount_twd: item.amount_twd,
            external_ref: item.external_ref,
            note: item.note,
            created_at: item.created_at,
            status: "SUCCESS"
          });
        });

        // Map Request items
        (requestData || []).forEach((item: any) => {
          combinedRecords.push({
            id: `req-${item.id}`,
            type: "REQUEST",
            amount_twd: item.amount_twd,
            external_ref: `申請中 (後五碼: ${item.bank_account_last_5})`,
            note: item.status === "REJECTED" ? "申請已拒絕" : "申請審核中",
            created_at: item.created_at,
            status: item.status
          });
        });

        // Sort by date desc
        combinedRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setRecords(combinedRecords);
      } catch (err) {
        console.error("Failed to fetch topup history:", err);
        setError("載入儲值記錄失敗");
      } finally {
        setLoading(false);
      }
    };

    fetchTopupHistory();
  }, [router]);

  if (loading) {
    return (
      <div style={{ backgroundColor: "#f8f8f5" }} className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        <header className="sticky top-0 z-50 w-full bg-white/80 border-b border-gray-200">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3">
            <div className="flex items-center gap-3 text-gray-800">
              <Link href="/" className="flex items-center gap-3">
                <div className="size-6 text-primary">
                  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
                  </svg>
                </div>
                <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">LshWholesale</h2>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/member" className="flex min-w-[96px] items-center justify-center h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold hover:bg-gray-300">
                返回會員中心
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <div className="flex items-center justify-center min-h-96">
            <p className="text-gray-600 text-lg">載入中...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: "#f8f8f5" }} className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        <header className="sticky top-0 z-50 w-full bg-white/80 border-b border-gray-200">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3">
            <div className="flex items-center gap-3 text-gray-800">
              <Link href="/" className="flex items-center gap-3">
                <div className="size-6 text-primary">
                  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
                  </svg>
                </div>
                <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">LshWholesale</h2>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/member" className="flex min-w-[96px] items-center justify-center h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold hover:bg-gray-300">
                返回會員中心
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <div className="flex flex-col items-center justify-center min-h-96 gap-4">
            <p className="text-red-600 text-lg font-medium">{error}</p>
            <Link href="/member" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
              返回會員中心
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#f8f8f5" }} className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <header className="sticky top-0 z-50 w-full bg-white/80 border-b border-gray-200">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3">
          <div className="flex items-center gap-3 text-gray-800">
            <Link href="/" className="flex items-center gap-3">
              <div className="size-6 text-primary">
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
                </svg>
              </div>
              <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">LshWholesale</h2>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/member" className="flex min-w-[96px] items-center justify-center h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold hover:bg-gray-300">
              返回會員中心
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <section>
          <div className="flex items-center gap-4 mb-6">
            <Link href="/member" className="text-gray-600 hover:text-primary">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">儲值記錄</h1>
          </div>
          <p className="text-sm text-gray-600 mb-8">
            查看您的儲值歷史記錄。
          </p>
        </section>

        {records.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-600 mb-4">目前沒有儲值記錄</p>
            <Link href="/member" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90">
              返回會員中心
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      時間
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      狀態
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      金額
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      參考編號
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      備註
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.created_at).toLocaleString("zh-TW")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          record.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                          record.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          record.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {record.status === 'SUCCESS' ? '已入帳' :
                           record.status === 'PENDING' ? '申請中' :
                           record.status === 'REJECTED' ? '已拒絕' : record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        +NT$ {record.amount_twd.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {record.external_ref}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.note || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
