import { db } from "./firebase_config.js";
import { ref, onChildAdded, get, update } 
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { subscribers } from "./subscriber.js";

// ================= STATE =================
let lastSentId = localStorage.getItem("last_alert_id") || null;
let lastHash = localStorage.getItem("last_alert_hash") || "";
let lastSendTime = Number(localStorage.getItem("last_send_time") || 0);

const emailjs = window.emailjs;

const COOLDOWN = 60000; // 60s

// ================= INIT =================
export async function initAlertEmailListener() {

  const alertRef = ref(db, "alert_history");

  // 🔥 LẤY TOÀN BỘ ID CŨ
  const firstSnap = await get(alertRef);

  const oldIds = new Set();

  firstSnap.forEach(child => {
    oldIds.add(child.key);
  });

  console.log("✅ Email listener ready");

  onChildAdded(alertRef, async (snapshot) => {

    const id = snapshot.key;
    const data = snapshot.val();

    if (!id || !data) return;

    // 🔥 BỎ TOÀN BỘ DỮ LIỆU CŨ
    if (oldIds.has(id)) {
      return;
    }

    // 🔥 ĐÃ GỬI RỒI
    if (data.emailSent === true) {
      return;
    }

    const now = Date.now();

    // 🔥 HASH
    const hash =
      `${data.alert}|${data.pm25}|${data.gas}|${data.temp}|${data.humi}|${data.time}`;

    // 🔥 CHỐNG TRÙNG
    if (hash === lastHash) {
      return;
    }

    // 🔥 COOLDOWN
    if (now - lastSendTime < COOLDOWN) {
      console.log("⏳ Cooldown");
      return;
    }

    console.log("🔥 NEW ALERT:", data);

    // SAVE
    lastHash = hash;
    lastSendTime = now;

    localStorage.setItem("last_alert_hash", hash);
    localStorage.setItem("last_send_time", now);

    // SEND
    await sendEmailToAll(data, id);

  });
}

// ================= SEND EMAIL =================
async function sendEmailToAll(data, alertId) {
  const subSnapshot = await get(ref(db, "subscribers"));

  if (!subSnapshot.exists()) {
    console.log("⚠️ No subscribers");
    return;
  }

  const subData = subSnapshot.val();

  const list = Object.values(subData)
    .filter(s => s.email);

  if (!list.length) {
    console.log("⚠️ No subscribers");

    await update(ref(db, "alert_history/" + alertId), {
      emailSent: false,
      emailStatus: "NO_SUBSCRIBER",
      emailCount: 0,
      emailFailed: 0,
      failedEmails: [],
      emailSentAt: new Date().toISOString()
    });

    return;
  }

  let successCount = 0;
  let failedList = [];

  for (const sub of list) {
    try {
      // ⏱️ timeout chống treo
      await Promise.race([
        emailjs.send("service_4khoxbr", "template_3c5ewue", {
          to_email: sub.email,
          pm25: data.pm25,
          gas: data.gas,
          temp: data.temp,
          humi: data.humi,
          time: data.time,
          alert: data.alert
        }),
        new Promise((_, reject) => setTimeout(() => reject("timeout"), 10000))
      ]);

      successCount++;
      console.log("✅ Sent:", sub.email);

    } catch (err) {
      console.error("❌ Email error:", sub.email, err);
      failedList.push(sub.email);
    }
  }

  // ================= STATUS =================
  let status = "FAILED";
  if (successCount === list.length) {
    status = "SUCCESS";
  } else if (successCount > 0) {
    status = "PARTIAL";
  }

  // ================= SAVE RESULT =================
  await update(ref(db, "alert_history/" + alertId), {
    emailSent: successCount === list.length,   // 🔥 FIX QUAN TRỌNG
    emailStatus: status,
    emailCount: successCount,
    emailFailed: list.length - successCount,
    failedEmails: failedList,
    emailSentAt: new Date().toISOString()
  });

  console.log("📦 Saved email status:", {
    status,
    success: successCount,
    failed: list.length - successCount
  });
}
// ================= RESEND ALL EMAIL =================
export async function resendAllEmails() {
  const btn = document.getElementById("resendBtn");

  try {
    btn.disabled = true;
    btn.innerHTML = "⏳ Đang gửi...";

    const { loadSubscribers } = await import("./subscriber.js");
    await loadSubscribers();

    const list = Object.values(subscribers || {}).filter(s => s.email);

    if (!list.length) {
      alert("Không có email");
      return;
    }

    let sent = 0;

    for (const sub of list) {
      try {
        await emailjs.send("service_4khoxbr", "template_3c5ewue", {
          to_email: sub.email,
          message: "🔁 Gửi lại cảnh báo"
        });

        sent++;
      } catch (e) {
        console.log(e);
      }
    }

    btn.innerHTML = `✔ Đã gửi: ${sent}/${list.length}`;

    setTimeout(() => {
      btn.innerHTML = "🔁 Gửi lại toàn bộ";
      btn.disabled = false;
    }, 2000);

  } catch (err) {
    console.error(err);

    btn.innerHTML = "❌ Lỗi";
    btn.disabled = false;
  }
}