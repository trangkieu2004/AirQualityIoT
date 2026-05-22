import { db } from "./firebase_config.js";
import { ref, get, child, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

export let alertLogs = [];
export let filteredLogs = [];
let logData = [];
let logPage = 1;
const logRowsPerPage = 5;
export function resetLogPage() {
  logPage = 1;
}
export function setFilteredLogs(data) {
  filteredLogs = data;
}
export function loadAlertLogs() {

  const alertRef = ref(db, "alert_history");

  onValue(alertRef, (snapshot) => {

    if (snapshot.exists()) {

      const data = snapshot.val();

      alertLogs = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));

      // MỚI NHẤT LÊN ĐẦU
      alertLogs.sort(
        (a, b) => new Date(b.time) - new Date(a.time)
      );

    } else {

      alertLogs = [];

    }

    // RESET FILTER
    filteredLogs = [...alertLogs];

    // RENDER REALTIME
    renderAlertLogs();

  }, (error) => {

    console.error(
      "Lỗi realtime alert:",
      error
    );

  });

}

/**
 * Hàm bổ trợ: Xác định mức độ nghiêm trọng để tô màu
 */
function getSeverity(log) {

  const pm = parseFloat(log.pm25) || 0;
  const gas = parseFloat(log.gas) || 0;
  const temp = parseFloat(log.temp) || 0;
  const humi = parseFloat(log.humi) || 0;

  let level = 0;

  // ================= PM2.5 =================

  if (pm > 150)
      level = Math.max(level, 3);

  else if (pm > 55)
      level = Math.max(level, 2);

  else if (pm > 35)
      level = Math.max(level, 1);

  // ================= GAS =================

  if (gas > 4000)
      level = Math.max(level, 3);

  else if (gas > 2000)
      level = Math.max(level, 2);

  else if (gas > 1000)
      level = Math.max(level, 1);

  // ================= TEMP =================

  if (temp > 45)
      level = Math.max(level, 3);

  else if (temp > 40)
      level = Math.max(level, 2);

  else if (temp > 35)
      level = Math.max(level, 1);

  // ================= HUMI =================

  if (humi > 90 || humi < 10)
      level = Math.max(level, 3);

  else if (humi > 80 || humi < 20)
      level = Math.max(level, 2);

  else if (humi > 70 || humi < 30)
      level = Math.max(level, 1);

  // ================= RETURN =================

  if (level === 3) {
      return {
          text: "Rất nguy hiểm",
          class: "sev-critical"
      };
  }

  if (level === 2) {
      return {
          text: "Nguy hiểm",
          class: "sev-high"
      };
  }

  if (level === 1) {
      return {
          text: "Cảnh báo",
          class: "sev-warn"
      };
  }

  return {
      text: "Bình thường",
      class: "sev-normal"
  };
}

/**
 * Hiển thị dữ liệu ra bảng
 */

