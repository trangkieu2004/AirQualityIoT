export function renderForecastTable(forecast) {

  const tbody =
    document.getElementById("forecast-table-body");

  if (!tbody) return;

  tbody.innerHTML = "";

  // ================= NO DATA =================
  if (!forecast || forecast.length === 0) {

    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          Không có dữ liệu dự báo
        </td>
      </tr>
    `;

    return;
  }

  // ================= RENDER ROWS =================
  forecast.forEach(item => {

    const pm25 =
      Number(item.pm25 || 0);

    // 🔥 DÙNG VN_AQI TỪ FIREBASE
    const aqi =
      Number(item.vn_aqi || 0);

    let aqiText = "Tốt";
    let aqiClass = "good";

    // ================= VN_AQI LEVEL =================
    if (aqi > 300) {

      aqiText = "Nguy hại";
      aqiClass = "hazard";

    }
    else if (aqi > 200) {

      aqiText = "Rất xấu";
      aqiClass = "verybad";

    }
    else if (aqi > 150) {

      aqiText = "Xấu";
      aqiClass = "danger";

    }
    else if (aqi > 100) {

      aqiText = "Kém";
      aqiClass = "bad";

    }
    else if (aqi > 50) {

      aqiText = "Trung bình";
      aqiClass = "medium";
    }

    tbody.innerHTML += `
      <tr>

        <td>
          ${item.time || "--"}
        </td>

        <td>
          ${pm25.toFixed(1)}
        </td>

        <td>
          ${Number(item.temp || 0).toFixed(1)}°C
        </td>

        <td>
          ${Number(item.humi || 0).toFixed(1)}%
        </td>

        <td>
          <span class="air ${aqiClass}">
            ${aqiText} (${aqi})
          </span>
        </td>

      </tr>
    `;
  });
}

