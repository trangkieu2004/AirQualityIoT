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

    const percent = Number(data.pm25_percent || 0);

    pmCard.querySelector("h2").innerText =
      `${Number(data.pm25 || 0).toFixed(1)} µg/m³`;

    pmCard.querySelector("p").innerText =
      `${getTrendIcon(data.pm25_trend)} ${Math.abs(percent).toFixed(1)}% so với hiện tại`;
  }

  // ===== TEMP =====
  const tempCard = document.querySelectorAll(".ai-card")[1];

  if (tempCard) {

    const percent = Number(data.temp_percent || 0);

    tempCard.querySelector("h2").innerText =
      `${Number(data.temp || 0).toFixed(1)}°C`;

    tempCard.querySelector("p").innerText =
      `${getTrendText(data.temp_trend, percent)}`;
  }

  // ===== HUMI =====
  const humiCard = document.querySelectorAll(".ai-card")[2];

  if (humiCard) {

    const percent = Number(data.humi_percent || 0);

    humiCard.querySelector("h2").innerText =
      `${Number(data.humi || 0).toFixed(1)}%`;

    humiCard.querySelector("p").innerText =
      `${getTrendText(data.humi_trend, percent)}`;
  }
}


// ================= HELPERS =================
function getTrendIcon(trend) {

  if (trend === "tăng") return "↑";
  if (trend === "giảm") return "↓";

  return "•";
}

function getTrendText(trend, percent) {

  if (trend === "tăng") {
    return `↑ ${Math.abs(percent).toFixed(1)}% tăng nhẹ`;
  }

  if (trend === "giảm") {
    return `↓ ${Math.abs(percent).toFixed(1)}% giảm nhẹ`;
  }

  return "Ổn định";
}

function renderPredictionAdvice(data) {

  const adviceEl = document.querySelector(".ai-text p");

  if (!adviceEl) return;

  adviceEl.innerText =
    data.advice ||
    "Không có dữ liệu phân tích AI.";
}