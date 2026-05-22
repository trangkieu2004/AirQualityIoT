import { db } from "./firebase_config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// ================= PM2.5 -> AQI =================
function pm25ToAQI(pm25) {
  if (pm25 <= 12) {
    return calcAQI(pm25, 0, 12, 0, 50);
  }
  else if (pm25 <= 35.4) {
    return calcAQI(pm25, 12.1, 35.4, 51, 100);
  }
  else if (pm25 <= 55.4) {
    return calcAQI(pm25, 35.5, 55.4, 101, 150);
  }
  else if (pm25 <= 150.4) {
    return calcAQI(pm25, 55.5, 150.4, 151, 200);
  }
  else if (pm25 <= 250.4) {
    return calcAQI(pm25, 150.5, 250.4, 201, 300);
  }
  else {
    return 300;
  }
}
// ================= AQI FORMULA =================
function calcAQI(Cp, Clow, Chigh, Ilow, Ihigh) {

  return Math.round(
    ((Ihigh - Ilow) / (Chigh - Clow)) *
    (Cp - Clow) +
    Ilow
  );
}

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

    const container = document.getElementById("forecast-list");
    const analysisEl = document.getElementById("analysis-text");

    // ================= NO DATA =================
    if (!data || data.length === 0) {
      renderEmpty(container, analysisEl);
      return;
    }

    // ================= 12 HOURS =================
    const forecastData = data
      .slice(0, 12)
      .map(item => {

        const pm25 = Number(item.pm25 || 0);

        return {

          time: new Date(item.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          }),

          pm25: pm25,
          aqi: pm25ToAQI(pm25),
          temp: item.temp,
          humi: item.humi
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
    analysisEl.innerText = "Chưa có dữ liệu dự báo AI 12 giờ tới...";
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
        <div class="aqi-box ${aqiClass}">${item.aqi}</div>
        <div class="forecast-value">PM: ${item.pm25}</div>
        <div class="forecast-value">${item.temp}°C</div>
        <div class="forecast-value">${item.humi}%</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ================= AI ANALYSIS =================
function renderAnalysis(el, data) {
  if (!el || !data || data.length < 2) {
    if (el) el.innerText = "Chưa đủ dữ liệu để phân tích AI.";
    return;
  }

  const valid = data.slice(0, 12);

  // ================= METRICS =================
  const maxAQI = Math.max(...valid.map(d => d.aqi));
  const maxItem = valid.find(d => d.aqi === maxAQI);
  const maxHumi = Math.max(...valid.map(d => d.humi));

  // ================= TREND =================
  const start = valid[0].aqi;
  const end = valid[valid.length - 1].aqi;
  const trend = end - start;
  let trendText = "";
  if (trend > 20) {
    trendText = "có xu hướng xấu dần";
  } else if (trend < -20) {
    trendText = "đang cải thiện";
  } else {
    trendText = "tương đối ổn định";
  }

  // ================= AQI ANALYSIS =================
  let aqiText = "";

  if (maxAQI <= 50) {

    aqiText =
      `Chất lượng không khí tốt (AQI ${maxAQI}).`;

  }
  else if (maxAQI <= 100) {

    aqiText =
      `Chất lượng không khí ở mức trung bình (AQI ${maxAQI}).`;

  }
  else if (maxAQI <= 150) {

    aqiText =
      `Không khí ở mức kém (AQI ${maxAQI}).`;

  }
  else if (maxAQI <= 200) {

    aqiText =
      `Không khí ở mức xấu (AQI ${maxAQI}).`;

  }
  else if (maxAQI <= 300) {

    aqiText =
      `Không khí rất xấu (AQI ${maxAQI}).`;

  }
  else {

    aqiText =
      `Không khí nguy hại (AQI ${maxAQI}).`;
  }

  // ================= HUMIDITY =================
  let humiText = "";

  if (maxHumi > 80) {

    humiText =
      `Độ ẩm cao có thể gây khó chịu.`;
  }

  // ================= TIME CONTEXT =================
  const lastHour = parseInt(valid[valid.length - 1].time.split(":")[0]);

  let timeText = "";
  if (lastHour >= 18) {
    timeText = "Buổi tối có xu hướng ô nhiễm tăng nhẹ.";
  } else if (lastHour <= 6) {
    timeText = "Buổi sáng không khí ổn định.";
  }

  // ================= FINAL TEXT =================
  let text =
    `AI dự báo 12 giờ tới: Không khí ${trendText}. ${aqiText}`;

  if (humiText) {

    text += " " + humiText;
  }

  if (maxAQI > 150) {

    text +=
      " Khuyến nghị hạn chế hoạt động ngoài trời.";
  }

  el.innerText = text;
}