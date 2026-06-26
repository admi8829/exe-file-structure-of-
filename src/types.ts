export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  imageUrl: string;
  available: boolean;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  tableNumber: string;
  items: OrderItem[];
  totalAmount: number;
  status: "pending" | "completed" | "cancelled";
  createdAt: any; // Firestore Timestamp or string
}

export interface Alert {
  id: string;
  tableNumber: string;
  type: "waiter" | "bill";
  status: "pending" | "resolved";
  createdAt: any; // Firestore Timestamp or string
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  date: string;
  createdAt: any; // Firestore Timestamp or string
}
