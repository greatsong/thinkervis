export default function CoachingSection({ dimension, previousChange }) {
  if (!dimension) return null;

  const scoreColor =
    dimension.score >= 8
      ? 'bg-emerald-500'
      : dimension.score >= 6
        ? 'bg-coach-500'
        : dimension.score >= 4
          ? 'bg-amber-500'
          : 'bg-red-500';

  const changeText = previousChange
    ? previousChange.change > 0
      ? `+${previousChange.change}`
      : `${previousChange.change}`
    : null;

  const changeColor = previousChange
    ? previousChange.change > 0
      ? 'text-emerald-600'
      : previousChange.change < 0
        ? 'text-red-500'
        : 'text-gray-400'
    : '';

  return (
    <div className="coaching-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">{dimension.name}</h3>
        <div className="flex items-center gap-2">
          <div className={`score-badge ${scoreColor}`}>{dimension.score}</div>
          {changeText && (
            <span className={`text-sm font-medium ${changeColor}`}>
              {changeText}
            </span>
          )}
        </div>
      </div>

      <p className="text-gray-700 leading-relaxed">{dimension.narrative}</p>

      {dimension.cases?.length > 0 && (
        <div className="space-y-3">
          {dimension.cases.map((c, i) => (
            <div
              key={i}
              className="border border-gray-100 rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {c.sessionRef}
                </span>
                <span className="text-sm text-gray-600">{c.what}</span>
              </div>
              {c.good && (
                <div className="flex gap-2 text-sm">
                  <span className="text-emerald-500 shrink-0">+</span>
                  <span className="text-gray-700">{c.good}</span>
                </div>
              )}
              {c.better && (
                <div className="flex gap-2 text-sm">
                  <span className="text-amber-500 shrink-0">&#8593;</span>
                  <span className="text-gray-700">{c.better}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {dimension.actionItems?.length > 0 && (
        <div className="bg-coach-50 rounded-xl p-4 space-y-2">
          <h4 className="text-sm font-semibold text-coach-700">
            실행 조언
          </h4>
          {dimension.actionItems.map((item, i) => (
            <div key={i} className="flex gap-2 text-sm text-coach-800">
              <span className="shrink-0">&#10148;</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
