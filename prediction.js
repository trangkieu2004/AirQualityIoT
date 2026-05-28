import { db } from "./firebase_config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

export function listenPrediction() {

  const dbRef = ref(db, "prediction");

  onValue(dbRef, (snapshot) => {

    if (!snapshot.exists()) return;

    const data = snapshot.val();

    renderPredictionCards(data);
    renderPredictionAdvice(data);
  });
}

function renderPredictionCards(data) {

  // ===== PM2.5 =====
  const pmCard = document.querySelectorAll(".ai-card")[0];

  if (pmCard) {

    const change = Number(data.pm25_change || 0);

    pmCard.querySelector("h2").innerText =
      `${Number(data.pm25 || 0).toFixed(1)} µg/m³`;

    pmCard.querySelector("p").innerText =
      getTrendText(
        data.pm25_trend,
        change,
        " µg/m³"
      );
  }

  // ===== TEMP =====
  const tempCard = document.querySelectorAll(".ai-card")[1];

  if (tempCard) {

    const change = Number(data.temp_change || 0);

    tempCard.querySelector("h2").innerText =
      `${Number(data.temp || 0).toFixed(1)}°C`;

    tempCard.querySelector("p").innerText =
      `${getTrendText(data.temp_trend, change, "°C")}`;
  }

  // ===== HUMI =====
  const humiCard = document.querySelectorAll(".ai-card")[2];

  if (humiCard) {

    const change = Number(data.humi_change || 0);

    humiCard.querySelector("h2").innerText =
      `${Number(data.humi || 0).toFixed(1)}%`;

    humiCard.querySelector("p").innerText =
      `${getTrendText(data.humi_trend, change, "%")}`;
  }
}


// ================= HELPERS =================
function getTrendIcon(trend) {

  if (trend === "tăng") return "↑";
  if (trend === "giảm") return "↓";

  return "•";
}

function getTrendText(trend, change, unit = "") {

  const value = Math.abs(change).toFixed(1);

  if (trend === "tăng") {
    return `↑ ${value}${unit} tăng`;
  }

  if (trend === "giảm") {
    return `↓ ${value}${unit} giảm`;
  }

  return "• Ổn định";
}

function renderPredictionAdvice(data) {

  const adviceEl = document.querySelector(".ai-text p");

  if (!adviceEl) return;

  adviceEl.innerText =
    data.advice ||
    "Không có dữ liệu phân tích AI.";
}