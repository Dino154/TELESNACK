// Importamos las funciones necesarias de Firebase desde la nube (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    doc, 
    query, 
    where,
    runTransaction,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Tu configuración real (Keys proporcionadas)
const firebaseConfig = {
  apiKey: "AIzaSyDXAtl2s2eJDe9BLnHti56CZGWqPCj4lyo",
  authDomain: "telesnack-store.firebaseapp.com",
  projectId: "telesnack-store",
  storageBucket: "telesnack-store.firebasestorage.app",
  messagingSenderId: "965354653079",
  appId: "1:965354653079:web:659cd045f2002d8fd270d2"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exportar herramientas para usarlas en el DataService
export { db, collection, getDocs, addDoc, updateDoc, doc, query, where, runTransaction, orderBy };