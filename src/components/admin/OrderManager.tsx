import { useState, useEffect, Fragment } from "react";

export default function OrderManager() {
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(0);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<string>("PENDING");
  const [ordersSearch, setOrdersSearch] = useState("");
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<number>>(new Set());
  const pageSize = 20;
  
  // 訂單詳情狀態
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  
  // 缺貨退款 Modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTargetItem, setRefundTargetItem] = useState<any>(null);
  const [refundQty, setRefundQty] = useState(1);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    fetchOrders(0);
  }, []);

  const fetchOrders = async (page: number = 0) => {
    try {
      setOrdersLoading(true);
      const offset = page * pageSize;
      let url = `/api/admin/orders?limit=${pageSize}&offset=${offset}`;

      if (ordersStatusFilter) {
        url += `&status=${encodeURIComponent(ordersStatusFilter)}`;
      }

      if (ordersSearch) {
        url += `&search=${encodeURIComponent(ordersSearch)}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setOrders(result.data || []);
        setOrdersTotal(result.count || 0);
        setOrdersPage(page);
      } else {
        const j = await res.json().catch(() => ({}));
        alert("載入訂單列表失敗：" + (j?.error || "未知錯誤"));
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      alert("載入訂單列表失敗");
    } finally {
      setOrdersLoading(false);
    }
  };

  const toggleOrderExpand = (id: number) => {
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openOrderDetail = async (order: any) => {
    try {
      setOrderDetailLoading(true);
      const res = await fetch(`/api/admin/orders/${order.id}`);
      if (res.ok) {
        const data = await res.json();
        console.log("Order Detail Data:", data); // Debug
        setSelectedOrder(data);
        setShowOrderDetail(true);
      } else {
        alert("載入訂單詳情失敗");
      }
    } catch (err) {
      console.error("Failed to fetch order detail:", err);
      alert("載入失敗");
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const handleSaveOrder = async () => {
    if (!selectedOrder) return;
    try {
      setOrderDetailLoading(true);
      const payload = {
        status: selectedOrder.status,
        shipping_fee_intl: selectedOrder.shipping_fee_intl,
        box_fee: selectedOrder.box_fee,
        box_count: selectedOrder.box_count,
        tracking_number: selectedOrder.tracking_number,
        shipping_method: selectedOrder.shipping_method,
        recipient_name: selectedOrder.recipient_name,
        recipient_phone: selectedOrder.recipient_phone,
        shipping_address: selectedOrder.shipping_address
      };

      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("訂單更新成功");
        fetchOrders(ordersPage);
        openOrderDetail({ id: selectedOrder.id });
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "更新失敗");
      }
    } catch (err) {
      console.error("Failed to save order:", err);
      alert("更新失敗");
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const openRefundModal = (item: any) => {
    setRefundTargetItem(item);
    setRefundQty(1);
    setRefundReason("缺貨");
    setShowRefundModal(true);
  };

  const handleRefundItems = async () => {
    if (!refundTargetItem || refundQty <= 0) return;
    try {
      setRefunding(true);
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/refund-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ item_id: refundTargetItem.id, refund_qty: refundQty }],
          reason: refundReason
        }),
      });

      if (res.ok) {
        alert("退款處理成功");
        setShowRefundModal(false);
        openOrderDetail({ id: selectedOrder.id });
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "退款失敗");
      }
    } catch (err) {
      console.error("Refund failed:", err);
      alert("退款失敗");
    } finally {
      setRefunding(false);
    }
  };

  const updateItemStatus = async (itemId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/items/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, status: newStatus }),
      });

      if (res.ok) {
        openOrderDetail({ id: selectedOrder.id });
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "更新失敗");
      }
    } catch (err) {
      console.error("Update item status failed:", err);
      alert("更新失敗");
    }
  };

  const updateItemShipping = async (itemId: number, weight: number, method: string, boxFee: number, country: string, boxCount: number) => {
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/items/shipping`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: itemId,
          weight: weight,
          shipping_method: method,
          box_fee: boxFee,
          shipping_country: country,
          box_count: boxCount
        }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setSelectedOrder((prev: any) => ({
          ...prev,
          items: prev.items.map((item: any) =>
            item.id === itemId ? { ...item, ...data } : item
          )
        }));
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "更新失敗");
      }
    } catch (err) {
      console.error("Update item shipping failed:", err);
      alert("更新失敗");
    }
  };

  return (
    <div className="py-6 space-y-6">
      {/* 搜尋與篩選 */}
      <div className="flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="搜尋訂單（訂單編號）"
          value={ordersSearch}
          onChange={(e) => setOrdersSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-border-light rounded-lg"
        />
        <select
          value={ordersStatusFilter}
          onChange={(e) => setOrdersStatusFilter(e.target.value)}
          className="px-4 py-2 border border-border-light rounded-lg"
        >
          <option value="">全部狀態</option>
          <option value="PENDING">處理中</option>
          <option value="COMPLETED">處理完畢</option>
          <option value="CANCELLED">取消訂單</option>
          <option value="DISPUTE_PENDING">爭議待處理</option>
        </select>
        <button
          onClick={() => fetchOrders(0)}
          className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
        >
          搜尋
        </button>
      </div>

      {/* 訂單列表 */}
      {ordersLoading ? (
        <p className="text-text-secondary-light">載入中...</p>
      ) : orders.length === 0 ? (
        <p className="text-text-secondary-light">暫無訂單</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border-light">
                <th className="w-10 py-3 px-4"></th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">
                  訂單編號
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">
                  會員 Email
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">
                  會員名稱
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">
                  商品明細
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">
                  金額 (NT$)
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">
                  狀態
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">
                  建立時間
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <Fragment key={order.id}>
                  <tr className={`border-b border-border-light hover:bg-gray-50 ${expandedOrderIds.has(order.id) ? "bg-gray-50" : ""}`}>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleOrderExpand(order.id)}
                        className="text-text-secondary-light hover:text-text-primary-light transition-colors"
                      >
                        <span className="material-symbols-outlined transform transition-transform duration-200" style={{ transform: expandedOrderIds.has(order.id) ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          expand_more
                        </span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">#{order.id}</td>
                    <td className="py-3 px-4 text-sm">{order.user_email || "-"}</td>
                    <td className="py-3 px-4 text-sm">{order.user_display_name || "-"}</td>
                    <td className="py-3 px-4 text-sm max-w-xs">
                      <div className="space-y-1">
                        {order.order_items && order.order_items.length > 0 ? (
                          <span className="text-sm text-text-secondary-light">共 {order.order_items.length} 項商品</span>
                        ) : (
                          <span className="text-gray-400 text-xs">無商品資料</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {typeof order.total_twd === "number"
                        ? order.total_twd.toLocaleString("zh-TW")
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                        order.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                        order.status === "CANCELLED" ? "bg-gray-100 text-gray-800" :
                        order.status === "DISPUTE_PENDING" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {
                          order.status === "PENDING" ? "處理中" :
                          order.status === "COMPLETED" ? "處理完畢" :
                          order.status === "CANCELLED" ? "取消訂單" :
                          order.status === "DISPUTE_PENDING" ? "爭議待處理" :
                          order.status
                        }
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleString("zh-TW")
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <button
                        onClick={() => openOrderDetail(order)}
                        className="text-primary hover:underline font-medium"
                      >
                        詳情
                      </button>
                    </td>
                  </tr>
                  {expandedOrderIds.has(order.id) && (
                    <tr className="bg-gray-50/50">
                      <td colSpan={9} className="px-4 py-4 border-b border-border-light">
                        <div className="bg-white rounded-lg border border-border-light p-4 shadow-sm">
                          <h4 className="text-sm font-bold text-text-primary-light mb-3">商品明細</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead className="bg-gray-50 text-xs text-text-secondary-light uppercase">
                                <tr>
                                  <th className="p-3">商品</th>
                                  <th className="p-3">單價</th>
                                  <th className="p-3">數量</th>
                                  <th className="p-3">小計</th>
                                  <th className="p-3">狀態</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border-light text-sm">
                                {order.order_items?.map((item: any) => (
                                  <tr key={item.id}>
                                    <td className="p-3">
                                      <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden shrink-0 border border-border-light">
                                          {item.product?.images?.[0] ? (
                                            <img src={item.product.images[0]} className="w-full h-full object-cover" alt="" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                              <span className="material-symbols-outlined text-lg">image</span>
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <p className="font-medium text-text-primary-light line-clamp-1">{item.product?.title_zh || item.product?.title_original || "未知商品"}</p>
                                          <p className="text-xs text-text-secondary-light">{item.product?.sku}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-3">NT$ {item.unit_price_twd?.toLocaleString()}</td>
                                    <td className="p-3">{item.qty}</td>
                                    <td className="p-3 font-medium">NT$ {(item.unit_price_twd * item.qty).toLocaleString()}</td>
                                    <td className="p-3">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${item.status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-800' :
                                          item.status === 'PARTIAL_OOS' ? 'bg-orange-100 text-orange-800' :
                                            'bg-green-100 text-green-800'
                                        }`}>
                                        {item.status === 'OUT_OF_STOCK' ? '缺貨' : item.status === 'PARTIAL_OOS' ? '部分缺貨' : '正常'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分頁 */}
      {ordersTotal > pageSize && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => fetchOrders(Math.max(ordersPage - 1, 0))}
            disabled={ordersPage === 0}
            className="px-4 py-2 border border-border-light rounded-lg disabled:opacity-50"
          >
            上一頁
          </button>
          <span className="text-sm text-text-secondary-light">
            第 {ordersPage + 1} 頁 / 共 {Math.ceil(ordersTotal / pageSize)} 頁
          </span>
          <button
            onClick={() => {
              const nextPage = ordersPage + 1;
              if (nextPage * pageSize < ordersTotal) {
                fetchOrders(nextPage);
              }
            }}
            disabled={(ordersPage + 1) * pageSize >= ordersTotal}
            className="px-4 py-2 border border-border-light rounded-lg disabled:opacity-50"
          >
            下一頁
          </button>
        </div>
      )}

      {/* 訂單詳情 Modal */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border-light p-6 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold">訂單 #{selectedOrder.id}</h2>
              <button onClick={() => setShowOrderDetail(false)} className="text-text-secondary-light hover:text-text-primary-light">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 狀態與基本資訊 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">訂單狀態</h3>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => setSelectedOrder({ ...selectedOrder, status: e.target.value })}
                    className="w-full px-4 py-2 border border-border-light rounded-lg"
                  >
                    <option value="PENDING">處理中</option>
                    <option value="COMPLETED">處理完畢</option>
                    <option value="CANCELLED">取消訂單</option>
                    <option value="DISPUTE_PENDING">爭議待處理</option>
                  </select>
                  
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p className="text-sm text-text-secondary-light">建立時間: {new Date(selectedOrder.created_at).toLocaleString("zh-TW")}</p>
                    <p className="text-sm text-text-secondary-light">會員: {selectedOrder.user_display_name} ({selectedOrder.user_email})</p>
                    <p className="text-sm text-text-secondary-light">總金額: <span className="font-bold text-primary">NT$ {selectedOrder.total_twd}</span></p>
                    {selectedOrder.shipping_paid && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        已支付補運費
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold">收件資訊</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs text-text-secondary-light">收件人</label>
                      <input
                        value={selectedOrder.recipient_name || ""}
                        onChange={(e) => setSelectedOrder({ ...selectedOrder, recipient_name: e.target.value })}
                        className="w-full px-3 py-2 border border-border-light rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-text-secondary-light">電話</label>
                      <input
                        value={selectedOrder.recipient_phone || ""}
                        onChange={(e) => setSelectedOrder({ ...selectedOrder, recipient_phone: e.target.value })}
                        className="w-full px-3 py-2 border border-border-light rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-text-secondary-light">地址</label>
                      <textarea
                        value={selectedOrder.shipping_address || ""}
                        onChange={(e) => setSelectedOrder({ ...selectedOrder, shipping_address: e.target.value })}
                        className="w-full px-3 py-2 border border-border-light rounded-lg text-sm"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 運費與物流 (舊版 - 僅保留檢視或備註) */}
              <div className="border-t border-border-light pt-6">
                <h3 className="text-lg font-bold mb-4">物流設定</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">全單追蹤單號 (若有)</label>
                    <input
                      type="text"
                      value={selectedOrder.tracking_number || ""}
                      onChange={(e) => setSelectedOrder({ ...selectedOrder, tracking_number: e.target.value })}
                      className="w-full px-3 py-2 border border-border-light rounded-lg"
                      placeholder="輸入物流單號"
                    />
                  </div>
                  <div className="col-span-2 text-sm text-text-secondary-light">
                    * 註：運費與物流方式已改為下方商品層級設定。
                  </div>
                </div>
              </div>

              {/* 訂單項目 */}
              <div className="border-t border-border-light pt-6">
                <h3 className="text-lg font-bold mb-4">商品明細</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-sm font-medium whitespace-nowrap">商品</th>
                        <th className="p-3 text-sm font-medium whitespace-nowrap">單價/數量</th>
                        <th className="p-3 text-sm font-medium whitespace-nowrap w-24">重量 (kg)</th>
                        <th className="p-3 text-sm font-medium min-w-[120px] whitespace-nowrap">國際運費</th>
                        <th className="p-3 text-sm font-medium min-w-[140px] whitespace-nowrap">物流方式</th>
                        <th className="p-3 text-sm font-medium w-24 whitespace-nowrap">包材費</th>
                        <th className="p-3 text-sm font-medium min-w-[120px] whitespace-nowrap">運費試算</th>
                        <th className="p-3 text-sm font-medium w-32 whitespace-nowrap">寄件編號</th>
                        <th className="p-3 text-sm font-medium whitespace-nowrap">狀態</th>
                        <th className="p-3 text-sm font-medium whitespace-nowrap">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {selectedOrder.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden shrink-0">
                                {item.product?.images?.[0] && (
                                  <img src={item.product.images[0]} className="w-full h-full object-cover" alt="" />
                                )}
                              </div>
                              <div className="text-sm">
                                <p className="font-medium line-clamp-1">{item.product?.title_zh || item.product?.title_original}</p>
                                <p className="text-text-secondary-light text-xs">{item.product?.sku}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            <div>${item.unit_price_twd}</div>
                            <div className="text-xs text-gray-500">x {item.qty}</div>
                            <div className="font-bold mt-1">${item.unit_price_twd * item.qty}</div>
                          </td>
                          <td className="p-3 text-sm align-top">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0"
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100 disabled:text-gray-400"
                              value={item.weight || 0}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value));
                                setSelectedOrder((prev: any) => ({
                                  ...prev,
                                  items: prev.items.map((i: any) => i.id === item.id ? { ...i, weight: val } : i)
                                }));
                              }}
                              onBlur={(e) => updateItemShipping(item.id, Number(e.target.value), item.shipping_method, item.box_fee || 0, item.shipping_country, item.box_count || 1)}
                              disabled={item.status !== 'ARRIVED'}
                            />
                          </td>
                          <td className="p-3 text-sm align-top">
                            <select
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100 disabled:text-gray-400"
                              value={item.shipping_country || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedOrder((prev: any) => ({
                                  ...prev,
                                  items: prev.items.map((i: any) => i.id === item.id ? { ...i, shipping_country: val } : i)
                                }));
                                updateItemShipping(item.id, item.weight || 0, item.shipping_method, item.box_fee || 0, val, item.box_count || 1);
                              }}
                              disabled={item.status !== 'ARRIVED'}
                            >
                              <option value="">選擇國家</option>
                              <option value="KR">韓國 (KR)</option>
                              <option value="JP">日本 (JP)</option>
                              <option value="TH">泰國 (TH)</option>
                            </select>
                          </td>
                          <td className="p-3 text-sm align-top space-y-1">
                            <select
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100 disabled:text-gray-400"
                              value={item.shipping_method || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedOrder((prev: any) => ({
                                  ...prev,
                                  items: prev.items.map((i: any) => i.id === item.id ? { ...i, shipping_method: val } : i)
                                }));
                                updateItemShipping(item.id, item.weight || 0, val, item.box_fee || 0, item.shipping_country, item.box_count || 1);
                              }}
                              disabled={item.status !== 'ARRIVED'}
                            >
                              <option value="">未設定</option>
                              <option value="POST">郵政宅配</option>
                              <option value="BLACK_CAT">黑貓宅配</option>
                              <option value="HSINCHU">新竹貨運</option>
                              <option value="CVS">便利店</option>
                              <option value="WHOLESALE_STORE">批發客賣貨便</option>
                            </select>
                            {(item.shipping_method === 'POST' || item.shipping_method === 'BLACK_CAT' || item.shipping_method === 'HSINCHU' || item.shipping_method === 'CVS') && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={1}
                                  placeholder="箱數"
                                  className="w-full text-sm border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100 disabled:text-gray-400"
                                  value={item.box_count || 1}
                                  onChange={(e) => {
                                    const val = Math.max(1, Math.floor(Number(e.target.value)));
                                    setSelectedOrder((prev: any) => ({
                                      ...prev,
                                      items: prev.items.map((i: any) => i.id === item.id ? { ...i, box_count: val } : i)
                                    }));
                                  }}
                                  onBlur={(e) => updateItemShipping(item.id, item.weight || 0, item.shipping_method, item.box_fee || 0, item.shipping_country, Math.max(1, Math.floor(Number(e.target.value))))}
                                  disabled={item.status !== 'ARRIVED'}
                                />
                                <span className="text-xs text-gray-500 whitespace-nowrap">箱</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-sm align-top">
                            <input
                              type="number"
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100 disabled:text-gray-400"
                              value={item.box_fee || 0}
                              onChange={(e) => {
                                const val = Math.max(0, Math.floor(Number(e.target.value)));
                                setSelectedOrder((prev: any) => ({
                                  ...prev,
                                  items: prev.items.map((i: any) => i.id === item.id ? { ...i, box_fee: val } : i)
                                }));
                              }}
                              onBlur={(e) => updateItemShipping(item.id, item.weight || 0, item.shipping_method, Number(e.target.value), item.shipping_country, item.box_count || 1)}
                              disabled={item.status !== 'ARRIVED'}
                            />
                          </td>
                          <td className="p-3 text-sm align-top">
                            <div className="text-xs space-y-1">
                              <div>國際: ${item.shipping_fee_intl || 0}</div>
                              <div>國內: ${item.shipping_fee_domestic || 0}</div>
                              <div>包材: ${item.box_fee || 0}</div>
                              <div className="font-bold border-t pt-1 text-primary">
                                總計: ${(item.shipping_fee_intl || 0) + (item.shipping_fee_domestic || 0) + (item.box_fee || 0)}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-sm align-top">
                            {item.shipping_method === "WHOLESALE_STORE" ? (
                              <div className="text-xs">
                                {item.member_shipping_code ? (
                                  <span className="font-mono bg-gray-100 px-1 rounded">{item.member_shipping_code}</span>
                                ) : (
                                  <span className="text-red-500">待會員填寫</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-3 text-sm">
                            <div className="space-y-1">
                              {item.shipping_paid ? (
                                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded block text-center">運費已付</span>
                              ) : (
                                ((item.shipping_fee_intl || 0) + (item.shipping_fee_domestic || 0) + (item.box_fee || 0)) > 0 && (
                                  <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded block text-center">運費未付</span>
                                )
                              )}
                              <span className={`px-2 py-1 rounded text-xs font-medium block text-center ${
                              item.status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-800' : 
                              item.status === 'PARTIAL_OOS' ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {(() => {
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
                                return map[item.status] || item.status;
                              })()}
                            </span>
                            </div>
                            {item.refund_amount > 0 && (
                              <div className="text-xs text-red-600 mt-1">已退 NT${item.refund_amount}</div>
                            )}
                          </td>
                          <td className="p-3 text-sm">
                            <div className="flex flex-col gap-2">
                              {item.status !== 'OUT_OF_STOCK' && item.status !== 'PARTIAL_OOS' && (
                                <select
                                  value={item.status}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'OUT_OF_STOCK_MODAL') {
                                      openRefundModal(item);
                                    } else {
                                      updateItemStatus(item.id, val);
                                    }
                                  }}
                                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                                >
                                  <option value="NORMAL">國外配貨中</option>
                                  <option value="ALLOCATED">國外配貨完成</option>
                                  <option value="IN_TRANSIT">回台運輸中</option>
                                  <option value="ARRIVED">商品抵台</option>
                                  <option value="SHIPPED">商品寄出</option>
                                  <option value="DELIVERY_FAILED">未收貨</option>
                                  <option value="RECEIVED">已收貨</option>
                                  <option value="OUT_OF_STOCK_MODAL" className="text-red-600">標記缺貨/退款...</option>
                                </select>
                              )}
                              {(item.status === 'OUT_OF_STOCK' || item.status === 'PARTIAL_OOS') && (
                                <span className="text-xs text-gray-500">已退款處理</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-border-light p-6 flex justify-end gap-3">
              <button onClick={() => setShowOrderDetail(false)} className="px-4 py-2 border border-border-light rounded-lg hover:bg-gray-50">
                關閉
              </button>
              <button onClick={handleSaveOrder} disabled={orderDetailLoading} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {orderDetailLoading ? "儲存中..." : "儲存變更"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 缺貨退款 Modal */}
      {showRefundModal && refundTargetItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">缺貨退款處理</h3>
            <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
              <p className="font-bold">{refundTargetItem.product?.title_zh}</p>
              <p>單價: NT$ {refundTargetItem.unit_price_twd} | 訂購數量: {refundTargetItem.qty}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">退款數量 (缺貨數量)</label>
                <input
                  type="number"
                  min={1}
                  max={refundTargetItem.qty}
                  value={refundQty}
                  onChange={(e) => setRefundQty(Math.min(refundTargetItem.qty, Math.max(1, Number(e.target.value))))}
                  className="w-full px-3 py-2 border border-border-light rounded-lg"
                />
                <p className="text-sm text-text-secondary-light mt-1">
                  預計退款: <span className="text-red-600 font-bold">NT$ {refundQty * refundTargetItem.unit_price_twd}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">退款原因</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 border border-border-light rounded-lg"
                  placeholder="例如：廠商缺貨"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowRefundModal(false)} className="px-4 py-2 border border-border-light rounded-lg">取消</button>
              <button onClick={handleRefundItems} disabled={refunding} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {refunding ? "處理中..." : "確認退款"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
