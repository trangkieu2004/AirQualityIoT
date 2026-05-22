import { initCharts, updateCharts } from "./charts.js";
import { db, ref, set, get, remove, update, push } from "./firebase_config.js";
import { listenCurrent, listenHistory, listenThreshold, listenForecast } from "./data.js";
import { renderCards, renderTable, renderAQI, renderThreshold } from "./ui.js";
import { initAlertEmailListener, resendAllEmails } from "./email.js";
import { addSubscriber, loadSubscribers, renderSubscribers, deleteSubscriber, editSubscriber, subscribers } from "./subscriber.js";
import { loadAlertLogs, renderAlertLogs, alertLogs, fixOldAlertData, setFilteredLogs, resetLogPage } from "./logs.js";
import { initAI } from "./ai.js";
import { renderForecastTable } from "./forecast_table.js";
import { listenPrediction } from "./prediction.js";
import {initBuzzerSetting, setupBuzzerToggle} from "./buzzer.js";


// ================= INIT =================
window.addEventListener("DOMContentLoaded", async () => {
  initCharts();
  listenPrediction();
  await initBuzzerSetting();
  setupBuzzerToggle();

  await loadSubscribers();
  renderSubscribers();

  await fixOldAlertData();

  await loadAlertLogs();
  renderAlertLogs();

  initAlertEmailListener();

  initAI();
});

let latestData = null;
let latestThreshold = null;
let latestHistory = [];
let latestForecast = [];

window.toggleMenu = function () {
  document.querySelector(".sidebar").classList.toggle("active");
};
// ================= HANDLE ADD EMAIL =================
document.getElementById("btnAddEmail").addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value.trim();

  if (!email) {
    alert("Nhập email!");
    return;
  }

  await addSubscriber(email);

  await loadSubscribers();
  renderSubscribers();

  document.getElementById("emailInput").value = "";
});
// ================= DELETE EMAIL =================
window.deleteEmail = async function(id) {
  const currentEmail = subscribers?.[id]?.email || "";

  const result = await Swal.fire({
    icon: "warning",
    title: "Gỡ email đăng ký?",
    html: currentEmail
      ? `Bạn chắc chắn muốn gỡ email:<br><b>${currentEmail}</b>?`
      : "Bạn chắc chắn muốn gỡ email này?",
    showCancelButton: true,
    confirmButtonText: "Gỡ",
    cancelButtonText: "Hủy",
    reverseButtons: true,
    background: "#0b1220",
    color: "#fff",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "rgba(148, 163, 184, 0.35)",
  });

  if (!result.isConfirmed) return;

  await deleteSubscriber(id);
  await loadSubscribers();
  renderSubscribers();

  Swal.fire({
    icon: "success",
    title: "Đã gỡ email",
    timer: 1400,
    showConfirmButton: false,
    background: "#0b1220",
    color: "#fff",
  });
};

// ================= EDIT EMAIL =================
window.editEmail = async function(id) {
  const oldEmail = subscribers?.[id]?.email || "";
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const { value: newEmail } = await Swal.fire({
    title: "Sửa email",
    input: "email",
    inputLabel: "Nhập email mới",
    inputValue: oldEmail,
    inputPlaceholder: "VD: example@gmail.com",
    showCancelButton: true,
    confirmButtonText: "Lưu",
    cancelButtonText: "Hủy",
    reverseButtons: true,
    background: "#0b1220",
    color: "#fff",
    confirmButtonColor: "#10b981",
    cancelButtonColor: "rgba(148, 163, 184, 0.35)",
    preConfirm: (value) => {
      const v = (value || "").trim();
      if (!v) return "Vui lòng nhập email!";
      if (!emailPattern.test(v)) return "Email không hợp lệ!";
      return undefined;
    },
  });

  if (!newEmail) return;

  const result = await editSubscriber(id, newEmail.trim());
  if (!result?.success) {
    Swal.fire({
      icon: "error",
      title: "Không thể cập nhật",
      text: result?.message || "Đã xảy ra lỗi.",
      background: "#0b1220",
      color: "#fff",
      confirmButtonColor: "#ef4444",
    });
    return;
  }

  await loadSubscribers();
  renderSubscribers();

  Swal.fire({
    icon: "success",
    title: "Đã cập nhật email",
    timer: 1400,
    showConfirmButton: false,
    background: "#0b1220",
    color: "#fff",
  });
};
// ================= FORMAT TIME =================
function formatTimeVN(timeStr) {
  if (!timeStr) return "--";

  const d = new Date(timeStr.replace(" ", "T") + "+07:00");

  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");

  const dd = d.getDate().toString().padStart(2, "0");
  const MM = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();

  return `${hh}:${mm} ${dd}/${MM}/${yyyy}`;
}
// ================= TIME AGO =================
function timeAgo(timeStr) {
  if (!timeStr) return "--";

  const now = new Date();
  const past = new Date(timeStr.replace(" ", "T") + "+07:00");

  const diff = Math.floor((now - past) / 1000);

  if (diff < 10) return "Vừa xong";
  if (diff < 60) return `${diff} giây trước`;

  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  // 🔥 QUAN TRỌNG: quá 24h thì hiển thị giờ thật
  return formatTimeVN(timeStr);
}
// ================= SET ONLINE/OFFLINE =================
let isOnline = null;

