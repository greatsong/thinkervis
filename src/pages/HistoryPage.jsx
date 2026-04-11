import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { data, loading } = useApi('/api/checkpoints');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-gray-400">이력 불러오는 중...</div>
      </div>
    );
  }

  if (!data?.checkpoints?.length) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-6xl mb-4">📋</p>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          아직 점검 이력이 없습니다
        </h2>
        <p className="text-gray-500">
          홈에서 "점검하기"를 눌러 첫 번째 코칭을 받아보세요
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">점검 이력</h1>
        <span className="text-sm text-gray-500">
          총 {data.total}회 점검
        </span>
      </div>

      <div className="grid gap-4">
        {data.checkpoints.map((cp) => {
          const avgScore = cp.scores
            ? (
                Object.values(cp.scores).reduce((s, v) => s + v, 0) /
                Object.values(cp.scores).length
              ).toFixed(1)
            : '-';

          return (
            <div
              key={cp.id}
              onClick={() => navigate(`/coaching/${cp.id}`)}
              className="coaching-card cursor-pointer hover:shadow-md hover:border-coach-200 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">
                    {new Date(cp.timestamp).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {cp.period?.from} ~ {cp.period?.to}
                  </p>
                  {cp.overallNarrative && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      "{cp.overallNarrative}"
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="text-3xl font-bold text-coach-600">
                    {avgScore}
                  </div>
                  <p className="text-xs text-gray-400">평균 점수</p>
                  <div className="text-xs text-gray-400 mt-1">
                    세션 {cp.summary?.sessionsAnalyzed || 0}개
                  </div>
                </div>
              </div>

              {cp.scores && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {Object.entries(cp.scores).map(([name, score]) => {
                    const SHORT = {
                      '문제 정의 능력': '문제정의',
                      '전략 수립 능력': '전략',
                      '도구 활용 능력': '도구',
                      '디버깅 대처 능력': '디버깅',
                      '학습과 성장': '성장',
                    };
                    const color =
                      score >= 8
                        ? 'bg-emerald-50 text-emerald-700'
                        : score >= 6
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700';
                    return (
                      <span
                        key={name}
                        className={`text-xs px-2 py-1 rounded-full ${color}`}
                      >
                        {SHORT[name] || name} {score}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
