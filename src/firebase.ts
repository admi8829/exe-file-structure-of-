import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

// Config matches firebase-applet-config.json generated for this workspace
const firebaseConfig = {
  projectId: "gen-lang-client-0384139661",
  appId: "1:223314131763:web:0541b6f0ad1e44d630dc46",
  apiKey: "AIzaSyCbmLFGVOgaJNXX2itwDRrvFhkJO_O2w2c",
  authDomain: "gen-lang-client-0384139661.firebaseapp.com",
  storageBucket: "gen-lang-client-0384139661.firebasestorage.app",
  messagingSenderId: "223314131763"
};

const databaseId = "ai-studio-hotelsynchms-a78e93f3-b1ad-4cb7-aab7-cb35ec99d5a4";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID from the provisioned project
const db = getFirestore(app, databaseId);

// Test connectivity
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Successfully connected to Firestore database:", databaseId);
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration or network status.");
    } else {
      console.log("Firestore ping resolved (offline or collection doesn't exist yet, which is normal).");
    }
  }
}

testConnection();

export { db };