function setOnline() {
  if (isOnline === true) return;
  isOnline = true;

  const status = document.getElementById("status-badge");

  if (status) {
    status.innerText = "● Online";
    status.classList.remove("status-offline");
    status.classList.add("status-online");
  }
}

function setOffline() {
  if (isOnline === false) return;
  isOnline = false;

  const status = document.getElementById("status-badge");

  if (status) {
    status.innerText = "● Offline";
    status.classList.remove("status-online");
    status.classList.add("status-offline");
  }
}
// ===== WIFI STATUS (updated for 60s sampling) =====
const CURRENT_UPDATE_SEC = 60;
const ONLINE_GRACE_SEC = 15;
const ONLINE_THRESHOLD_SEC = CURRENT_UPDATE_SEC + ONLINE_GRACE_SEC; // 75s

function updateWifiStatus(current) {
  console.log("CURRENT:", current);
  console.log("WIFI:", current?.wifi);
  const el = document.getElementById("wifi-status");
  if (!el) return;
  const lastSeenEl = document.getElementById("device-last-seen");
  const latencyEl = document.getElementById("device-latency");
  const dotEl = document.getElementById("device-dot");

  // Chưa có dữ liệu
  if (!current || !current.time) {
    el.innerHTML = "Chưa có dữ liệu";
    el.className = "value offline";
    if (lastSeenEl) lastSeenEl.innerText = "Cập nhật: --";
    if (latencyEl) latencyEl.innerText = "Độ trễ: --";
    if (dotEl) dotEl.className = "dot-indicator offline";
    return;
  }

  const now = new Date();
  const dataTime = new Date(current.time.replace(" ", "T") + "+07:00");
  const diffSec = (now - dataTime) / 1000;

  if (lastSeenEl) lastSeenEl.innerText = `Cập nhật: ${formatTimeVN(current.time)}`;
  if (latencyEl) latencyEl.innerText = `Độ trễ: ${timeAgo(current.time)}`;

  // Dữ liệu quá cũ => coi như mất kết nối
  if (!Number.isFinite(diffSec) || diffSec > ONLINE_THRESHOLD_SEC) {
    const s = Number.isFinite(diffSec) ? Math.floor(diffSec) : "--";
    el.innerHTML = `Mất kết nối`;
    el.className = "value offline";
    if (dotEl) dotEl.className = "dot-indicator offline";
    return;
  }

  const wifi = Number(current.wifi);

  if (!Number.isFinite(wifi)) {
    el.innerHTML = "WiFi: -- dBm";
    el.className = "value warning";
    return;
  }

  if (wifi >= -55) {
    el.innerHTML = `Sóng rất mạnh (${wifi} dBm)`;
    el.className = "value online";
    if (dotEl) dotEl.className = "dot-indicator online";
  } else if (wifi >= -67) {
    el.innerHTML = `Sóng mạnh (${wifi} dBm)`;
    el.className = "value online";
    if (dotEl) dotEl.className = "dot-indicator online";
  } else if (wifi >= -75) {
    el.innerHTML = `Sóng trung bình (${wifi} dBm)`;
    el.className = "value warning";
    if (dotEl) dotEl.className = "dot-indicator warning";
  } else {
    el.innerHTML = `Sóng yếu (${wifi} dBm)`;
    el.className = "value danger";
    if (dotEl) dotEl.className = "dot-indicator danger";
  }
}
// ===== CURRENT (CARD) =====
let offlineTimeout = null;

