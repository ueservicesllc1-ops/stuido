
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface VuMeterProps {
  level: number; // Nivel de 0 a 100
}

const VuMeter: React.FC<VuMeterProps> = ({ level }) => {
  const height = `${Math.min(100, Math.max(0, level))}%`;
  const isSaturated = level >= 95;

  return (
    <div className="relative h-40 w-2 bg-secondary/50 rounded-full overflow-hidden">
      <div
        className={cn(
          "absolute bottom-0 w-full transition-[height] duration-75",
          isSaturated ? 'bg-destructive' : 'bg-green-500'
        )}
        style={{ height }}
      />
    </div>
  );
};

export default VuMeter;

    
