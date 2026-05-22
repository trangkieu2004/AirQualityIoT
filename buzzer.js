import { db } from "./firebase_config.js";

import {ref,get,child,update} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// =========================
// ELEMENT
// =========================
const buzzerToggle =
  document.getElementById("buzzerToggle");

// =========================
// LOAD TRẠNG THÁI CÒI
// =========================
export async function initBuzzerSetting() {

  try {

    const snapshot = await get(
      child(ref(db), "threshold")
    );

    if (!snapshot.exists()) return;

    const data = snapshot.val();

    buzzerToggle.checked =
      data.buzzer ?? true;

  }
  catch (err) {

    console.error(
      "Lỗi tải trạng thái còi:",
      err
    );

  }

}

// =========================
// BẬT / TẮT CÒI
// =========================
export function setupBuzzerToggle() {

  buzzerToggle.addEventListener("change", async () => {

    try {

      await update(
        ref(db, "threshold"),
        {
          buzzer: buzzerToggle.checked
        }
      );

      console.log(
        "Buzzer:",
        buzzerToggle.checked ? "ON" : "OFF"
      );

    }
    catch (err) {

      console.error(
        "Lỗi cập nhật còi:",
        err
      );

    }

  });

}