// charts.js
export let dashboardChart, historyChart, predictChart;
window.isFiltering = false;

const MAX_POINTS = 30;

// Cấu hình Font chữ và màu sắc chung cho chuyên nghiệp
const chartDefaults = {
  fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
  textColor: "#e2e8f0", // Màu chữ xám nhạt (slate-400) sang trọng hơn trắng tinh
  gridColor: "rgba(255, 255, 255, 0.03)", // Đường lưới cực mờ
};

/* ================= INIT CHARTS ================= */
export function initCharts() {
  const historyCtx = document.getElementById("historyChart");
  const predictCtx = document.getElementById("predictChart");

  if (!historyCtx || !predictCtx) {
    console.error("❌ Canvas not found!");
    return;
  }

  // --- Hàm tạo Gradient cho nền biểu đồ (Tạo độ sâu) ---
  function getGradient(ctx, colorTop, colorBottom) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, colorTop);   // Màu đậm ở trên
    gradient.addColorStop(1, colorBottom); // Màu mờ dần ở dưới
    return gradient;
  }

  // --- Cấu hình Options chung cho vẻ ngoài chuyên nghiệp ---
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false, // Ép giãn hết chart-box
    interaction: {
      mode: 'index',
      intersect: false,
    },

    hover: {
      mode: null
    },

    plugins: {
      legend: {
        position: 'top',
        align: 'end', // Chú thích nằm góc trên bên phải
        labels: {
          generateLabels: function(chart) {
            const datasets = chart.data.datasets;

            return datasets.map((ds, i) => ({
              text: ds.label,
              fillStyle: ds.borderColor,
              strokeStyle: ds.borderColor,

              fontColor: chartDefaults.textColor,

              pointStyle: 'circle',

              lineWidth: 0,

              hidden: !chart.isDatasetVisible(i),

              index: i
            }));
          },
          color: chartDefaults.textColor,
          font: { size: 12, family: chartDefaults.fontFamily, weight: '600' },
          usePointStyle: true, // Dùng chấm tròn thay vì ô vuông
          pointStyle: 'circle',
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: "rgba(2, 6, 23, 0.9)", // Màu nền tooltip tối
        titleColor: "#fff",
        bodyColor: chartDefaults.textColor,
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          labelColor: function(context) {
            return {
              borderColor: context.dataset.borderColor,
              backgroundColor: context.dataset.borderColor,
            };
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: chartDefaults.textColor, font: { size: 11 } },
        grid: { display: false }, // Ẩn lưới trục X cho gọn
        border: { display: false }
      },
      y: {
        ticks: { color: "#94a3b8", font: { size: 11 }, padding: 10 },
        grid: {
          color: chartDefaults.gridColor,
          drawBorder: false,
          drawOnChartArea: true, // Vẫn giữ lưới ngang
          drawTicks: false,      // Bỏ gạch ở trục Y
          lineWidth: 0.5         // Làm mỏng lưới để nổi bật nền màu hơn
        },
        border: { display: false },
        beginAtZero: true,
        // Chừa khoảng trống phía trên để line không "đụng trần" khung chart
        // VD max dữ liệu ~400 thì chart sẽ scale lên ~440–480 tùy tình huống
        grace: "12%"
      }
    },
    animations: {
      tension: {
        duration: 1000,
        easing: 'linear',
        from: 1,
        to: 0.3, // Độ cong của đường
        loop: false
      }
    },
    elements: {
      point: {
        radius: 0, // Ẩn chấm tròn mặc định
        hoverRadius: 0, // Hiện khi hover
        hitRadius: 0,
        backgroundColor: "#fff",
        borderWidth: 0,
      },
      line: {
        tension: 0.3, // Bo cong đường line mượt mà
        borderCapStyle: 'round'
      }
    }
  };



  // ===== HISTORY (Style: Line Chart sắc nét) =====
  historyChart = new Chart(historyCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "PM2.5",
          data: [],
          borderColor: "#4ade80",
          borderWidth: 2,
          fill: false,
          yAxisID: "y",
        },
        {
          label: "Temp",
          data: [],
          borderColor: "#f87171",
          borderWidth: 2,
          fill: false,
          yAxisID: "y"
        },
        {
          label: "Humi",
          data: [],
          borderColor: "#38bdf8",
          borderWidth: 2,
          fill: false,
          yAxisID: "y"
        },
        {
          label: "CO2",
          data: [],
          borderColor: "#facc15",
          borderWidth: 2,
          fill: false,
          yAxisID: "y1"
        }
      ]
    },

    options: {
      ...commonOptions,

      scales: {
        ...commonOptions.scales,

        y: {
          ...commonOptions.scales.y,
          beginAtZero: true
          // ❌ ĐÃ XÓA max:300 và stepSize
        },
        y1: {
          ...commonOptions.scales.y,
          beginAtZero: true,
          position: 'right'
        }
      }
    },

    plugins: [
      {
        id: 'glow',
        beforeDatasetDraw: (chart, args) => {
          const { ctx } = chart;
          ctx.save();
          ctx.shadowBlur = 15;
          ctx.shadowColor = args.meta.dataset.options.borderColor;
        },
        afterDatasetDraw: (chart) => {
          chart.ctx.restore();
        }
      }
    ]
  });
  window.historyChart = historyChart;
  window.predictChart = predictChart;

  // ===== PREDICTION (Professional AI Dashboard) =====
  const glowPlugin = {
    id: 'glowEffect',
    beforeDatasetDraw(chart, args) {
      const { ctx } = chart;
      ctx.save();
      if (args.index === 1) {
        ctx.shadowColor = "#00ffb3";
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 4;
      }
    },
    afterDatasetDraw(chart) {
      chart.ctx.restore();
    }
  };

  const forecastZone = {
    id: 'forecastZone',

    beforeDraw(chart) {

      const { ctx, chartArea, scales } = chart;

      if (!chartArea) return;

      const x = scales.x;

      // 🔥 lấy đúng vị trí bắt đầu forecast
      const historyLength = chart.data.datasets[0].data.length;

      const startIndex = historyLength - 1;

      const startX = x.getPixelForTick(startIndex);

      ctx.save();

      const gradient = ctx.createLinearGradient(
        startX,
        0,
        chartArea.right,
        0
      );

      gradient.addColorStop(0, "rgba(0,255,179,0.015)");
      gradient.addColorStop(1, "rgba(0,255,179,0.05)");

      ctx.fillStyle = gradient;

      ctx.fillRect(
        startX,
        chartArea.top,
        chartArea.right - startX,
        chartArea.bottom - chartArea.top
      );

      ctx.beginPath();
      ctx.moveTo(startX, chartArea.top);
      ctx.lineTo(startX, chartArea.bottom);
      ctx.strokeStyle = "rgba(0,255,179,0.15)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.restore();
    }
  };

  predictChart = new Chart(predictCtx, {
    type: "line",

    data: {
      labels: [],
      datasets: [
        {
          label: "PM2.5 hiện tại",
          data: [],
          borderColor: "#ffffff",
          borderWidth: 2.5,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#ffffff",
          tension: 0.35
        },

        {
          label: "Dự đoán AI",
          data: [],
          borderColor: "#00e5ff",
          borderWidth: 3.5,
          fill: false,
          borderDash: [10, 5],
          pointRadius: 0,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: "#ffffff",
          pointHoverBorderColor: "#00e5ff",
          pointHoverBorderWidth: 3,
          tension: 0.45
        }
      ]
    },

    options: {
      ...commonOptions,

      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        mode: 'index',
        intersect: false
      },

      plugins: {
        ...commonOptions.plugins,

        legend: {
          position: 'top',
          align: 'end',
          labels: {
            color: "#94a3b8",
            usePointStyle: false,
            boxWidth: window.innerWidth < 500 ? 25 : 50, // Giảm độ dài đường line chú thích trên mobile
            boxHeight: 1,
            padding: window.innerWidth < 500 ? 8 : 20,   // Thu hẹp khoảng cách các chú thích trên mobile
            font: {
              size: window.innerWidth < 500 ? 10 : 13,   // Chữ chú thích nhỏ lại (10px) trên mobile cho gọn
              family: chartDefaults.fontFamily,
              weight: '600'
            }
          }
        },

        tooltip: {
          backgroundColor: "rgba(15,23,42,0.96)",

          titleColor: "#e2e8f0",
          bodyColor: "#cbd5e1",

          borderColor: "rgba(255,255,255,0.06)",
          borderWidth: 1,

          padding: 12,

          cornerRadius: 12,

          displayColors: true,

          usePointStyle: true,

          callbacks: {
            labelPointStyle: function(context) {

              return {
                pointStyle: 'line',
                rotation: 0
              };
            }
          }
        }
      },

      scales: {
        x: {
          ticks: {
            color: "#94a3b8",
            maxTicksLimit: 5, // Giới hạn tối đa 4-5 nhãn trên mobile thay vì 8 nhằm tạo khoảng trống
            maxRotation: 15,  // Cho phép nghiêng nhẹ nếu chữ quá dài, tránh đè nhau
            minRotation: 0,
            font: {
              size: 10 // Giảm size chữ trục X một chút trên màn hình nhỏ
            }
          },
          grid: {
            color: "rgba(255,255,255,0.03)",
            drawBorder: false
          },
          border: {
            display: false
          }
        },

        y: {
          beginAtZero: true,

          ticks: {
            color: "#94a3b8",
            padding: 10
          },

          grid: {
            color: "rgba(0,255,255,0.05)",
            drawBorder: false,
            drawTicks: false
          },

          border: {
            display: false
          },

          grace: "12%"
        }
      },

      animation: {
        duration: 1600,
        easing: 'easeOutQuart'
      },

      elements: {
        line: {
          borderCapStyle: 'round'
        }
      }
    },

    plugins: [
      glowPlugin,
      forecastZone
    ]
  });
}

