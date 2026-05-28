export let currentHistoryData = []; // Lưu trữ dữ liệu gốc sau khi đã sort
let currentPage = 1;
const rowsPerPage = 10; // Số dòng mỗi trang

export function createCard(title, value, unit, max, iconClass, iconBg,baseColor) {
  const isValid = typeof value === "number";
  const displayValue = isValid ? value : "--";
  const safeValue = isValid ? value : 0;
  let percent = Math.min((safeValue / max) * 100, 100);

  let level = "--";
  let color = baseColor;

  if (isValid) {
    if (percent >= 100) { level = "Vượt ngưỡng"; color = "#ef4444"; }
    else if (percent >= 80) { level = "Cảnh báo"; color = "#f97316"; }
    else if (percent > 50) { level = "Trung bình"; color = "#facc15"; }
    else { level = "Tốt"; color = baseColor; }
  }

  // CHỈ TRẢ VỀ RUỘT, KHÔNG TRẢ VỀ THẺ BAO NGOÀI
  return `
    <div class="aq-top">
      <div>
        <div class="aq-title">${title}</div>
        <div class="aq-value">${displayValue} <span>${unit}</span></div>
      </div>
      <div class="aq-icon ${iconBg}">
        <i class="${iconClass}"></i>
      </div>
    </div>

    <div class="aq-bar">
      <div class="aq-fill" style="width:${percent}%"></div>
    </div>

    <div class="aq-footer">
      <span class="aq-level">${level}</span>
      <span>Max: ${max}</span>
    </div>
  `;
}

/* ================= AQI ================= */

function calculateAQI(pm25) {

  if (pm25 == null || isNaN(pm25)) {
    return 0;
  }

  const breakpoints = [
    { bpLow: 0,   bpHigh: 25,  iLow: 0,   iHigh: 50 },
    { bpLow: 25,  bpHigh: 50,  iLow: 51,  iHigh: 100 },
    { bpLow: 50,  bpHigh: 80,  iLow: 101, iHigh: 150 },
    { bpLow: 80,  bpHigh: 150, iLow: 151, iHigh: 200 },
    { bpLow: 150, bpHigh: 250, iLow: 201, iHigh: 300 },
    { bpLow: 250, bpHigh: 500, iLow: 301, iHigh: 500 }
  ];

  for (const bp of breakpoints) {

    if (pm25 <= bp.bpHigh) {

      const aqi =
        ((bp.iHigh - bp.iLow) /
        (bp.bpHigh - bp.bpLow)) *
        (pm25 - bp.bpLow) +
        bp.iLow;

      return Math.round(aqi);
    }
  }

  return 500;
}
export function calculateNowCast(history) {

  if (!history || history.length === 0) return null;

  const values = history
    .slice(0, 12)
    .map(v => Number(v))
    .filter(v => !isNaN(v));

  if (values.length === 0) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);

  let w = min / max;

  if (w < 0.5) w = 0.5;

  let numerator = 0;
  let denominator = 0;

  values.forEach((c, i) => {

    const weight = Math.pow(w, i);

    numerator += c * weight;
    denominator += weight;

  });

  return +(numerator / denominator).toFixed(1);
}

function getAQIInfo(aqi) {
  if (aqi >= 0 && aqi <= 50) {
    return { 
      level: "Tốt",
      color: "rgb(0,228,0)", // Xanh
      icon: "fa-face-smile",
      mainAdvice: "Hiện tại không có cảnh báo nguy hiểm.",
      subAdvice: "Chất lượng không khí tốt, có thể sinh hoạt và hoạt động ngoài trời bình thường."
    };
  } else if (aqi <= 100) {
    return { 
      level: "Trung bình",
      color: "rgb(255,255,0)", // Vàng
      icon: "fa-face-meh",
      mainAdvice: "Chất lượng không khí ở mức chấp nhận được.",
      subAdvice: "Nhóm nhạy cảm nên hạn chế vận động mạnh ngoài trời."
    };
  } else if (aqi <= 150) {
    return { 
      level: "Kém",
      color: "rgb(255,126,0)", // Da cam
      icon: "fa-face-frown",
      mainAdvice: "Bắt đầu ảnh hưởng đến nhóm nhạy cảm.",
      subAdvice: "Người già, trẻ em nên hạn chế ra ngoài và đeo khẩu trang."
    };
  } else if (aqi <= 200) {
    return { 
      level: "Xấu",
      color: "rgb(255,0,0)", // Đỏ
      icon: "fa-face-frown-open",
      mainAdvice: "Chất lượng không khí xấu, ảnh hưởng đến sức khỏe.",
      subAdvice: "Mọi người nên hạn chế ra ngoài và đeo khẩu trang chống bụi mịn."
    };
  } else if (aqi <= 300) {
    return { 
      level: "Rất xấu",
      color: "rgb(143,63,151)", // Tím
      icon: "fa-face-mask",
      mainAdvice: "Cảnh báo sức khỏe nghiêm trọng.",
      subAdvice: "Hạn chế tối đa ra ngoài, sử dụng máy lọc không khí."
    };
  } else if (aqi <= 500) {
    return { 
      level: "Nguy hại",
      color: "rgb(126,0,35)", // Nâu
      icon: "fa-skull-crossbones",
      mainAdvice: "Nguy hiểm cực độ.",
      subAdvice: "Tuyệt đối không ra ngoài, tránh tiếp xúc với không khí ô nhiễm."
    };
  } else {
    return {
      level: "Ngoài phạm vi",
      color: "#000",
      icon: "fa-triangle-exclamation",
      mainAdvice: "Giá trị AQI không hợp lệ.",
      subAdvice: ""
    };
  }
}

