import { db } from "./firebase_config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

export let history = [];

/* ================= REALTIME CURRENT ================= */
export function listenCurrent(callback) {
  const dbRef = ref(db, "current");

  onValue(dbRef, (snapshot) => {

    // 🔥 CHƯA CÓ DATA → vẫn render UI
    if (!snapshot.exists()) {
      callback({
        pm25: null,
        temp: null,
        humi: null,
        gas: null,
        status: 0,
        alert: "OK",
        time: "--"
      });
      return;
    }

    const d = snapshot.val();

    const current = {
      time: d.time,
      pm25: Number(d.pm25),
      temp: Number(d.temp),
      humi: Number(d.humi),
      gas: Number(d.gas),
      wifi: Number(d.wifi),
      status: Number(d.status),
      alert: d.alert || "OK"
    };

    callback(current);
  });
}

/* ================= HISTORY ================= */
export function listenHistory(callback) {
  const dbRef = ref(db, "history");

  onValue(dbRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const dataObj = snapshot.val();

    let tempHistory = Object.keys(dataObj).map(key => {
      const item = dataObj[key];
      return {
        id: key,
        time: normalizeTime(item.time),
        pm25: toNumber(item.pm25),
        temp: toNumber(item.temp),
        humi: toNumber(item.humi),
        gas: toNumber(item.gas),
        status: toNumber(item.status),
        alert: item.alert || "OK"
      };
    });

    // 🔥 SỬA TẠI ĐÂY: Sắp xếp CŨ đến MỚI (để biểu đồ vẽ đúng chiều thời gian)
    tempHistory.sort((a, b) => {
      return parseTime(a.time) - parseTime(b.time); 
    });

    history = tempHistory;
    callback(history);
  });
}
/* ================= FORECAST ================= */
export function listenForecast(callback) {
  const dbRef = ref(db, "forecast");

  onValue(dbRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.val();
    const forecast = Object.values(data);

    callback(forecast);
  });
}
/* ================= THRESHOLD ================= */
export function listenThreshold(callback) {
  const dbRef = ref(db, "threshold");

  onValue(dbRef, (snapshot) => {

    if (!snapshot.exists()) {
      callback(null); // 🔥 gửi null về UI
      return;
    }

    callback(snapshot.val());
  });
}
function toNumber(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

// 🔥 FIX LỖI time.split
function normalizeTime(t) {
  if (!t) return "--";

  // 🔥 nếu là string chuẩn "YYYY-MM-DD HH:mm:ss"
  if (typeof t === "string") return t;

  // 🔥 nếu là timestamp → convert về LOCAL TIME (không dùng toISOString nữa)
  if (typeof t === "number") {
    const d = new Date(t);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  }

  return "--";
}

function parseTime(t) {
  if (!t || t === "--") return 0;
  
  // Thử parse trực tiếp chuỗi "YYYY-MM-DD HH:mm:ss"
  // Thay "-" thành "/" để tương thích tốt nhất trên mọi trình duyệt
  const dt = new Date(t.replace(/-/g, "/"));
  const timestamp = dt.getTime();

  return isNaN(timestamp) ? 0 : timestamp;
}