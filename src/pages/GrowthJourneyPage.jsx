import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import SkillRadar from '../components/charts/SkillRadar';
import TrendLine from '../components/charts/TrendLine';

export default function GrowthJourneyPage() {
  const navigate = useNavigate();
  const { data, loading } = useApi('/api/status/growth');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-gray-400">성장 데이터 불러오는 중...</div>
      </div>
    );
  }

  if (!data?.checkpoints?.length) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-6xl mb-4">📈</p>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          아직 성장 기록이 없습니다
        </h2>
        <p className="text-gray-500">
          점검을 2회 이상 하면 성장 추이를 볼 수 있어요
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <h1 className="text-2xl font-bold text-gray-900">성장 여정</h1>

      {/* 점수 추이 차트 */}
      {data.checkpoints.length >= 2 && (
        <div className="coaching-card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            능력 변화 추이
          </h2>
          <TrendLine checkpoints={data.checkpoints} />
        </div>
      )}

      {/* 성장 변화 요약 */}
      {data.growthData?.latestChanges && (
        <div className="coaching-card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            최근 변화
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {data.growthData.latestChanges.map((c) => {
              const color =
                c.change > 0
                  ? 'text-emerald-600 bg-emerald-50'
                  : c.change < 0
                    ? 'text-red-500 bg-red-50'
                    : 'text-gray-400 bg-gray-50';
              const SHORT = {
                '문제 정의 능력': '문제 정의',
                '전략 수립 능력': '전략 수립',
                '도구 활용 능력': '도구 활용',
                '디버깅 대처 능력': '디버깅',
                '학습과 성장': '학습/성장',
              };
              return (
                <div key={c.name} className="text-center space-y-1">
                  <p className="text-xs text-gray-500">
                    {SHORT[c.name] || c.name}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {c.current}
                  </p>
                  <p className={`text-xs font-medium px-2 py-1 rounded-full inline-block ${color}`}>
                    {c.change > 0 ? `+${c.change}` : c.change}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 타임라인 */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">점검 타임라인</h2>
        {data.checkpoints.map((cp, idx) => (
          <div
            key={cp.id}
            className="relative pl-8 pb-8 border-l-2 border-coach-200 last:border-transparent"
          >
            <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-coach-500 border-2 border-white" />
            <div
              className="coaching-card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/coaching/${cp.id}`)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">
                  {new Date(cp.timestamp).toLocaleDateString('ko-KR')}
                </span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                  #{data.checkpoints.length - idx}
                </span>
              </div>
              {cp.overallNarrative && (
                <p className="text-gray-700 text-sm leading-relaxed mb-3">
                  "{cp.overallNarrative}"
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                {cp.strengths?.map((s, i) => (
                  <span
                    key={i}
                    className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
