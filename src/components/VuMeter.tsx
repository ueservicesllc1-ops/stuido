
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface VuMeterProps {
  level: number; // Nivel de 0 a 100
}

const NUM_DOTS = 18; // Número total de "LEDs" en el vúmetro

const VuMeter: React.FC<React.memoExoticComponent<any>> = React.memo(({ level }) => {
  // Calcula cuántos puntos deben estar encendidos
  const litDots = Math.ceil((level / 100) * NUM_DOTS);

  const dots = Array.from({ length: NUM_DOTS }, (_, i) => {
    const dotIndex = i;
    const isLit = dotIndex < litDots;

    // Determina el color del punto
    let colorClass = 'bg-input'; // Color apagado
    if (isLit) {
      if (dotIndex < NUM_DOTS * 0.6) {
        colorClass = 'bg-green-500/80 shadow-[0_0_2px_rgba(34,197,94,0.5)]'; // Verde
      } else if (dotIndex < NUM_DOTS * 0.85) {
        colorClass = 'bg-yellow-500/80 shadow-[0_0_2px_rgba(234,179,8,0.5)]'; // Amarillo
      } else {
        colorClass = 'bg-destructive/80 shadow-[0_0_2px_rgba(239,68,68,0.5)]'; // Rojo
      }
    }

    return (
      <div
        key={dotIndex}
        className={cn('h-1 w-1.5 rounded-sm transition-colors duration-75', colorClass)}
      />
    );
  });

  return (
    <div className="absolute top-0 right-1 h-full w-2 flex flex-col-reverse justify-between items-center py-2 pointer-events-none">
      {dots}
    </div>
  );
});

VuMeter.displayName = 'VuMeter';

export default VuMeter;
