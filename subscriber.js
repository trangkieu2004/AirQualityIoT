import { db } from "./firebase_config.js";
import { ref, get, child, set, remove, update } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

export let subscribers = {};

export async function loadSubscribers() {
  const snapshot = await get(child(ref(db), "subscribers"));
  subscribers = snapshot.exists() ? snapshot.val() : {};
}

export async function addSubscriber(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // 1. Kiểm tra email trống hoặc sai định dạng
  if (!email || !emailPattern.test(email)) {
    Swal.fire({
      icon: 'error',
      title: 'Lỗi định dạng',
      text: 'Địa chỉ email không hợp lệ, vui lòng kiểm tra lại!',
      background: '#1a1f26',
      color: '#fff',
      confirmButtonColor: '#00ff88'
    });
    return false;
  }

  try {
    const id = Date.now();
    await set(ref(db, "subscribers/" + id), {
      email,
      createdAt: new Date().toLocaleString("vi-VN")
    });

    // 2. Thông báo khi thêm thành công
    Swal.fire({
      icon: 'success',
      title: 'Đăng ký thành công',
      text: `Hệ thống sẽ gửi cảnh báo đến: ${email}`,
      timer: 2000,
      showConfirmButton: false,
      background: '#1a1f26',
      color: '#fff'
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function deleteSubscriber(id) {
  await remove(ref(db, "subscribers/" + id));
}

export async function editSubscriber(id, email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || !emailPattern.test(email)) {
    return { success: false, message: "Email sửa đổi không hợp lệ!" };
  }

  try {
    await update(ref(db, "subscribers/" + id), { email });
    return { success: true, message: "Cập nhật email thành công!" };
  } catch (error) {
    return { success: false, message: "Không thể cập nhật dữ liệu!" };
  }
}
export function renderSubscribers() {
  let html = "";
  for (let key in subscribers) {
    const timeStamp = subscribers[key].createdAt || "---"; 

    html += `
      <tr>
        <td style="width: 40%; font-weight: 500; color: #eee; padding-left: 15px;">
          ${subscribers[key].email}
        </td>
        <td class="registration-date" style="width: 40%; text-align: center;">
          ${timeStamp}
        </td>
        <td style="width: 20%; text-align: center;">
          <div class="action-buttons" style="display: flex; justify-content: center; gap: 8px;">
            <button class="btn-edit-email" onclick="editEmail('${key}')" title="Sửa">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-remove-email" onclick="deleteEmail('${key}')" title="Gỡ bỏ">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  const tbody = document.getElementById("email_table");
  if (tbody) {
    tbody.innerHTML = html || `<tr><td colspan="3" style="text-align:center; color:#666; padding: 20px;">Chưa có email nào đăng ký</td></tr>`;
  }
}

