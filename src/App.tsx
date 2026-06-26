import { useEffect } from "react";
import AdminDashboard from "./components/AdminDashboard";
import { seedMenuItemsIfEmpty } from "./seed";

export default function App() {
  useEffect(() => {
    // Run database automatic seeder
    seedMenuItemsIfEmpty();
  }, []);

  return (
    <div className="relative min-h-screen">
      <AdminDashboard />
    </div>
  );
}

