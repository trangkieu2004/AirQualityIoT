import { db } from "./firebase_config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// ================= AQI CLASS =================
function getAQIClass(aqi) {

  if (aqi === "--" || aqi == null)
    return "aqi-good";

  // Tốt - Xanh
  if (aqi <= 50)
    return "aqi-good";

  // Trung bình - Vàng
  if (aqi <= 100)
    return "aqi-medium";

  // Kém - Cam
  if (aqi <= 150)
    return "aqi-bad";

  // Xấu - Đỏ
  if (aqi <= 200)
    return "aqi-verybad";

  // Rất xấu - Tím
  if (aqi <= 300)
    return "aqi-danger";

  // Nguy hại - Nâu
  return "aqi-hazard";
}

// ================= INIT AI =================
export function initAI() {

  const aiRef = ref(db, "forecast");

  onValue(aiRef, (snapshot) => {

    const raw = snapshot.val();

    const data = Object.values(raw || {});

    const container =
      document.getElementById("forecast-list");

    const analysisEl =
      document.getElementById("analysis-text");

    // ================= NO DATA =================
    if (!data || data.length === 0) {

      renderEmpty(container, analysisEl);

      return;
    }

    // ================= 12 HOURS =================
    const forecastData = data
      .slice(0, 12)
      .map(item => {

        return {

          time: new Date(item.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          }),

          // ================= PM2.5 =================
          pm25: Number(item.pm25 || 0),

          // ================= VN_AQI =================
          aqi: Number(item.vn_aqi || 0),

          // ================= NOWCAST =================
          nowcast: Number(item.nowcast_pm25 || 0),

          // ================= WEATHER =================
          temp: Number(item.temp || 0),
          humi: Number(item.humi || 0)
        };
      });

    // ================= RENDER =================
    renderForecast(container, forecastData);

    renderAnalysis(analysisEl, forecastData);
  });
}

// ================= EMPTY STATE =================
function renderEmpty(container, analysisEl) {

  if (container) {

    let html = "";

    for (let i = 0; i < 12; i++) {

      html += `
        <div class="forecast-item">
          <div>--:--</div>
          <div class="aqi-box">--</div>
          <div class="forecast-value">PM: --</div>
          <div class="forecast-value">--°C</div>
          <div class="forecast-value">--%</div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  if (analysisEl) {

    analysisEl.innerText =
      "Chưa có dữ liệu dự báo AI 12 giờ tới...";
  }
}

// ================= RENDER FORECAST =================
function renderForecast(container, data) {

  if (!container) return;

  let html = "";

  data.forEach(item => {

    const aqiClass = getAQIClass(item.aqi);

    html += `
      <div class="forecast-item">

        <div>${item.time}</div>

        <div class="aqi-box ${aqiClass}">
          ${item.aqi}
        </div>

        <div class="forecast-value">
          PM: ${item.pm25}
        </div>

        <div class="forecast-value">
          ${item.temp}°C
        </div>

        <div class="forecast-value">
          ${item.humi}%
        </div>

      </div>
    `;
  });

  container.innerHTML = html;
}

// ================= AI ANALYSIS =================
function renderAnalysis(el, data) {

  if (!el || !data || data.length < 2) {

    if (el) {

      el.innerText =
        "Chưa đủ dữ liệu để phân tích AI.";
    }

    return;
  }

  const valid = data.slice(0, 12);

  // ================= METRICS =================
  const maxAQI =
    Math.max(...valid.map(d => d.aqi));

  const maxItem =
    valid.find(d => d.aqi === maxAQI);

  const maxHumi =
    Math.max(...valid.map(d => d.humi));

  const avgPM25 =
    (
      valid.reduce((sum, d) => sum + d.pm25, 0)
      / valid.length
    ).toFixed(1);

  // ================= TREND =================
  const start = valid[0].aqi;

  const end =
    valid[valid.length - 1].aqi;

  const trend = end - start;

  let trendText = "";

  if (trend > 20) {

    trendText =
      "có xu hướng xấu dần";

  }
  else if (trend < -20) {

    trendText =
      "đang cải thiện";

  }
  else {

    trendText =
      "tương đối ổn định";
  }

  // ================= AQI ANALYSIS =================
  let aqiText = "";

  if (maxAQI <= 50) {

    aqiText =
      `Chất lượng không khí tốt (VN_AQI ${maxAQI}).`;

  }
  else if (maxAQI <= 100) {

    aqiText =
      `Chất lượng không khí ở mức trung bình (VN_AQI ${maxAQI}).`;

  }
  else if (maxAQI <= 150) {

    aqiText =
      `Không khí ở mức kém (VN_AQI ${maxAQI}).`;

  }
  else if (maxAQI <= 200) {

    aqiText =
      `Không khí ở mức xấu (VN_AQI ${maxAQI}).`;

  }
  else if (maxAQI <= 300) {

    aqiText =
      `Không khí rất xấu (VN_AQI ${maxAQI}).`;

  }
  else {

    aqiText =
      `Không khí nguy hại (VN_AQI ${maxAQI}).`;
  }

  // ================= HUMIDITY =================
  let humiText = "";

  if (maxHumi > 80) {

    humiText =
      " Độ ẩm cao có thể gây cảm giác oi bức và khó chịu.";
  }

  // ================= PEAK TIME =================
  let peakText = "";

  if (maxItem) {

    peakText =
      ` Mức ô nhiễm cao nhất dự kiến vào khoảng ${maxItem.time}.`;
  }

  // ================= HEALTH ADVICE =================
  let adviceText = "";

  if (maxAQI > 150) {

    adviceText =
      " Khuyến nghị hạn chế hoạt động ngoài trời và nên đeo khẩu trang chống bụi mịn.";

  }
  else if (maxAQI > 100) {

    adviceText =
      " Nhóm nhạy cảm nên hạn chế vận động mạnh ngoài trời.";

  }
  else {

    adviceText =
      " Điều kiện không khí tương đối an toàn cho sinh hoạt.";
  }

  // ================= FINAL TEXT =================
  let text =
    `AI dự báo 12 giờ tới: Không khí ${trendText}. `
    + `${aqiText} `
    + `PM2.5 trung bình khoảng ${avgPM25} µg/m³.`
    + peakText
    + humiText
    + adviceText;

  el.innerText = text;
}