listenCurrent((current) => {
  latestData = current;

  // update time
  const updateElem = document.getElementById("last-update");
  if (updateElem) {
    updateElem.innerText = timeAgo(current.time);
  }

  // 🔥 WIFI
  updateWifiStatus(current);

  // 🔥 AQI + CARD
  renderAQI(current.pm25);

  if (latestThreshold) {
    renderCards(latestData, latestThreshold);
  }
});


// ===== ONLINE/OFFLINE (updated for 60s sampling) =====
setInterval(() => {
  if (!latestData || !latestData.time) return;
  const now = new Date();
  const dataTime = new Date(latestData.time.replace(" ", "T") + "+07:00");
  const diffSec = (now - dataTime) / 1000;
  // Online/Offline theo nhịp 60s (+ đệm)
  if (Number.isFinite(diffSec) && diffSec <= ONLINE_THRESHOLD_SEC) {
    setOnline();
  } else {
    setOffline();
  }

  updateWifiStatus(latestData);
  
  // Text thời gian
  const updateElem = document.getElementById("last-update");
  if (updateElem) {
    // quá 2 chu kỳ thì show giờ thật cho rõ
    if (!Number.isFinite(diffSec) || diffSec > CURRENT_UPDATE_SEC * 2) {
      updateElem.innerText = formatTimeVN(latestData.time);
    } else {
      updateElem.innerText = timeAgo(latestData.time);
    }
  }
}, 5000);

// ================= HISTORY =================
listenHistory(async (history) => {

    latestHistory = history || [];
    window.fullHistory = latestHistory;

    renderTable(latestHistory);
    updateCharts(latestHistory, latestForecast || []);

    await loadAlertLogs();
    renderAlertLogs(latestThreshold);
});
// ================= FORECAST =================
listenForecast((forecast) => {
  latestForecast = forecast;
  renderForecastTable(latestForecast);
  updateCharts(latestHistory, latestForecast);
});
// ================= HANDLE SEARCH (Bổ sung nếu chưa có) =================
window.filterAlertLogs = function () {

  const searchText =
    document.getElementById("logSearchInput")
    .value
    .toLowerCase()
    .trim();

  const typeFilter =
    document.getElementById("logTypeFilter")
    .value
    .toLowerCase()
    .trim();

  // ================= FILTER =================

  const newFilteredLogs = alertLogs.filter(log => {

    // bỏ dòng không có alert
    if (!log.alert || log.alert.trim() === "") {
      return false;
    }

    const alertStr =
      (log.alert || "").toLowerCase();

    const rowText =
      JSON.stringify(log).toLowerCase();

    // ================= SEARCH =================

    const matchesSearch =
      rowText.includes(searchText);

    // ================= TYPE FILTER =================

    let matchesType = true;

    if (typeFilter !== "all") {

      matchesType =
        alertStr.includes(typeFilter);

    }

    return matchesSearch && matchesType;

  });

  // ================= SAVE FILTERED =================

  setFilteredLogs(newFilteredLogs);

  // ================= RESET PAGE =================

  resetLogPage();

  // ================= RENDER =================

  renderAlertLogs();

};
// ================= THRESHOLD =================
listenThreshold((th) => {

  latestThreshold = th; // 🔥 BẮT BUỘC PHẢI CÓ

  renderThreshold(th || {});

  if (th) {
    document.getElementById("th-pm25-input").value = th.pm25 ?? "";
    document.getElementById("th-temp-input").value = th.temp ?? "";
    document.getElementById("th-humi-input").value = th.humi ?? "";
    document.getElementById("th-gas-input").value = th.gas ?? "";

    renderAlertLogs(th); // 🔥 CẬP NHẬT NGAY KHI CÓ THRESHOLD MỚI
  }

  // 🔥 UPDATE UI NGAY KHI CÓ THRESHOLD
  if (latestData && latestThreshold) {
    renderCards(latestData, latestThreshold);
  }
});
// ================= SAVE THRESHOLD =================
window.saveThreshold = async function () {

  const newTh = {
    pm25: Number(document.getElementById("th-pm25-input").value || 0),
    temp: Number(document.getElementById("th-temp-input").value || 0),
    humi: Number(document.getElementById("th-humi-input").value || 0),
    gas: Number(document.getElementById("th-gas-input").value || 0)
  };

  await update(ref(db, "threshold"), newTh);

  alert("Đã lưu ngưỡng!");
  closeThresholdPopup();
};
console.log("🔥 NEW CODE 123");

