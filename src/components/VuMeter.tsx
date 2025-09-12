
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface VuMeterProps {
  level: number; // Nivel de 0 a 100
}

const NUM_DOTS = 16; // Número total de "LEDs" en el vúmetro

const VuMeter: React.FC<VuMeterProps> = ({ level }) => {
  // Calcula cuántos puntos deben estar encendidos
  const litDots = Math.ceil((level / 100) * NUM_DOTS);

  const dots = Array.from({ length: NUM_DOTS }, (_, i) => {
    const dotIndex = i;
    const isLit = dotIndex < litDots;

    // Determina el color del punto
    let colorClass = 'bg-secondary/30'; // Color apagado
    if (isLit) {
      if (dotIndex < NUM_DOTS * 0.6) {
        colorClass = 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.7)]'; // Verde
      } else if (dotIndex < NUM_DOTS * 0.85) {
        colorClass = 'bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.7)]'; // Amarillo
      } else {
        colorClass = 'bg-destructive shadow-[0_0_4px_rgba(239,68,68,0.7)]'; // Rojo
      }
    }

    return (
      <div
        key={dotIndex}
        className={cn('h-1.5 w-1.5 rounded-full transition-colors duration-75', colorClass)}
      />
    );
  });

  return (
    <div className="h-40 w-4 flex flex-col-reverse justify-start items-center gap-y-1 py-1">
      {dots}
    </div>
  );
};

export default VuMeter;
