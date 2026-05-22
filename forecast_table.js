export function renderForecastTable(forecast) {

  const tbody = document.getElementById("forecast-table-body");

  if (!tbody) return;

  tbody.innerHTML = "";

  if (!forecast || forecast.length === 0) {

    tbody.innerHTML = `
      <tr>
        <td colspan="5">Không có dữ liệu dự báo</td>
      </tr>
    `;

    return;
  }

  forecast.forEach(item => {

    const pm25 = Number(item.pm25 || 0);

    // 🔥 TÍNH AQI CHUẨN US EPA
    const aqi = calculateAQI(pm25);

    let aqiText = "Tốt";
    let aqiClass = "good";

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
        <td>${item.time || "--"}</td>
        <td>${pm25.toFixed(1)}</td>
        <td>${item.temp ?? "--"}°C</td>
        <td>${item.humi ?? "--"}%</td>
        <td>
          <span class="air ${aqiClass}">
            ${aqiText} (${aqi})
          </span>
        </td>
      </tr>
    `;
  });
}


// ================= AQI US EPA =================
function calculateAQI(pm25) {

  const breakpoints = [
    { cLow: 0.0,   cHigh: 12.0,   aqiLow: 0,   aqiHigh: 50 },
    { cLow: 12.1,  cHigh: 35.4,   aqiLow: 51,  aqiHigh: 100 },
    { cLow: 35.5,  cHigh: 55.4,   aqiLow: 101, aqiHigh: 150 },
    { cLow: 55.5,  cHigh: 150.4,  aqiLow: 151, aqiHigh: 200 },
    { cLow: 150.5, cHigh: 250.4,  aqiLow: 201, aqiHigh: 300 },
    { cLow: 250.5, cHigh: 500.4,  aqiLow: 301, aqiHigh: 500 }
  ];

  for (const bp of breakpoints) {

    if (pm25 >= bp.cLow && pm25 <= bp.cHigh) {

      const aqi =
        ((bp.aqiHigh - bp.aqiLow) /
        (bp.cHigh - bp.cLow)) *
        (pm25 - bp.cLow) +
        bp.aqiLow;

      return Math.round(aqi);
    }
  }

  return 500;
}