// ================= DELETE HISTORY =================
// 1. Hàm đóng Modal
window.closeConfirmModal = function() {
  document.getElementById("confirmModal").style.display = "none";
};

// 2. Hàm khi nhấn nút "Xóa dữ liệu" (Chưa xóa ngay, chỉ hiện popup)
window.handleDelete = function () {
  const type = document.getElementById("deleteType").value;
  const input = document.getElementById("dateInput").value;

  // Hiển thị modal bằng Flex để căn giữa
  const modal = document.getElementById("confirmModal");
  modal.style.display = "flex"; 

  // Thay đổi nội dung thông báo cho phù hợp
  const msg = document.getElementById("confirmMessage");
  let text = "Bạn có chắc chắn muốn xóa ";
  if (type === "all") text += "tất cả lịch sử?";
  else text += `dữ liệu ${type === "day" ? "ngày" : type === "month" ? "tháng" : "năm"}: ${input}?`;
  msg.innerText = text;

  // Gán sự kiện cho nút "Đồng ý xóa" bên trong Modal
  document.getElementById("btnConfirmAction").onclick = async function() {
    closeConfirmModal(); // Đóng modal ngay
    await executeDelete(type, input); // Gọi hàm xử lý xóa thực sự
  };
};

// 3. Hàm xử lý xóa thực sự trên Firebase (Tối ưu dùng update)
async function executeDelete(type, input) {
  const snapshot = await get(ref(db, "history"));
  if (!snapshot.exists()) {
    alert("Không có dữ liệu để xóa!");
    return;
  }
  if (type === "all") {
    try {
      await remove(ref(db, "history"));
      alert("Đã xóa toàn bộ!");
      return;
    } catch (err) {
      alert("Lỗi khi xóa!");
      return;
    }
  }
  const data = snapshot.val();
  const updates = {};
  let count = 0;

  for (let key in data) {
    const item = data[key];

    if (!item || !item.time) continue; // 🔥 cực quan trọng

    if (shouldDelete(type, input, item.time)) {
      updates[`history/${key}`] = null;
      count++;
    }
  }

  if (count > 0) {
    try {
      // Đảm bảo bạn đã import { update } từ firebase_config.js
      await update(ref(db), updates); 
      alert(`Đã xóa thành công ${count} dòng!`);
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      alert("Có lỗi xảy ra khi xóa dữ liệu!");
    }
  } else {
    alert("Không tìm thấy dữ liệu phù hợp để xóa.");
  }
}

// --- Xóa từng dòng ---
window.deleteSingleHistory = function(id) {

  if (!id) {
    alert("ID không hợp lệ!");
    return;
  }

  const modal = document.getElementById("confirmModal");
  const msg = document.getElementById("confirmMessage");

  msg.innerText = "Bạn có chắc chắn muốn xóa bản ghi này?";
  modal.style.display = "flex";

  document.getElementById("btnConfirmAction").onclick = async function() {
    closeConfirmModal();
    await remove(ref(db, "history/" + id));
  };
};

// --- Logic so sánh để xóa hàng loạt (Sửa để chính xác hơn) ---
function shouldDelete(type, input, time) {
  if (type === "all") return true; // ✔️ chỉ return

  if (!input) return false;

  if (!time || typeof time !== "string") return false;

  const timeDate = time.split(" ")[0].trim();
  const userInput = input.trim();

  switch (type) {
    case "day":
      return timeDate === userInput;

    case "month":
      return timeDate.startsWith(userInput);

    case "year":
      return timeDate.startsWith(userInput);

    default:
      return false;
  }
}
window.toggleDateInput = function () {
  const type = document.getElementById("deleteType").value;

  const dateInput = document.getElementById("dateInput");
  const monthInput = document.getElementById("monthInput");
  const yearInput = document.getElementById("yearInput");

  dateInput.style.display = "none";
  monthInput.style.display = "none";
  yearInput.style.display = "none";

  if (type === "day") {
    dateInput.style.display = "block";
  }

  if (type === "month") {
    monthInput.style.display = "block";
  }

  if (type === "year") {
    yearInput.style.display = "block";
  }
};

