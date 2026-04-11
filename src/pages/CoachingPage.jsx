import { useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import CoachingSection from '../components/CoachingSection';
import SkillRadar from '../components/charts/SkillRadar';

export default function CoachingPage() {
  const { id } = useParams();
  const { data, loading, error } = useApi(`/api/checkpoints/${id}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-gray-400">코칭 리포트 불러오는 중...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 text-red-500">
        리포트를 불러올 수 없습니다: {error}
      </div>
    );
  }

  const { coaching, summary, period, previousChanges } = data;
  const currentScores = coaching?.dimensions?.reduce((acc, d) => {
    acc[d.name] = d.score;
    return acc;
  }, {});
  const previousScores = previousChanges?.reduce((acc, c) => {
    acc[c.name] = c.previous;
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* 헤더 */}
      <div className="coaching-card bg-gradient-to-r from-coach-600 to-coach-800 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">코칭 리포트</h1>
            <p className="text-coach-200 text-sm">
              {period?.from} ~ {period?.to}
            </p>
          </div>
          <div className="text-right text-sm text-coach-200">
            <p>세션 {summary?.sessionsAnalyzed || 0}개</p>
            <p>프롬프트 {summary?.promptsAnalyzed || 0}개</p>
            <p>커밋 {summary?.commitsAnalyzed || 0}개</p>
          </div>
        </div>
        <blockquote className="text-lg leading-relaxed opacity-95">
          "{coaching?.overallNarrative}"
        </blockquote>
      </div>

      {/* 레이더 차트 */}
      <div className="coaching-card">
        <h2 className="text-lg font-bold text-gray-900 mb-2">능력 프로필</h2>
        <SkillRadar current={currentScores} previous={previousScores} />
      </div>

      {/* 성장 분석 */}
      {coaching?.growthFromLast && (
        <div className="coaching-card border-l-4 border-emerald-400">
          <h2 className="text-lg font-bold text-emerald-700 mb-2">
            이전 대비 성장
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {coaching.growthFromLast}
          </p>
        </div>
      )}

      {/* 5개 차원별 코칭 */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">상세 코칭</h2>
        {coaching?.dimensions?.map((dim) => (
          <CoachingSection
            key={dim.name}
            dimension={dim}
            previousChange={previousChanges?.find((c) => c.name === dim.name)}
          />
        ))}
      </div>

      {/* 프롬프트 개선 예시 */}
      {coaching?.promptExamples && (
        <div className="coaching-card space-y-4">
          <h2 className="text-lg font-bold text-gray-900">
            프롬프트 개선 예시
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-xs text-red-500 font-medium mb-2">개선 전</p>
              <p className="text-sm text-gray-700">
                {coaching.promptExamples.before}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-xs text-emerald-600 font-medium mb-2">
                개선 후
              </p>
              <p className="text-sm text-gray-700">
                {coaching.promptExamples.after}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {coaching.promptExamples.explanation}
          </p>
        </div>
      )}

      {/* 강점 & 개선 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {coaching?.topStrengths?.length > 0 && (
          <div className="coaching-card">
            <h2 className="text-lg font-bold text-emerald-700 mb-3">강점</h2>
            <ul className="space-y-2">
              {coaching.topStrengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-emerald-500 shrink-0">&#10003;</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {coaching?.focusAreas?.length > 0 && (
          <div className="coaching-card">
            <h2 className="text-lg font-bold text-amber-600 mb-3">
              집중 개선 영역
            </h2>
            <ul className="space-y-2">
              {coaching.focusAreas.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-amber-500 shrink-0">!</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 다음 목표 */}
      {coaching?.nextGoals?.length > 0 && (
        <div className="coaching-card">
          <h2 className="text-lg font-bold text-coach-700 mb-3">
            다음 점검까지 목표
          </h2>
          <ul className="space-y-2">
            {coaching.nextGoals.map((g, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-coach-600"
                  readOnly
                />
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 리포트 다운로드 */}
      <div className="text-center">
        <a
          href={`/api/report/${id}`}
          download
          className="inline-flex items-center gap-2 text-coach-600 hover:text-coach-800 font-medium"
        >
          <span>&#128196;</span> Markdown 리포트 다운로드
        </a>
      </div>
    </div>
  );
}
