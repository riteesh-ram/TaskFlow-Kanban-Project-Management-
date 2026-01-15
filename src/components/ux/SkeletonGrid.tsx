import React from 'react';

interface SkeletonGridProps {
  rows?: number;
  cols?: number;
  className?: string;
}

// Lightweight grid skeleton for loading states.
export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ rows = 2, cols = 3, className = '' }) => {
  const items = Array.from({ length: rows * cols });
  return (
    <div className={`grid gap-4 ${className}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map((_, idx) => (
        <div key={idx} className="h-24 rounded-md bg-muted animate-pulse" />
      ))}
    </div>
  );
};
