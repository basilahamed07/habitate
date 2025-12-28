import {
  Chart as ChartJS,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend
);

export function BarChart({ data, options }) {
  return <Bar data={data} options={options} />;
}

export function DoughnutChart({ data, options }) {
  return <Doughnut data={data} options={options} />;
}

export function LineChart({ data, options }) {
  return <Line data={data} options={options} />;
}
