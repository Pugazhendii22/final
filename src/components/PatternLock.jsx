import { useState } from 'react';

const DOTS = Array.from({ length: 9 }, (_, index) => ({
  id: index + 1,
  cx: 25 + (index % 3) * 75,
  cy: 25 + Math.floor(index / 3) * 75,
}));

const PatternLock = ({ value = [], onChange, readOnly = false }) => {
  const [drawing, setDrawing] = useState(false);
  const pattern = Array.isArray(value) ? value : [];

  const addDot = (id) => {
    if (!id || pattern.includes(id)) return;
    const next = [...pattern, id];
    onChange?.(next);
  };

  const handlePointerDown = (id, event) => {
    if (readOnly) return;
    event.preventDefault();
    setDrawing(true);
    addDot(id);
  };

  const handlePointerEnter = (id, event) => {
    if (readOnly || !drawing) return;
    event.preventDefault();
    addDot(id);
  };

  const getDotFromTouch = (touch) => {
    if (!touch) return null;
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return null;
    const index = element.dataset.dotIndex || element.closest('[data-dot-index]')?.dataset.dotIndex;
    return index ? parseInt(index, 10) : null;
  };

  const handleTouchStart = (event) => {
    if (readOnly) return;
    const touch = event.touches[0];
    const dotIndex = getDotFromTouch(touch);
    if (dotIndex) {
      event.preventDefault();
      setDrawing(true);
      addDot(dotIndex);
    }
  };

  const handleTouchMove = (event) => {
    if (readOnly || !drawing) return;
    event.preventDefault();
    const touch = event.touches[0];
    const dotIndex = getDotFromTouch(touch);
    if (dotIndex) {
      addDot(dotIndex);
    }
  };

  const handleTouchEnd = () => {
    if (readOnly) return;
    setDrawing(false);
  };

  const stopDrawing = () => {
    if (readOnly) return;
    setDrawing(false);
  };

  const clearPattern = () => {
    if (readOnly) return;
    onChange?.([]);
  };

  const points = pattern.map((id) => DOTS[id - 1]).filter(Boolean);
  const polylinePoints = points.map((point) => `${point.cx},${point.cy}`).join(' ');

  return (
    <div className="space-y-3" style={{ touchAction: 'none', userSelect: 'none' }}>
      <div
        className="relative w-[200px] h-[200px] mx-auto"
        style={{ touchAction: 'none' }}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        onPointerCancel={stopDrawing}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200" preserveAspectRatio="none">
          {points.length > 1 && (
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="#2563eb"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.7"
            />
          )}
          {points.map((point) => (
            <circle key={`marker-${point.id}`} cx={point.cx} cy={point.cy} r="8" fill="#2563eb" />
          ))}
        </svg>

        <div className="grid grid-cols-3 gap-0 w-full h-full">
          {DOTS.map(({ id }) => {
            const selected = pattern.includes(id);
            return (
              <button
                type="button"
                key={id}
                data-dot-index={id}
                onPointerDown={(event) => handlePointerDown(id, event)}
                onPointerEnter={(event) => handlePointerEnter(id, event)}
                className="relative w-full h-full flex items-center justify-center"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span
                  data-dot-index={id}
                  className={`block w-5 h-5 rounded-full border ${
                    selected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
                  } transition`}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {pattern.length > 0 ? `Pattern: ${pattern.join(' → ')}` : 'Pattern: not set'}
        </p>
        {!readOnly && (
          <button type="button" onClick={clearPattern} className="text-sm text-slate-700 hover:text-slate-900">
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default PatternLock;