export function renderAlertLogs() {

  const tbody = document.getElementById("alert_log_table");

  if (!tbody) return;

  // ================= INIT FILTER =================

  if (!filteredLogs) {

    filteredLogs = alertLogs.filter(
      log => log.alert && log.alert.trim() !== ""
    );

  }

  // ================= EMPTY =================

  if (filteredLogs.length === 0) {

    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center">
          Không có cảnh báo mới.
        </td>
      </tr>
    `;

    return;
  }

  // ================= PAGINATION =================

  const start =
    (logPage - 1) * logRowsPerPage;

  const end =
    start + logRowsPerPage;

  const pageData =
    filteredLogs.slice(start, end);

  // ================= BUILD HTML =================

  let html = "";

  pageData.forEach(log => {

    const alertStr =
      (log.alert || "").toUpperCase();

    // ================= BADGE =================

    let badgeHTML = "";

    if (alertStr.includes("PM2.5")) {
      badgeHTML += `
        <span class="log-badge badge-pm25">
          PM2.5
        </span>
      `;
    }

    if (alertStr.includes("GAS")) {
      badgeHTML += `
        <span class="log-badge badge-gas">
          GAS
        </span>
      `;
    }

    if (alertStr.includes("TEMP")) {
      badgeHTML += `
        <span class="log-badge badge-temp">
          TEMP
        </span>
      `;
    }

    if (alertStr.includes("HUMI")) {
      badgeHTML += `
        <span class="log-badge badge-humi">
          HUMI
        </span>
      `;
    }

    // ================= HIGHLIGHT =================

    const pmClass =
      alertStr.includes("PM2.5")
      ? "txt-highlight"
      : "";

    const gasClass =
      alertStr.includes("GAS")
      ? "txt-highlight"
      : "";

    const tempClass =
      alertStr.includes("TEMP")
      ? "txt-highlight"
      : "";

    const humiClass =
      alertStr.includes("HUMI")
      ? "txt-highlight"
      : "";

    // ================= SEVERITY =================

    const severity = getSeverity(log);

    // ================= EMAIL =================

    let emailHTML = "";

    if (!log.emailSent) {

      emailHTML = `
        <span class="email-pending">
          Chưa gửi
        </span>
      `;

    } else if (log.emailFailed > 0) {

      emailHTML = `
        <span class="email-warning">
          ${log.emailCount || 0}/${(log.emailCount || 0) + (log.emailFailed || 0)}
        </span>
      `;

    } else {

      emailHTML = `
        <span class="email-sent">
          Đã gửi ${log.emailCount || 0}
        </span>
      `;

    }

    // ================= ROW =================

    html += `
      <tr>

        <td class="log-time">
          ${log.time || "--"}
        </td>

        <td>
          ${badgeHTML}
        </td>

        <td class="${pmClass}">
          ${(parseFloat(log.pm25) || 0).toFixed(2)}
        </td>

        <td class="${gasClass}">
          ${(parseFloat(log.gas) || 0).toFixed(2)}
        </td>

        <td class="${tempClass}">
          ${log.temp || 0} °C
        </td>

        <td class="${humiClass}">
          ${log.humi || 0} %
        </td>

        <td>
          <span class="status-tag ${severity.class}">
            ${severity.text}
          </span>
        </td>

        <td>
          ${emailHTML}
        </td>

      </tr>
    `;
  });

  // ================= RENDER =================

  tbody.innerHTML = html;

  renderLogPagination(
    Math.ceil(filteredLogs.length / logRowsPerPage)
  );
}

function renderLogPagination(totalPages) {
  const paginationContainer = document.getElementById("logPagination");
  if (!paginationContainer) return;

  let html = "";

  // Nút lùi
  html += `<button class="page-btn" ${logPage === 1 ? 'disabled' : ''} onclick="changeLogPage(${logPage - 1})">
            <i class="fas fa-angle-left"></i>
          </button>`;

  // Nút số trang
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= logPage - 1 && i <= logPage + 1)) {
      html += `<button class="page-btn ${i === logPage ? 'active' : ''}" onclick="changeLogPage(${i})">${i}</button>`;
    } else if (i === logPage - 2 || i === logPage + 2) {
      html += `<span class="page-dots">...</span>`;
    }
  }

  // Nút tiến
  html += `<button class="page-btn" ${logPage === totalPages ? 'disabled' : ''} onclick="changeLogPage(${logPage + 1})">
            <i class="fas fa-angle-right"></i>
          </button>`;

  paginationContainer.innerHTML = html;
}
// ================= CHANGE PAGE =================
window.changeLogPage = function(page) {
  logPage = page;
  renderAlertLogs();
};

export async function fixOldAlertData() {
  try {
    const snapshot = await get(child(ref(db), "alert_history"));

    if (!snapshot.exists()) {
      console.log("❌ Không có dữ liệu");
      return;
    }

    const data = snapshot.val();

    for (const key in data) {
      const item = data[key];

      // Nếu chưa có emailSent → thêm vào
      if (item.emailSent === undefined) {
        await update(ref(db, "alert_history/" + key), {
          emailSent: false,
          emailCount: 0,
          emailFailed: 0
        });

        console.log("✅ Fixed:", key);
      }
    }

    console.log("🎉 Hoàn tất fix dữ liệu cũ");

  } catch (err) {
    console.error("❌ Lỗi fix dữ liệu:", err);
  }
}