import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const SHORT_NAMES = {
  '문제 정의 능력': '문제 정의',
  '전략 수립 능력': '전략 수립',
  '도구 활용 능력': '도구 활용',
  '디버깅 대처 능력': '디버깅',
  '학습과 성장': '학습/성장',
};

export default function SkillRadar({ current, previous = null }) {
  if (!current) return null;

  const data = Object.entries(current).map(([name, score]) => ({
    subject: SHORT_NAMES[name] || name,
    현재: score,
    ...(previous ? { 이전: previous[name] || 0 } : {}),
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 13, fill: '#374151' }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 10]}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
        />
        {previous && (
          <Radar
            name="이전"
            dataKey="이전"
            stroke="#d1d5db"
            fill="#e5e7eb"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        )}
        <Radar
          name="현재"
          dataKey="현재"
          stroke="#0c93e7"
          fill="#bae0fd"
          fillOpacity={0.5}
          strokeWidth={2}
        />
        {previous && <Legend />}
      </RadarChart>
    </ResponsiveContainer>
  );
}
