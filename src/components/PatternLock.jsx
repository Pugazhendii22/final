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
    <div className="w-full" style={{ touchAction: 'none', userSelect: 'none' }}>
      <p className="text-sm text-gray-500 text-center mb-3">
        {pattern.length === 0 
          ? 'Draw the unlock pattern' 
          : `Pattern recorded (${pattern.length} points)`}
      </p>
      
      <div
        className="bg-[#f0f4ff] rounded-2xl p-6 flex flex-col items-center justify-center relative"
        onPointerDown={handlePointerStart}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
      >
        <div style={{ width: '240px', height: '240px', position: 'relative' }}>
          <svg 
            ref={svgRef}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            viewBox="0 0 200 200" 
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Pattern path */}
            {pathData && (
              <path
                d={pathData}
                fill="none"
                stroke="#002395"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
              />
            )}
            
            {/* Dot connections */}
            {points.length > 1 && (
              <path
                d={`M ${points.map(p => `${p.cx} ${p.cy}`).join(' L ')}`}
                fill="none"
                stroke="#002395"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
              />
            )}
            
            {/* Current position indicator */}
            {isDrawing && (
              <circle 
                cx={currentPos.x} 
                cy={currentPos.y} 
                r="8" 
                fill="#002395" 
                opacity="0.4"
              />
            )}
          </svg>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', width: '100%', height: '100%' }}>
            {DOTS.map(({ id }, index) => {
              const isSelected = pattern.includes(id);
              
              return (
                <div
                  key={id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <div
                    className={`flex items-center justify-center transition-all duration-200 ${
                      isSelected 
                        ? 'w-14 h-14 rounded-full bg-[#002395] border-2 border-[#002395] shadow-lg' 
                        : 'w-14 h-14 rounded-full bg-white border-2 border-gray-300 shadow-sm'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {pattern.length > 0 && !readOnly && (
        <button
          type="button"
          onClick={clearPattern}
          className="mt-3 w-full bg-red-50 text-[#ED2939] rounded-xl py-2 text-sm font-semibold border border-red-100"
        >
          <i className="fas fa-redo mr-2"></i>Clear Pattern
        </button>
      )}
    </div>
  );
};

export default PatternLock;
