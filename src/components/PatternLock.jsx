import { useState, useRef, useEffect, useMemo } from 'react';

const DOTS = Array.from({ length: 9 }, (_, index) => ({
  id: index + 1,
  cx: 25 + (index % 3) * 75,
  cy: 25 + Math.floor(index / 3) * 75,
}));

const PatternLock = ({ value = [], onChange, readOnly = false }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const pattern = useMemo(() => Array.isArray(value) ? value : [], [value]);
  const patternRef = useRef(pattern);
  const pointerIdRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  useEffect(() => {
    return () => {
      if (pointerIdRef.current) {
        document.releasePointerCapture?.(pointerIdRef.current);
      }
    };
  }, []);

  const getSVGCoords = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    
    const rect = svg.getBoundingClientRect();
    const scaleX = 200 / rect.width;
    const scaleY = 200 / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const getNearestDot = (x, y) => {
    let nearest = null;
    let minDist = 35; // Activation radius
    
    DOTS.forEach(({ id, cx, cy }) => {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist < minDist && !patternRef.current.includes(id)) {
        minDist = dist;
        nearest = id;
      }
    });
    
    return nearest;
  };

  const addDotToPattern = (dotId) => {
    if (!dotId || patternRef.current.includes(dotId)) return;
    
    const newPattern = [...patternRef.current, dotId];
    patternRef.current = newPattern;
    onChange?.(newPattern);
  };

  const handlePointerStart = (event) => {
    if (readOnly) return;
    
    event.preventDefault();
    const coords = getSVGCoords(event.clientX, event.clientY);
    
    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    
    setIsDrawing(true);
    setCurrentPos(coords);
    
    // Check if starting on a dot
    const startDot = getNearestDot(coords.x, coords.y);
    if (startDot) {
      addDotToPattern(startDot);
    }
  };

  const handlePointerMove = (event) => {
    if (readOnly || !isDrawing || event.pointerId !== pointerIdRef.current) return;
    
    event.preventDefault();
    const coords = getSVGCoords(event.clientX, event.clientY);
    
    setCurrentPos(coords);
    
    // Check for dots along the path
    const nearestDot = getNearestDot(coords.x, coords.y);
    if (nearestDot) {
      addDotToPattern(nearestDot);
    }
  };

  const handlePointerEnd = (event) => {
    if (readOnly || event.pointerId !== pointerIdRef.current) return;
    
    setIsDrawing(false);
    setCurrentPos({ x: 0, y: 0 });
    pointerIdRef.current = null;
  };

  const clearPattern = () => {
    if (readOnly) return;
    onChange?.([]);
  };

  const points = pattern.map(id => DOTS[id - 1]).filter(Boolean);
  
  // Create the path: connect all dots, then extend to current position if drawing
  const pathData = points.length > 0 ? 
    `M ${points.map(p => `${p.cx} ${p.cy}`).join(' L ')}${
      isDrawing ? ` L ${currentPos.x} ${currentPos.y}` : ''
    }` : '';

  return (
    <div className="space-y-3" style={{ touchAction: 'none', userSelect: 'none' }}>
      <div
        className="relative w-full max-w-[240px] aspect-square mx-auto"
        onPointerDown={handlePointerStart}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
      >
        <svg 
          ref={svgRef}
          className="absolute inset-0 w-full h-full" 
          viewBox="0 0 200 200" 
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Subtle background */}
          <rect width="200" height="200" fill="#f8fafc" rx="8" />
          
          {/* Grid lines */}
          <defs>
            <pattern id="dotGrid" width="66.67" height="66.67" patternUnits="userSpaceOnUse">
              <circle cx="33.33" cy="33.33" r="1" fill="#e2e8f0" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="200" height="200" fill="url(#dotGrid)" />
          
          {/* Pattern path */}
          {pathData && (
            <path
              d={pathData}
              fill="none"
              stroke="#2563eb"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
          )}
          
          {/* Dot connections (thicker) */}
          {points.length > 1 && (
            <path
              d={`M ${points.map(p => `${p.cx} ${p.cy}`).join(' L ')}`}
              fill="none"
              stroke="#2563eb"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          )}
          
          {/* Active dots */}
          {points.map((point, index) => (
            <circle 
              key={`active-${point.id}`} 
              cx={point.cx} 
              cy={point.cy} 
              r="14" 
              fill="#2563eb" 
              opacity="0.9"
            />
          ))}
          
          {/* Current position indicator */}
          {isDrawing && (
            <circle 
              cx={currentPos.x} 
              cy={currentPos.y} 
              r="10" 
              fill="#2563eb" 
              opacity="0.6"
            />
          )}
        </svg>

        <div className="grid grid-cols-3 gap-0 w-full h-full absolute inset-0">
          {DOTS.map(({ id }, index) => {
            const isSelected = pattern.includes(id);
            const isCurrent = isDrawing && getNearestDot(currentPos.x, currentPos.y) === id;
            
            return (
              <div
                key={id}
                className="relative w-full h-full flex items-center justify-center"
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                    isSelected 
                      ? 'bg-blue-600 border-blue-600 scale-125 shadow-lg' 
                      : isCurrent
                        ? 'bg-blue-300 border-blue-400 scale-110 shadow-md'
                        : 'bg-white border-gray-300 hover:border-blue-400'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {pattern.length > 0 ? `Pattern: ${pattern.join(' → ')}` : 'Draw your pattern'}
        </p>
        {!readOnly && (
          <button 
            type="button" 
            onClick={clearPattern} 
            className="text-sm text-slate-600 hover:text-slate-800 underline"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default PatternLock;
