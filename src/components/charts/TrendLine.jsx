import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0c93e7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const SHORT_NAMES = {
  '문제 정의 능력': '문제 정의',
  '전략 수립 능력': '전략 수립',
  '도구 활용 능력': '도구 활용',
  '디버깅 대처 능력': '디버깅',
  '학습과 성장': '학습/성장',
};

export default function TrendLine({ checkpoints }) {
  if (!checkpoints?.length) return null;

  const data = checkpoints.map((cp) => ({
    date: cp.timestamp?.slice(0, 10),
    ...Object.entries(cp.scores || {}).reduce((acc, [name, score]) => {
      acc[SHORT_NAMES[name] || name] = score;
      return acc;
    }, {}),
  }));

  const dimensions = Object.keys(SHORT_NAMES).map(
    (k) => SHORT_NAMES[k]
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {dimensions.map((dim, i) => (
          <Line
            key={dim}
            type="monotone"
            dataKey={dim}
            stroke={COLORS[i]}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
