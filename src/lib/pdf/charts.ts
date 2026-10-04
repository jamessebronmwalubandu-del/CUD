import QuickChart from "quickchart-js";

const PALETTE = [
  "#0f766e", "#d97706", "#dc2626", "#7c3aed", "#2563eb",
  "#16a34a", "#ea580c", "#9333ea", "#0891b2", "#c026d3",
];

interface ChartConfig {
  type: "bar" | "line" | "pie" | "doughnut" | "horizontalBar";
  data: {
    labels: string[];
    datasets: Array<{
      label?: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string;
      borderWidth?: number;
      fill?: boolean;
    }>;
  };
  title?: string;
  width?: number;
  height?: number;
}

/**
 * Render a chart to a PNG buffer using the QuickChart service
 * (or local renderer if available).
 */
export async function renderChart(config: ChartConfig): Promise<Buffer> {
  const chart = new QuickChart();
  chart.setConfig({
    type: config.type,
    data: {
      labels: config.data.labels,
      datasets: config.data.datasets.map((d, i) => ({
        ...d,
        backgroundColor: d.backgroundColor ?? PALETTE[i % PALETTE.length],
        borderColor: d.borderColor ?? PALETTE[i % PALETTE.length],
        borderWidth: d.borderWidth ?? 1,
      })),
    },
    options: {
      plugins: {
        title: config.title
          ? { display: true, text: config.title, font: { size: 14 } }
          : { display: false },
        legend: {
          display: config.type === "pie" || config.type === "doughnut" || config.data.datasets.length > 1,
          position: "bottom",
          labels: { font: { size: 10 }, padding: 8 },
        },
        datalabels: {
          display: config.type === "pie" || config.type === "doughnut",
          color: "#fff",
          font: { weight: "bold", size: 10 },
          formatter: (val: number) => (val > 0 ? String(val) : ""),
        },
      },
    },
  });
  chart.setWidth(config.width ?? 600);
  chart.setHeight(config.height ?? 300);
  chart.setBackgroundColor("#ffffff");

  return chart.toBinary();
}

/**
 * Helper: Build a bar chart for "X by category" data.
 */
export function buildBarChart(
  labels: string[],
  data: number[],
  title?: string,
  horizontal = false
) {
  return renderChart({
    type: horizontal ? "horizontalBar" : "bar",
    data: {
      labels,
      datasets: [
        {
          label: title ?? "",
          data,
          backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
        },
      ],
    },
    title,
  });
}

/**
 * Helper: Build a pie chart.
 */
export function buildPieChart(
  labels: string[],
  data: number[],
  title?: string
) {
  return renderChart({
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
        },
      ],
    },
    title,
  });
}

/**
 * Helper: Build a line chart for time-series data.
 */
export function buildLineChart(
  labels: string[],
  datasets: Array<{ label: string; data: number[] }>,
  title?: string
) {
  return renderChart({
    type: "line",
    data: {
      labels,
      datasets: datasets.map((d, i) => ({
        label: d.label,
        data: d.data,
        borderColor: PALETTE[i % PALETTE.length],
        backgroundColor: PALETTE[i % PALETTE.length] + "30",
        fill: i === 0,
        borderWidth: 2,
      })),
    },
    title,
  });
}