export function renderAQI(pm25) {
  const el = document.getElementById("aqi");
  const mainAdviceEl = document.getElementById("health-advice-main");
  const subAdviceEl = document.getElementById("health-advice-sub");
  const adviceHeader = document.querySelector(".advice-header");

  // 1. Xử lý khi không có dữ liệu
  if (pm25 === null || pm25 === undefined) {
    el.innerHTML = `
      <div class="aqi-card aqi-na">
        <div class="aqi-glow"></div>
        <div class="aqi-icon"><i class="fa-solid fa-circle-question"></i></div>
        <div class="aqi-content">
          <div class="aqi-value-na">--</div>
          <div class="aqi-label">Mất kết nối cảm biến</div>
        </div>
      </div>`;
    if (mainAdviceEl) mainAdviceEl.innerText = "Không có dữ liệu";
    if (subAdviceEl) subAdviceEl.innerText = "Vui lòng kiểm tra lại thiết bị truyền tin.";
    return;
  }

  // 2. Tính toán AQI và lấy thông tin hiển thị
  const aqi = calculateAQI(pm25);
  const info = getAQIInfo(aqi);

  // 3. Tính toán % độ dài thanh Progress để khớp với các nhãn (Scale)
  // Mỗi mốc (Tốt, TB, Kém, Xấu, Rất xấu, Nguy hại) chiếm 16.6% thanh đo
  let progressWidth = 0;
  if (aqi <= 50) progressWidth = (aqi / 50) * 16.6;
  else if (aqi <= 100) progressWidth = 16.6 + ((aqi - 50) / 50) * 16.6;
  else if (aqi <= 150) progressWidth = 33.2 + ((aqi - 100) / 50) * 16.6;
  else if (aqi <= 200) progressWidth = 49.8 + ((aqi - 150) / 50) * 16.6;
  else if (aqi <= 300) progressWidth = 66.4 + ((aqi - 200) / 100) * 16.6;
  else progressWidth = 83 + ((aqi - 300) / 200) * 17;

  // 4. Đổ dữ liệu vào Card AQI (Bên trái)
  el.innerHTML = `
  <div class="aqi-card" style="--c: ${info.color}; height: 100%; margin-bottom: 0;">
    <div class="aqi-glow" style="background: radial-gradient(circle at top left, ${info.color}33, transparent)"></div>
    
    <div class="aqi-top">
      <div class="aqi-left">
        <div class="aqi-icon" style="background: ${info.color}22; box-shadow: 0 0 15px ${info.color}44"> 
          <i class="fa-solid ${info.icon}" style="color: ${info.color}"></i>
        </div>
        <div class="aqi-text">
          <div class="aqi-title" style="color: ${info.color}">${info.level}</div>
          <div class="aqi-subtitle">CHỈ SỐ CHẤT LƯỢNG KHÔNG KHÍ</div>
        </div>
      </div>
      <div class="aqi-badge">VN AQI • NOWCAST</div>
    </div>

    <div class="aqi-main">
      <div class="aqi-value">${aqi}</div>
      <div class="aqi-unit">AQI</div>
    </div>

    <div class="aqi-progress">
      <div class="aqi-progress-track">
        <div class="aqi-progress-fill" style="width: ${Math.min(progressWidth, 100)}%; background: ${info.color}; box-shadow: 0 0 10px ${info.color}"></div>
      </div>
      <div class="aqi-scale">
        <span>Tốt</span>
        <span>TB</span>
        <span>Kém</span>
        <span>Xấu</span>
        <span>Rất xấu</span>
        <span>Nguy hại</span>
      </div>
    </div>
  </div>`;

  // 5. Cập nhật phần Cảnh báo & Khuyến nghị (Bên phải - image_571946.png)
  if (mainAdviceEl && subAdviceEl) {
    mainAdviceEl.innerText = info.mainAdvice;
    subAdviceEl.innerText = info.subAdvice;
    
    // Cập nhật màu sắc tiêu đề và icon khiên đồng bộ với mức độ AQI
    if (adviceHeader) {
      adviceHeader.style.color = info.color;
      adviceHeader.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>Cảnh báo & Khuyến nghị sức khỏe</span>`;
    }

    // Nếu bạn có element chứa cái khiên (shield)
    const shieldIcon = document.querySelector(".shield-bg");
    const shieldGlow = document.querySelector(".shield-glow");
    if (shieldIcon) shieldIcon.style.color = info.color;
    if (shieldGlow) shieldGlow.style.background = info.color;
  }
}

/* ================= RENDER ================= */

export function renderCards(d, th) {
  const sensors = [
    { id: "card-pm25", title: "PM2.5", val: d.pm25, unit: "µg/m³", max: th?.pm25 ?? 100, icon: "fa-solid fa-smog", bg: "icon-pm25", color: "#facc15" },
    { id: "card-temp", title: "Nhiệt độ", val: d.temp, unit: "°C", max: th?.temp ?? 50, icon: "fa-solid fa-temperature-high", bg: "icon-temp", color: "#ef4444" },
    { id: "card-humi", title: "Độ ẩm", val: d.humi, unit: "%", max: th?.humi ?? 100, icon: "fa-solid fa-droplet", bg: "icon-humi", color: "#38bdf8" },
    { id: "card-co2", title: "CO2", val: d.gas, unit: "ppm", max: th?.gas ?? 2000, icon: "fa-solid fa-wind", bg: "icon-co2", color: "#22c55e" }
  ];

  sensors.forEach(s => {
    const el = document.getElementById(s.id);
    if (!el) return;

    // 1. Render nội dung
    el.innerHTML = createCard(
      s.title,
      s.val,
      s.unit,
      s.max,
      s.icon,
      s.bg,
      s.color
    );

    // 2. Tính %
    const percent = s.val ? (s.val / s.max) * 100 : 0;

    // 3. XÓA TOÀN BỘ CLASS CŨ
    el.classList.remove(
      "pm25", "temp", "humi", "co2",
      "status-danger", "status-warning"
    );

    // 4. GÁN CLASS THEO LOẠI SENSOR
    if (s.id === "card-pm25") el.classList.add("pm25");
    if (s.id === "card-temp") el.classList.add("temp");
    if (s.id === "card-humi") el.classList.add("humi");
    if (s.id === "card-co2") el.classList.add("co2");

    // 5. GÁN TRẠNG THÁI
    if (percent >= 100) {
      el.classList.add("status-danger");
    } else if (percent >= 80) {
      el.classList.add("status-warning");
    }
  });
}

export function renderTable(historyData, thresholds = {}) {
  const tableBody = document.getElementById("history_table");
  const paginationContainer = document.getElementById("pagination"); // Cần thêm ID này vào HTML
  if (!tableBody) return;

  // 1. Chuẩn hóa & Lưu vào biến toàn cục
  if (!historyData) {
    currentHistoryData = [];
  } else if (Array.isArray(historyData)) {
    currentHistoryData = historyData;
  } else {
    currentHistoryData = Object.keys(historyData).map(key => ({ id: key, ...historyData[key] }));
  }

  // 2. Lọc & Sắp xếp
  currentHistoryData = currentHistoryData.filter(item => item && item.time);
  currentHistoryData.sort((a, b) => new Date(b.time) - new Date(a.time));

  // 3. Tính toán phân trang
  const totalRows = currentHistoryData.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  
  // Đảm bảo currentPage không vượt quá giới hạn
  if (currentPage > totalPages) currentPage = totalPages || 1;

  // 4. Cắt dữ liệu cho trang hiện tại
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedItems = currentHistoryData.slice(start, end);

  // 5. Nếu không có dữ liệu
  if (totalRows === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Không có dữ liệu</td></tr>`;
    if (paginationContainer) paginationContainer.innerHTML = "";
    return;
  }

  // 6. Render Rows
  let html = "";
  paginatedItems.forEach(h => {
    const isPmOver = h.pm25 > (thresholds.pm25 ?? 100);
    const isTempOver = h.temp > (thresholds.temp ?? 50);
    const isHumiOver = h.humi > (thresholds.humi ?? 100);
    const isGasOver = h.gas > (thresholds.gas ?? 2000);

    const rowClass = (isPmOver || isTempOver || isHumiOver || isGasOver) ? "row-warning" : "";

    html += `
      <tr class="${rowClass}">
        <td>${h.time || "--"}</td>
        <td class="${isPmOver ? 'cell-danger' : ''}">${h.pm25 ?? "--"}</td>
        <td class="${isTempOver ? 'cell-danger' : ''}">${h.temp ?? "--"}</td>
        <td class="${isHumiOver ? 'cell-danger' : ''}">${h.humi ?? "--"}</td>
        <td class="${isGasOver ? 'cell-danger' : ''}">${h.gas != null ? Math.round(h.gas) : "--"}</td>
        <td>
          <button class="btn-delete-small" onclick="deleteSingleHistory('${h.id}')"><i class="fa-solid fa-trash-can"></i></button>
        </td>
      </tr>`;
  });

  tableBody.innerHTML = html;

  // 7. Render bộ nút phân trang
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const paginationContainer = document.getElementById("pagination");
  if (!paginationContainer) return;

  let html = "";
  
  // Nút về trang trước
  html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
            <i class="fas fa-angle-left"></i>
          </button>`;

  // Các nút số trang
  for (let i = 1; i <= totalPages; i++) {
    // Chỉ hiện các trang gần trang hiện tại để tránh hàng nút quá dài
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
        html += `<span class="page-dots">...</span>`;
    }
  }

  // Nút sang trang sau
  html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
            <i class="fas fa-angle-right"></i>
          </button>`;

  paginationContainer.innerHTML = html;
}

// Hàm đổi trang toàn cục
window.changePage = function(page) {
    currentPage = page;
    // Gọi lại renderTable nhưng với dữ liệu đã có sẵn trong biến toàn cục
    // thresholds có thể lấy từ config hiện tại của bạn
    renderTable(currentHistoryData); 
};
// Ngưỡng cài đặt
export function renderThreshold(th) {

  document.getElementById("th-card-pm25").innerHTML =
    createLimitCard("Ngưỡng PM2.5", th?.pm25, "µg/m³", "fa-smog");

  document.getElementById("th-card-temp").innerHTML =
    createLimitCard("Ngưỡng nhiệt độ", th?.temp, "°C", "fa-temperature-high");

  document.getElementById("th-card-humi").innerHTML =
    createLimitCard("Ngưỡng độ ẩm", th?.humi, "%", "fa-droplet");

  document.getElementById("th-card-gas").innerHTML =
    createLimitCard("Ngưỡng CO2", th?.gas, "ppm", "fa-wind");
}

export function createLimitCard(title, value, unit, icon) {

  return `
    <div class="limit-card">

      <div class="limit-icon">
        <i class="fa-solid ${icon}"></i>
      </div>

      <div class="limit-content">

        <div class="limit-title">
          ${title}
        </div>

        <div class="limit-value-row">
          <span class="limit-value">
            ${value ?? "--"}
          </span>

          <span class="limit-unit">
            ${unit}
          </span>
        </div>

      </div>

    </div>
  `;
}

export function renderLastUpdate(current) {
  const el = document.getElementById("last-update");
  if (!el) return;

  // ❌ Không có dữ liệu
  if (!current || !current.time) {
    el.innerHTML = "🔴 Mất kết nối";
    return;
  }

  // Fix format time Firebase
  const lastTime = new Date(current.time.replace(" ", "T"));
  const now = new Date();

  const diffSec = Math.floor((now - lastTime) / 1000);

  let text = "";
  let status = "🟢";

  if (diffSec < 10) text = "vừa xong";
  else if (diffSec < 60) text = `${diffSec}s trước`;
  else if (diffSec < 3600) text = `${Math.floor(diffSec/60)} phút trước`;
  else text = lastTime.toLocaleString("vi-VN");

  // ⛔ OFFLINE nếu > 60s không update
  if (diffSec > 60) {
    status = "🔴";
    text = `${Math.floor(diffSec/60)} phút (offline)`;
  }

  el.innerHTML = `${status} ${text}`;
}