import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi, usePost } from '../hooks/useApi';
import SkillRadar from '../components/charts/SkillRadar';

export default function HomePage() {
  const navigate = useNavigate();
  const { data: status, loading: statusLoading, refetch } = useApi('/api/status');
  const { execute: runCheckpoint, loading: checkpointLoading } = usePost('/api/checkpoint');
  const [progress, setProgress] = useState('');

  const handleCheckpoint = async () => {
    setProgress('데이터 수집 중...');
    setTimeout(() => setProgress('세션 분석 중...'), 2000);
    setTimeout(() => setProgress('AI 코칭 분석 중...'), 5000);
    setTimeout(() => setProgress('리포트 생성 중...'), 10000);

    const result = await runCheckpoint();
    setProgress('');
    if (result?.checkpointId) {
      await refetch();
      navigate(`/coaching/${result.checkpointId}`);
    }
  };

  const lastScores = status?.lastCheckpoint?.scores;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 히어로 섹션 */}
      <div className="text-center space-y-4 pt-8">
        <h1 className="text-4xl font-bold text-gray-900">
          팅커비스
        </h1>
        <p className="text-gray-500 text-lg">
          당신의 문제해결 여정을 함께하는 코치
        </p>
      </div>

      {/* 점검 버튼 */}
      <div className="coaching-card text-center space-y-6 py-10">
        {status?.lastCheckpoint ? (
          <div className="space-y-2">
            <p className="text-gray-500">
              마지막 점검: {status.lastCheckpoint.daysSince}일 전
            </p>
            <p className="text-sm text-gray-400">
              이후 세션 {status.pending?.sessions || 0}개, 프롬프트{' '}
              {status.pending?.prompts || 0}개 미분석
            </p>
          </div>
        ) : (
          <p className="text-gray-500">아직 점검한 적이 없습니다</p>
        )}

        <button
          onClick={handleCheckpoint}
          disabled={checkpointLoading}
          className={`px-8 py-4 rounded-2xl text-white font-bold text-lg transition-all ${
            checkpointLoading
              ? 'bg-gray-300 cursor-wait'
              : 'bg-coach-600 hover:bg-coach-700 hover:shadow-lg hover:shadow-coach-200 active:scale-95'
          }`}
        >
          {checkpointLoading ? (
            <span className="flex items-center gap-3">
              <svg
                className="animate-spin h-5 w-5"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {progress || '분석 중...'}
            </span>
          ) : (
            '점검하기'
          )}
        </button>

        {status?.pending?.sessions === 0 && status?.lastCheckpoint && (
          <p className="text-xs text-gray-400">
            새로운 데이터가 없어도 점검을 실행할 수 있습니다
          </p>
        )}
      </div>

      {/* 최근 점검 결과 */}
      {lastScores && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="coaching-card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              현재 능력 프로필
            </h2>
            <SkillRadar current={lastScores} />
          </div>

          <div className="coaching-card space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              팅커비스의 메시지
            </h2>
            <blockquote className="border-l-4 border-coach-300 pl-4 text-gray-700 italic leading-relaxed">
              {status.lastCheckpoint.overallNarrative}
            </blockquote>

            <div className="pt-4">
              <button
                onClick={() =>
                  navigate(`/coaching/${status.lastCheckpoint.id}`)
                }
                className="text-coach-600 hover:text-coach-800 font-medium text-sm"
              >
                상세 리포트 보기 &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 점검 이력 미니 */}
      {status?.totalCheckpoints > 0 && (
        <div className="text-center">
          <button
            onClick={() => navigate('/history')}
            className="text-gray-500 hover:text-coach-600 text-sm"
          >
            총 {status.totalCheckpoints}회 점검 이력 보기
          </button>
        </div>
      )}
    </div>
  );
}
