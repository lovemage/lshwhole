"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface OrderItem {
  id: number;
  qty: number;
  unit_price_twd: number;
  status: string;
  refund_amount: number;
  product: {
    title_zh: string;
    title_original: string;
    sku: string;
    images: string[];
  };
}

interface Order {
  id: number;
  created_at: string;
  total_twd: number;
  status: string;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  tracking_number: string | null;
  shipping_method: string | null;
  shipping_fee_intl: number;
  box_fee: number;
  order_items: OrderItem[];
}

export default function MemberOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/orders", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        throw new Error("載入訂單失敗");
      }

      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError("載入訂單失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING": return "待處理";
      case "PICKING": return "揀貨中";
      case "CHARGED": return "已扣款";
      case "ARRIVED_TW": return "抵台 / 待補運費";
      case "READY_TO_SHIP": return "準備出貨";
      case "SHIPPED": return "已出貨";
      case "RECEIVED": return "已收貨";
      case "REFUNDED": return "已退款";
      case "CANCELLED": return "已取消";
      default: return status;
    }
  };

  const getItemStatusText = (status: string) => {
    const map: any = {
      NORMAL: "國外配貨中",
      ALLOCATED: "國外配貨完成",
      IN_TRANSIT: "回台運輸中",
      ARRIVED: "商品抵台",
      SHIPPED: "商品寄出",
      DELIVERY_FAILED: "未收貨",
      RECEIVED: "已收貨",
      OUT_OF_STOCK: "缺貨/斷貨",
      PARTIAL_OOS: "部分缺貨"
    };
    return map[status] || "配貨中";
  };

  const getItemStatusColor = (status: string) => {
    switch (status) {
      case "ALLOCATED": return "text-green-600 bg-green-50 border-green-200";
      case "IN_TRANSIT": return "text-indigo-600 bg-indigo-50 border-indigo-200";
      case "ARRIVED": return "text-purple-600 bg-purple-50 border-purple-200";
      case "SHIPPED": return "text-blue-600 bg-blue-50 border-blue-200";
      case "RECEIVED": return "text-gray-600 bg-gray-50 border-gray-200";
      case "OUT_OF_STOCK": return "text-red-600 bg-red-50 border-red-200";
      case "PARTIAL_OOS": return "text-orange-600 bg-orange-50 border-orange-200";
      default: return "text-blue-600 bg-blue-50 border-blue-200"; // Normal/Processing
    }
  };

  const handlePayShipping = async (orderId: number) => {
    if (!confirm("確定要支付運費嗎？將從您的錢包扣款。")) return;

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const res = await fetch(`/api/orders/${orderId}/pay-shipping`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "支付失敗");
        return;
      }

      alert("支付成功！");
      fetchOrders(); // Reload
    } catch (e) {
      console.error("Pay shipping failed:", e);
      alert("支付失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link href="/member" className="text-gray-500 hover:text-gray-900">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">我的訂單</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">載入訂單中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={fetchOrders} className="px-4 py-2 bg-primary text-white rounded-lg">重試</button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-600 mb-4">目前沒有訂單</p>
            <Link href="/products" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90">
              去購物
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Order Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">訂單編號 #{order.id}</div>
                    <div className="text-sm text-gray-900 font-medium">
                      {new Date(order.created_at).toLocaleString("zh-TW")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 mb-1">訂單狀態</div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                      {getStatusText(order.status)}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="divide-y divide-gray-100">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="p-6 flex flex-col sm:flex-row gap-4 sm:items-center">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                        {item.product.images?.[0] ? (
                          <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="material-symbols-outlined">image</span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                          {item.product.title_zh || item.product.title_original}
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">SKU: {item.product.sku}</p>
                        <div className="flex items-baseline gap-4 text-sm">
                          <span className="text-gray-900">NT$ {item.unit_price_twd}</span>
                          <span className="text-gray-500">x {item.qty}</span>
                        </div>
                      </div>

                      {/* Item Status */}
                      <div className="sm:text-right min-w-[100px]">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getItemStatusColor(item.status)}`}>
                          {getItemStatusText(item.status)}
                        </span>
                        {item.refund_amount > 0 && (
                          <div className="text-xs text-red-600 mt-1 font-medium">
                            已退 NT$ {item.refund_amount}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-gray-600 space-y-1">
                      {order.shipping_method && <div>運送方式: {order.shipping_method}</div>}
                      {order.tracking_number && <div>單號: {order.tracking_number}</div>}
                      {order.status === "ARRIVED_TW" && (
                        <div className="text-orange-600 font-medium">
                          <p>請支付補運費以安排出貨</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                       <div className="text-sm text-gray-500 mb-1">商品金額: NT$ {order.total_twd.toLocaleString()}</div>
                       {(order.shipping_fee_intl > 0 || order.box_fee > 0) && (
                         <div className="text-sm text-gray-500 mb-1">
                           補運費: NT$ {((order.shipping_fee_intl || 0) + (order.box_fee || 0)).toLocaleString()}
                           <span className="text-xs text-gray-400 ml-1">
                             (國際運費 {order.shipping_fee_intl || 0} + 包材 {order.box_fee || 0})
                           </span>
                         </div>
                       )}
                       <div className="text-lg font-bold text-gray-900 mt-2">
                         總計 NT$ {(order.total_twd + (order.shipping_fee_intl || 0) + (order.box_fee || 0)).toLocaleString()}
                       </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {order.status === "ARRIVED_TW" && (
                    <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handlePayShipping(order.id)}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 shadow-sm"
                      >
                        支付運費 NT$ {((order.shipping_fee_intl || 0) + (order.box_fee || 0)).toLocaleString()}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