window.exportXLSX = async function () {
  const snapshot = await get(ref(db, "history"));

  if (!snapshot.exists()) {
    alert("Không có dữ liệu!");
    return;
  }

  const data = snapshot.val();

  // 🔥 Chuẩn hóa dữ liệu
  const rows = [];

  Object.values(data).forEach(item => {
    if (!item) return;

    rows.push({
      "Thời gian": item.time, // 🔥 giữ nguyên có giây
      "PM2.5": item.pm25,
      "Nhiệt độ": item.temp,
      "Độ ẩm": item.humi,
      "CO2": item.gas
    });
  });

  // 🔥 Tạo worksheet
  const ws = XLSX.utils.json_to_sheet(rows);

  // 🔥 Auto width cột
  const colWidths = [
    { wch: 20 }, // thời gian
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 }
  ];
  ws["!cols"] = colWidths;

  // 🔥 Tạo workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Du lieu");

  // 🔥 Xuất file
  XLSX.writeFile(wb, "du_lieu_cam_bien.xlsx");
};

window.exportCSV_AI = async function () {
  const snapshot = await get(ref(db, "history"));

  if (!snapshot.exists()) {
    alert("Không có dữ liệu!");
    return;
  }

  const data = snapshot.val();

  // ✅ Header đầy đủ thời gian
  let csv = "timestamp,year,month,day,hour,minute,second,pm25,temp,humi,gas,label\n";

  Object.values(data).forEach(item => {
    if (!item) return;

    // 🔥 Parse thời gian chuẩn
    const d = new Date(item.time.replace(" ", "T"));

    const year = d.getFullYear();
    const month = d.getMonth() + 1; // tháng bắt đầu từ 0
    const day = d.getDate();
    const hour = d.getHours();
    const minute = d.getMinutes();
    const second = d.getSeconds();

    // 🔥 Timestamp (rất quan trọng cho AI)
    const timestamp = Math.floor(d.getTime() / 1000); // ms

    const pm = item.pm25;

    // 🔥 Tạo label
    let label = "good";
    if (pm > 100) label = "bad";
    else if (pm > 50) label = "warning";

    csv += `${timestamp},${year},${month},${day},${hour},${minute},${second},${pm},${item.temp},${item.humi},${item.gas},${label}\n`;
  });

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "train_ai_full_time.csv";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
function parseTime(str) {
  if (!str) return null;

  const [date, time] = str.split(" ");
  if (!date || !time) return null;

  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss] = time.split(":").map(Number);

  return new Date(y, m - 1, d, hh, mm, ss);
}
window.applyFilter = function () {
  const startValue = document.getElementById("startDate").value;
  const endValue = document.getElementById("endDate").value;

  console.log("START:", startValue, "END:", endValue);
  console.log("FULL HISTORY:", window.fullHistory);

  if (!startValue || !endValue) {
    alert("Chọn đủ ngày!");
    return;
  }

  const startDate = new Date(startValue + "T00:00:00");
  const endDate = new Date(endValue + "T23:59:59");

  const filtered = (window.fullHistory || []).filter(item => {
    if (!item.time) return false;

    const itemDate = new Date(item.time.replace(" ", "T"));

    return itemDate >= startDate && itemDate <= endDate;
  });

  console.log("FILTER RESULT:", filtered.length, filtered);

  window.isFiltering = true;

  updateCharts(filtered);
  renderTable(filtered);
};

window.resetFilter = function () {
  window.isFiltering = false;

  updateCharts(window.fullHistory);
  renderTable(window.fullHistory);
};

