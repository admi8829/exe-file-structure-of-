import React, { useState, useEffect, useRef } from "react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../firebase";
import { MenuItem, Order, Alert, Transaction } from "../types";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Bell, 
  Utensils, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  Coffee, 
  DollarSign as MoneyIcon, 
  Activity, 
  Clock, 
  Layers, 
  Volume2, 
  ToggleLeft, 
  ToggleRight 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Web Audio API custom luxury synthesizer for new order notifications
function playChime() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // High-pitched crystal bell 1
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    gain1.gain.setValueAtTime(0, audioCtx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.85);

    // Secondary harmonic minor chord 2 (E-flat major harmony)
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      gain2.gain.setValueAtTime(0, audioCtx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
      osc2.start(audioCtx.currentTime);
      osc2.stop(audioCtx.currentTime + 0.65);
    }, 150);
  } catch (error) {
    console.warn("Audio Context block or not loaded:", error);
  }
}

export default function AdminDashboard() {
  // Collection States
  const [orders, setOrders] = useState<Order[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Navigation Sub-Tabs
  const [activeTab, setActiveTab] = useState<"orders" | "ledger" | "menu">("orders");

  // Ledger Form State
  const [ledgerType, setLedgerType] = useState<"income" | "expense">("income");
  const [ledgerCategory, setLedgerCategory] = useState<string>("Restaurant Order");
  const [ledgerAmount, setLedgerAmount] = useState<string>("");
  const [ledgerDesc, setLedgerDesc] = useState<string>("");
  const [ledgerDate, setLedgerDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Menu Form State
  const [itemName, setItemName] = useState<string>("");
  const [itemPrice, setItemPrice] = useState<string>("");
  const [itemCategory, setItemCategory] = useState<string>("Starters");
  const [itemDesc, setItemDesc] = useState<string>("");
  const [itemImg, setItemImg] = useState<string>("");

  // Sound triggering refs
  const prevOrdersCountRef = useRef<number>(-1);

  // Sound enabling
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Setup Firestore Real-time Subscriptions
  useEffect(() => {
    // 1. Orders
    const qOrders = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const ord: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        ord.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate?.() || data.createdAt : new Date()
        } as Order);
      });

      // Sound notifications check: Play chime on new order if count increases
      if (prevOrdersCountRef.current !== -1 && ord.length > prevOrdersCountRef.current) {
        // Find if there's any active order that is pending
        const hasNewPending = ord.some(o => o.status === "pending");
        if (hasNewPending && soundEnabled) {
          playChime();
        }
      }
      prevOrdersCountRef.current = ord.length;
      setOrders(ord);
    });

    // 2. Alerts
    const qAlerts = query(collection(db, "alerts"), orderBy("createdAt", "desc"));
    const unsubAlerts = onSnapshot(qAlerts, (snapshot) => {
      const al: Alert[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        al.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate?.() || data.createdAt : new Date()
        } as Alert);
      });
      setAlerts(al);
    });

    // 3. Transactions
    const qTrans = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const tr: Transaction[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        tr.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate?.() || data.createdAt : new Date()
        } as Transaction);
      });
      setTransactions(tr);
    });

    // 4. Menu Items
    const qMenu = query(collection(db, "menu_items"), orderBy("name"));
    const unsubMenu = onSnapshot(qMenu, (snapshot) => {
      const items: MenuItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as MenuItem);
      });
      setMenuItems(items);
    });

    return () => {
      unsubOrders();
      unsubAlerts();
      unsubTrans();
      unsubMenu();
    };
  }, [soundEnabled]);

  // Order Action Handlers
  const handleUpdateOrderStatus = async (orderId: string, newStatus: "completed" | "cancelled" | "pending") => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  // Alert Resolution Handlers
  const handleResolveAlert = async (alertId: string) => {
    try {
      const alertRef = doc(db, "alerts", alertId);
      await updateDoc(alertRef, { status: "resolved" });
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  // Delete Alerts
  const handleDeleteAlert = async (alertId: string) => {
    try {
      await deleteDoc(doc(db, "alerts", alertId));
    } catch (error) {
      console.error("Error deleting alert:", error);
    }
  };

  // Submit Ledger entry
  const handleSubmitLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(ledgerAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    try {
      await addDoc(collection(db, "transactions"), {
        type: ledgerType,
        category: ledgerCategory,
        amount: amountNum,
        description: ledgerDesc,
        date: ledgerDate,
        createdAt: serverTimestamp()
      });
      setLedgerAmount("");
      setLedgerDesc("");
    } catch (error) {
      console.error("Error writing ledger entry:", error);
    }
  };

  // Submit Menu Item
  const handleSubmitMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(itemPrice);
    if (!itemName || isNaN(priceNum) || priceNum <= 0) return;

    try {
      await addDoc(collection(db, "menu_items"), {
        name: itemName,
        price: priceNum,
        category: itemCategory,
        description: itemDesc,
        imageUrl: itemImg || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600",
        available: true
      });
      setItemName("");
      setItemPrice("");
      setItemDesc("");
      setItemImg("");
    } catch (error) {
      console.error("Error writing menu item:", error);
    }
  };

  // Delete Menu Item
  const handleDeleteMenuItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, "menu_items", itemId));
    } catch (error) {
      console.error("Error deleting menu item:", error);
    }
  };

  // Toggle item availability
  const handleToggleItemAvailability = async (item: MenuItem) => {
    try {
      const itemRef = doc(db, "menu_items", item.id);
      await updateDoc(itemRef, { available: !item.available });
    } catch (error) {
      console.error("Error toggling menu item availability:", error);
    }
  };

  // Ledger Summary Calculation
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const netRevenue = totalIncome - totalExpense;

  // Active Alert count
  const pendingAlertsCount = alerts.filter(a => a.status === "pending").length;
  // Pending orders count
  const pendingOrdersCount = orders.filter(o => o.status === "pending").length;

  return (
    <div id="admin_root" className="min-h-screen bg-[#0b0f17] text-gray-200 flex flex-col font-sans">
      {/* Admin Navbar */}
      <header className="bg-[#121926] border-b border-[#202c3f] px-6 py-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 rounded-xl shadow-lg shadow-amber-950/40">
            <Activity className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-lg font-serif tracking-wider font-extrabold text-white">HOTELSYNC CENTRAL</h2>
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Admin Control System</p>
          </div>
        </div>

        {/* Audio Toggle / Sound Check */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              playChime();
            }}
            id="sound_test_btn"
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#1b2536] border border-[#2a3a54] hover:border-amber-500/50 rounded-lg text-xs font-bold transition duration-150 cursor-pointer"
          >
            <Volume2 className={`w-4 h-4 ${soundEnabled ? "text-amber-500 animate-pulse" : "text-gray-500"}`} />
            <span>Chime: {soundEnabled ? "ON" : "OFF"}</span>
          </button>
        </div>
      </header>

      {/* Primary Dashboard Summary Bar */}
      <section className="bg-[#121926]/50 border-b border-[#1c283a] grid grid-cols-2 md:grid-cols-4 divide-x divide-[#1c283a] text-center">
        <div className="py-4">
          <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Kitchen Queue</span>
          <span className="text-xl md:text-2xl font-black text-amber-500">{pendingOrdersCount} Pending</span>
        </div>
        <div className="py-4">
          <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Service Alerts</span>
          <span className="text-xl md:text-2xl font-black text-rose-500">{pendingAlertsCount} Active</span>
        </div>
        <div className="py-4">
          <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Net Profit Ledger</span>
          <span className={`text-xl md:text-2xl font-black ${netRevenue >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            ${netRevenue.toFixed(2)}
          </span>
        </div>
        <div className="py-4">
          <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Dishes Hosted</span>
          <span className="text-xl md:text-2xl font-black text-blue-400">{menuItems.length} Loaded</span>
        </div>
      </section>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Sidebar Navigation */}
        <nav className="w-full md:w-64 bg-[#121926] border-r border-[#1c283a] p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible">
          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black tracking-wide uppercase transition duration-150 cursor-pointer ${
              activeTab === "orders" 
                ? "bg-amber-500 text-black shadow-lg shadow-amber-950/30 font-black" 
                : "bg-transparent text-gray-400 hover:text-white hover:bg-[#1b2536]"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Utensils className="w-4.5 h-4.5" /> Room Orders
            </span>
            {pendingOrdersCount > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'orders' ? 'bg-black text-amber-500' : 'bg-amber-500 text-black'}`}>
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black tracking-wide uppercase transition duration-150 cursor-pointer ${
              activeTab === "ledger" 
                ? "bg-amber-500 text-black shadow-lg shadow-amber-950/30 font-black" 
                : "bg-transparent text-gray-400 hover:text-white hover:bg-[#1b2536]"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <MoneyIcon className="w-4.5 h-4.5" /> Bookkeeping Ledger
            </span>
          </button>

          <button
            onClick={() => setActiveTab("menu")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black tracking-wide uppercase transition duration-150 cursor-pointer ${
              activeTab === "menu" 
                ? "bg-amber-500 text-black shadow-lg shadow-amber-950/30 font-black" 
                : "bg-transparent text-gray-400 hover:text-white hover:bg-[#1b2536]"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Layers className="w-4.5 h-4.5" /> Menu Catalog
            </span>
          </button>
        </nav>

        {/* Dynamic Panel Canvas */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* TAB 1: ORDERS & SERVICE ALERTS */}
          {activeTab === "orders" && (
            <div className="space-y-8">
              {/* TOP ROW: REAL-TIME SERVICE REQUEST ALERTS */}
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-rose-500 animate-bounce" /> Service Desk Requests
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {alerts.filter(a => a.status === "pending").map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-[#1c1216] border border-rose-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-lg shadow-rose-950/10"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded px-2.5 py-0.5 font-bold uppercase tracking-widest">
                              {alert.type === "waiter" ? "Waiter Needed" : "Requesting Bill"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {alert.createdAt instanceof Date 
                                ? alert.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : "Now"}
                            </span>
                          </div>
                          <p className="text-lg font-black text-white">Table Number: {alert.tableNumber}</p>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleResolveAlert(alert.id)}
                            className="flex-1 bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 border border-rose-500/30 text-xs font-bold py-2 rounded-xl transition cursor-pointer"
                          >
                            Mark Handled
                          </button>
                          <button
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="bg-transparent hover:bg-rose-950 text-gray-500 hover:text-rose-500 p-2 rounded-xl transition cursor-pointer"
                            title="Dismiss Alert"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {alerts.filter(a => a.status === "pending").length === 0 && (
                    <div className="col-span-full bg-[#121926]/40 border border-[#1c283a] p-6 rounded-2xl text-center text-gray-500 text-xs">
                      All hotel service requests resolved. Excellent job!
                    </div>
                  )}
                </div>
              </div>

              {/* BOTTOM ROW: KITCHEN ORDER QUEUE */}
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-amber-500" /> Kitchen Order Pipeline
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* PENDING / ACTIVE IN KITCHEN */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest pb-1 border-b border-amber-500/20">
                      Pending In-Preparation ({orders.filter(o => o.status === "pending").length})
                    </h4>
                    
                    <AnimatePresence mode="popLayout">
                      {orders.filter(o => o.status === "pending").map((order) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, x: -15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 15 }}
                          className="bg-[#121926] border border-[#202c3f] rounded-2xl p-4 shadow-xl flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-[#202c3f]">
                              <div>
                                <span className="text-xs text-gray-400 font-semibold block">Table {order.tableNumber}</span>
                                <span className="text-[10px] text-gray-500 block">ID: {order.id.slice(-5).toUpperCase()}</span>
                              </div>
                              <span className="text-amber-500 text-sm font-black">${order.totalAmount.toFixed(2)}</span>
                            </div>

                            {/* Itemized List */}
                            <ul className="space-y-1.5 mb-4">
                              {order.items.map((item, index) => (
                                <li key={index} className="text-xs text-gray-300 flex justify-between">
                                  <span>
                                    <span className="text-amber-500 font-bold mr-1.5">{item.quantity}x</span>
                                    {item.name}
                                  </span>
                                  <span className="text-gray-500">${(item.price * item.quantity).toFixed(2)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs py-2 rounded-xl transition duration-150 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check className="w-4.5 h-4.5" /> Serve Order
                            </button>
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, "cancelled")}
                              className="bg-[#1c1216] hover:bg-rose-950 text-rose-500 border border-rose-500/20 font-bold text-xs px-3 py-2 rounded-xl transition duration-150 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {orders.filter(o => o.status === "pending").length === 0 && (
                      <div className="bg-[#121926]/20 border border-dashed border-[#1c283a] p-8 rounded-2xl text-center text-gray-500 text-xs">
                        Kitchen queue is currently empty. No active tickets.
                      </div>
                    )}
                  </div>

                  {/* PREVIOUS COMPLETED & CANCELLED ORDERS HISTORY */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest pb-1 border-b border-[#202c3f]">
                      Recent Service History (Last 5)
                    </h4>

                    <div className="space-y-3">
                      {orders.filter(o => o.status !== "pending").slice(0, 5).map((order) => (
                        <div key={order.id} className="bg-[#121926]/40 border border-[#1c283a] rounded-xl p-3 flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-bold text-white">Table {order.tableNumber}</span>
                              <span className="text-gray-500">#{order.id.slice(-5).toUpperCase()}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                              {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-300 font-bold">${order.totalAmount.toFixed(2)}</span>
                            {order.status === "completed" ? (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-2 font-bold">Served</span>
                            ) : (
                              <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded px-2 font-bold">Cancelled</span>
                            )}
                          </div>
                        </div>
                      ))}

                      {orders.filter(o => o.status !== "pending").length === 0 && (
                        <div className="text-center text-xs text-gray-600 py-6">
                          No previous operations logged today.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOOKKEEPING LEDGER */}
          {activeTab === "ledger" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* LEDGER TRANSACTION ADD FORM */}
              <div className="lg:col-span-1 bg-[#121926] border border-[#202c3f] rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MoneyIcon className="w-4 h-4 text-amber-500" /> Log Financial Ledger Entry
                </h3>

                <form onSubmit={handleSubmitLedger} className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Transaction Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLedgerType("income");
                          setLedgerCategory("Restaurant Order");
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 border ${
                          ledgerType === "income" 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40" 
                            : "bg-transparent text-gray-400 border-[#202c3f] hover:bg-[#182130]"
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5" /> Income
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLedgerType("expense");
                          setLedgerCategory("Kitchen Ingredients");
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 border ${
                          ledgerType === "expense" 
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/40" 
                            : "bg-transparent text-gray-400 border-[#202c3f] hover:bg-[#182130]"
                        }`}
                      >
                        <TrendingDown className="w-3.5 h-3.5" /> Expense
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5" htmlFor="ledger_category">Category</label>
                    <select
                      value={ledgerCategory}
                      onChange={(e) => setLedgerCategory(e.target.value)}
                      className="w-full bg-[#1b2536] border border-[#2e3b4e] rounded-lg px-3 py-2 text-xs focus:ring-amber-500 focus:border-amber-500 text-white"
                      id="ledger_category"
                    >
                      {ledgerType === "income" ? (
                        <>
                          <option>Restaurant Order</option>
                          <option>Room Service Booking</option>
                          <option>Bar & Beverage Sale</option>
                          <option>Spa & Event Fees</option>
                        </>
                      ) : (
                        <>
                          <option>Kitchen Ingredients</option>
                          <option>Utilities (Water/Power)</option>
                          <option>Staff Salary & Wages</option>
                          <option>Marketing & Software</option>
                          <option>Linen & Hospitality Gear</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5" htmlFor="ledger_amount">Amount ($ USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={ledgerAmount}
                      onChange={(e) => setLedgerAmount(e.target.value)}
                      placeholder="99.99"
                      className="w-full bg-[#1b2536] border border-[#2e3b4e] rounded-lg px-3 py-2 text-xs focus:ring-amber-500 focus:border-amber-500 text-white"
                      id="ledger_amount"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5" htmlFor="ledger_date">Date</label>
                    <input
                      type="date"
                      required
                      value={ledgerDate}
                      onChange={(e) => setLedgerDate(e.target.value)}
                      className="w-full bg-[#1b2536] border border-[#2e3b4e] rounded-lg px-3 py-2 text-xs focus:ring-amber-500 focus:border-amber-500 text-white"
                      id="ledger_date"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5" htmlFor="ledger_desc">Memo Description</label>
                    <textarea
                      value={ledgerDesc}
                      onChange={(e) => setLedgerDesc(e.target.value)}
                      placeholder="Supplies purchase or food sale..."
                      className="w-full bg-[#1b2536] border border-[#2e3b4e] rounded-lg px-3 py-2 text-xs focus:ring-amber-500 focus:border-amber-500 text-white h-16 resize-none"
                      id="ledger_desc"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs py-2.5 rounded-lg uppercase tracking-wider transition cursor-pointer"
                  >
                    Post Transaction
                  </button>
                </form>
              </div>

              {/* TRANSACTIONS HISTORICAL LEDGER LIST */}
              <div className="lg:col-span-2 bg-[#121926] border border-[#202c3f] rounded-2xl p-5 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" /> Bookkeeping Statement Ledger
                  </h3>
                  <div className="text-xs text-gray-400">
                    Latest <span className="text-white font-bold">{transactions.length}</span> entries
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-400">
                    <thead className="text-[10px] uppercase font-bold text-gray-500 border-b border-[#202c3f]">
                      <tr>
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Category</th>
                        <th className="pb-2">Description</th>
                        <th className="pb-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c283a]">
                      {transactions.map((trans) => (
                        <tr key={trans.id} className="hover:bg-[#1a2333]/30">
                          <td className="py-3 font-semibold text-gray-300">{trans.date}</td>
                          <td className="py-3">
                            <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                              trans.type === "income" 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}>
                              {trans.category}
                            </span>
                          </td>
                          <td className="py-3 text-gray-300 italic">{trans.description || "N/A"}</td>
                          <td className={`py-3 text-right font-bold ${trans.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {trans.type === "income" ? "+" : "-"}${trans.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}

                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-gray-600">
                            No accounting records exist in this statement ledger. Please log entries.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MENU CATALOG EDITOR */}
          {activeTab === "menu" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* ADD NEW MENU ITEM FORM */}
              <div className="lg:col-span-1 bg-[#121926] border border-[#202c3f] rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-500" /> Build New Menu Item
                </h3>

                <form onSubmit={handleSubmitMenuItem} className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5" htmlFor="item_name">Dish Name</label>
                    <input
                      type="text"
                      required
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g. Lobster Bisque Supreme"
                      className="w-full bg-[#1b2536] border border-[#2e3b4e] rounded-lg px-3 py-2 text-xs focus:ring-amber-500 focus:border-amber-500 text-white"
                      id="item_name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5" htmlFor="item_price">Price ($ USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value)}
                        placeholder="22.50"
                        className="w-full bg-[#1b2536] border border-[#2e3b4e] rounded-lg px-3 py-2 text-xs focus:ring-amber-500 focus:border-amber-500 text-white"
                        id="item_price"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5" htmlFor="item_category_select">Category</label>
                      <select
                        value={itemCategory}
                        onChange={(e) => setItemCategory(e.target.value)}
                        className="w-full bg-[#1b2536] border border-[#2e3b4e] rounded-lg px-3 py-2 text-xs focus:ring-amber-500 focus:border-amber-500 text-white"
                        id="item_category_select"
                      >
                        <option>Starters</option>
                        <option>Mains</option>
                        <option>Desserts</option>
                        <option>Beverages</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5" htmlFor="item_img">Image URL</label>
                    <input
                      type="url"
                      value={itemImg}
                      onChange={(e) => setItemImg(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full bg-[#1b2536] border border-[#2e3b4e] rounded-lg px-3 py-2 text-xs focus:ring-amber-500 focus:border-amber-500 text-white"
                      id="item_img"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5" htmlFor="item_desc">Description Recipe</label>
                    <textarea
                      required
                      value={itemDesc}
                      onChange={(e) => setItemDesc(e.target.value)}
                      placeholder="Chef's choice, fresh organic ingredients..."
                      className="w-full bg-[#1b2536] border border-[#2e3b4e] rounded-lg px-3 py-2 text-xs focus:ring-amber-500 focus:border-amber-500 text-white h-20 resize-none"
                      id="item_desc"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs py-2.5 rounded-lg uppercase tracking-wider transition cursor-pointer"
                  >
                    Save Dish to Catalog
                  </button>
                </form>
              </div>

              {/* ACTIVE MENU ITEMS CATALOG */}
              <div className="lg:col-span-2 bg-[#121926] border border-[#202c3f] rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-amber-500" /> Active Menu Catalog ({menuItems.length} items)
                </h3>

                <div className="space-y-4">
                  {menuItems.map((item) => (
                    <div key={item.id} className="bg-[#1a2333]/40 border border-[#1c283a] p-3 rounded-2xl flex items-center justify-between gap-4 transition-all duration-300 hover:bg-[#1f2a3d]/60 hover:border-amber-500/30">
                      <div className="flex items-center gap-3">
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-11 h-11 object-cover rounded-2xl bg-[#202c3f] border-2 animate-border-glow transition-transform duration-300 hover:scale-110 hover:rotate-2 shadow-lg"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-white text-xs tracking-wide">{item.name}</h4>
                            <span className="text-[8px] bg-[#222e3e] text-amber-500 font-extrabold uppercase px-1.5 py-0.5 rounded-full border border-amber-500/20">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5 max-w-xs md:max-w-md">{item.description}</p>
                          <span className="text-[11px] text-amber-400 font-extrabold">${item.price.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Availability Toggles & Delete */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleItemAvailability(item)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition cursor-pointer"
                          title="Toggle availability"
                        >
                          {item.available ? (
                            <ToggleRight className="w-8 h-8 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-gray-600" />
                          )}
                          <span className="text-[10px] uppercase font-bold hidden sm:inline-block">
                            {item.available ? "Live" : "Sold Out"}
                          </span>
                        </button>

                        <button
                          onClick={() => handleDeleteMenuItem(item.id)}
                          className="p-2 bg-[#2a1318]/40 border border-rose-500/10 hover:bg-rose-950 text-rose-500 rounded-lg transition cursor-pointer"
                          title="Remove Dish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {menuItems.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-xs">
                      No gourmet menu catalog dishes loaded. Add dishes using the form.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
