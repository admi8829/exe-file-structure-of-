import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import { MenuItem } from "./types";

const SEED_ITEMS = [
  {
    name: "Truffle Parmesan Fries",
    price: 14,
    category: "Starters",
    description: "Golden crispy fries tossed in white truffle oil, grated aged parmesan, and fresh chopped parsley. Served with house-made roasted garlic aioli.",
    imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=600",
    available: true
  },
  {
    name: "Pan-Seared Atlantic Salmon",
    price: 34,
    category: "Mains",
    description: "Crispy-skin salmon fillet served over a bed of roasted lemon-herb asparagus and saffron-infused wild rice, drizzled with standard citrus dill butter.",
    imageUrl: "https://images.unsplash.com/photo-1485962398705-ef6a13c41e8f?auto=format&fit=crop&q=80&w=600",
    available: true
  },
  {
    name: "Signature Wagyu Burger",
    price: 28,
    category: "Mains",
    description: "Premium double-wagyu beef patty, melted Swiss Gruyère, caramelized sweet onions, wild arugula, and black truffle spread on a toasted brioche bun.",
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=600",
    available: true
  },
  {
    name: "Classic Espresso Tiramisu",
    price: 12,
    category: "Desserts",
    description: "Espresso-soaked Italian ladyfingers layered with velvety whipped mascarpone cream, finished with a heavy dusting of premium dark cocoa powder.",
    imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&q=80&w=600",
    available: true
  },
  {
    name: "Lavender Rosemary Gin Tonic",
    price: 16,
    category: "Beverages",
    description: "Small-batch dry gin, lavender-infused botanical syrup, fresh-squeezed lime juice, and premium tonic water, garnished with a bruised rosemary sprig.",
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600",
    available: true
  },
  {
    name: "Emerald Cucumber Mint Tea",
    price: 8,
    category: "Beverages",
    description: "Brewed organic Japanese sencha green tea, cold-pressed cucumber elixir, fresh garden mint, and a delicate touch of raw wildflower honey.",
    imageUrl: "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&q=80&w=600",
    available: true
  }
];

export async function seedMenuItemsIfEmpty() {
  try {
    const menuCol = collection(db, "menu_items");
    const snapshot = await getDocs(menuCol);
    
    if (snapshot.empty) {
      console.log("Menu collection is empty. Seeding initial gourmet items...");
      for (const item of SEED_ITEMS) {
        await addDoc(menuCol, item);
      }
      console.log("Successfully seeded", SEED_ITEMS.length, "gourmet items.");
    } else {
      console.log("Menu already contains", snapshot.size, "items. Skipping seed.");
    }
  } catch (error) {
    console.error("Failed to seed initial menu items:", error);
  }
}