// ================= DELETE LOGS =================
// Hàm xử lý hiện Popup xác nhận cho Nhật ký cảnh báo
window.handleDeleteAlertLogs = function() {
    const modal = document.getElementById("confirmModal");
    const msg = document.getElementById("confirmMessage");
    const btnConfirm = document.getElementById("btnConfirmAction");

    if (!modal || !msg || !btnConfirm) return;

    // 1. Hiển thị modal (dùng flex để căn giữa nếu CSS của bạn quy định vậy)
    modal.style.display = "flex"; 

    // 2. Thay đổi nội dung thông báo
    msg.innerText = "Bạn có chắc chắn muốn XÓA TOÀN BỘ nhật ký cảnh báo không? Hành động này không thể hoàn tác.";

    // 3. Gán sự kiện cho nút "Đồng ý xóa" bên trong Modal
    btnConfirm.onclick = async function() {
        closeConfirmModal(); // Đóng modal ngay sau khi bấm
        
        try {
            // Thực hiện xóa trên Firebase nhánh alert_history
            const { ref, remove } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js");
            await remove(ref(db, "alert_history"));
            
            // Thông báo thành công (có thể dùng alert hoặc toast tùy bạn)
            alert("Đã xóa sạch nhật ký cảnh báo!");
        } catch (error) {
            console.error("Lỗi khi xóa:", error);
            alert("Có lỗi xảy ra, không thể xóa dữ liệu.");
        }
    };
};

// Hàm xuất báo cáo CSV cho Nhật ký cảnh báo
window.exportAlertLogs = function () {
  // 1. Kiểm tra xem có dữ liệu trong mảng alertLogs không
  // (Mảng này được export từ logs.js và đã load dữ liệu từ alert_history)
  if (!alertLogs || alertLogs.length === 0) {
    alert("Không có dữ liệu nhật ký để xuất file!");
    return;
  }

  // 2. Chuẩn hóa dữ liệu để đưa vào Excel (Đặt tên cột tiếng Việt cho đẹp)
  const rows = alertLogs.map(item => ({
    "Thời gian": item.time || "",
    "Loại cảnh báo": item.alert ? item.alert.trim() : "N/A",
    "PM2.5 (µg/m³)": item.pm25 || 0,
    "Gas": item.gas || 0,
    "Nhiệt độ (°C)": item.temp || 0,
    "Độ ẩm (%)": item.humi || 0,
    "Trạng thái": "Danger"
  }));

  // 3. Tạo Worksheet
  const ws = XLSX.utils.json_to_sheet(rows);

  // 4. Cấu hình độ rộng các cột để file Excel trông chuyên nghiệp
  const colWidths = [
    { wch: 20 }, // Thời gian
    { wch: 15 }, // Loại cảnh báo
    { wch: 15 }, // PM2.5
    { wch: 10 }, // Gas
    { wch: 12 }, // Nhiệt độ
    { wch: 10 }, // Độ ẩm
    { wch: 12 }  // Trạng thái
  ];
  ws["!cols"] = colWidths;

  // 5. Tạo Workbook và xuất file
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Nhat_Ky_Canh_Bao");

  // Đặt tên file kèm theo ngày giờ hiện tại cho dễ quản lý
  const fileName = `nhat_ky_canh_bao_${new Date().getTime()}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// ================= Email =================
function showToast(message, type = 'success') {
    const toast = document.createElement("div");
    toast.className = `toast-msg toast-${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Hàm xử lý sự kiện khi nhấn nút "+"
async function handleAddEmail() {
    const emailInput = document.getElementById("email_input_id");
    const email = emailInput.value;

    const result = await addSubscriber(email);

    if (result.success) {
        showToast(result.message, "success");
        emailInput.value = ""; // Xóa trống ô nhập khi thành công
    } else {
        showToast(result.message, "error");
    }
}

async function handleEditEmail(id) {
    const oldEmail = subscribers[id].email;
    const newEmail = prompt("Nhập địa chỉ email mới:", oldEmail);

    if (newEmail === null || newEmail.trim() === oldEmail) return; // Người dùng hủy hoặc không sửa gì

    const result = await editSubscriber(id, newEmail.trim());

    if (result.success) {
        showToast(result.message, "success");
        // Gọi lại hàm load và render để cập nhật bảng
        await loadSubscribers();
        renderSubscribers();
    } else {
        showToast(result.message, "error");
    }
}
// hàm gửi lại toàn bộ email
window.resendAllEmails = resendAllEmails;
