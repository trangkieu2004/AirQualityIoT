import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, set, onValue, get, remove, update, push } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCf_ykkhmch-ojTcSq-AmaXMpQDY2TnV0I",
  authDomain: "aiquantrackhongkhi.firebaseapp.com",
  databaseURL: "https://aiquantrackhongkhi-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aiquantrackhongkhi",
  storageBucket: "aiquantrackhongkhi.firebasestorage.app",
  messagingSenderId: "955192303414",
  appId: "1:955192303414:web:2e1e5d3971235855661d97",
  measurementId: "G-20NR7MEHKE"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export {db, ref, set, onValue, get, remove, update, push};

export function listenThreshold(callback) {
  const thRef = ref(db, "threshold");

  onValue(thRef, (snapshot) => {
    callback(snapshot.val());
  });
}