/* ================= UPDATE CHARTS ================= */
export function updateCharts(history, future = []) {
  if (!historyChart || !predictChart) {
    console.warn("⚠ Charts not initialized yet");
    return;
  }

  // ===== LẤY 30 BẢN GHI MỚI NHẤT =====
  //const limited = history.slice(-MAX_POINTS);
  //fullHistory = history; // 🔥 lưu toàn bộ dữ liệu

  const displayData = window.isFiltering
    ? history               // nếu đang filter → dùng toàn bộ đã lọc
    : history.slice(-MAX_POINTS); // nếu bình thường → chỉ lấy 30

  // ===== LABELS =====
  const labels = displayData.map(h => {
    if (!h.time || h.time === "--") return "--:--:--";

    if (typeof h.time === "string" && h.time.includes(" ")) {
      return h.time.split(" ")[1]; // lấy giờ
    }

    return h.time;
  });

  // ===== DATA =====
  const pm25 = displayData.map(h => h.pm25);
  const temp = displayData.map(h => h.temp);
  const humi = displayData.map(h => h.humi);
  const gas = displayData.map(h => h.gas);

  /* ================= HISTORY ================= */
  historyChart.data.labels = labels;
  historyChart.data.datasets[0].data = pm25;
  historyChart.data.datasets[1].data = temp;
  historyChart.data.datasets[2].data = humi;
  historyChart.data.datasets[3].data = gas;
  historyChart.update('active');

  /* ================= PREDICTION FIX ================= */

  // convert Firebase object -> array
  future = (future && typeof future === "object")
    ? Object.values(future)
    : [];

  if (!pm25 || pm25.length === 0) return;

  const futureLabels = future.map(x => x?.time?.split(" ")[1] ?? "--:--");
  const futurePM25 = future.map(x => x.pm25 ?? null);

  const lastValue = pm25[pm25.length - 1] ?? null;

  predictChart.data.labels = [...labels, ...futureLabels];

  predictChart.data.datasets[0].data = [
    ...pm25,
    ...Array(Math.max(future.length, 0)).fill(null)
  ];

  predictChart.data.datasets[1].data = [
    ...Array(Math.max(pm25.length - 1, 0)).fill(null),
    lastValue,
    ...futurePM25
  ];

  predictChart.update();
}