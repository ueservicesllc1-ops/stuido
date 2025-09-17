
"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

// Componente para las marcas del fader
const FaderMarks = React.memo(() => (
  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px h-full">
    {Array.from({ length: 11 }).map((_, i) => {
      const isMajorTick = i % 5 === 0;
      return (
        <div
          key={i}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 bg-muted-foreground/30",
            isMajorTick ? "w-2 h-px" : "w-1 h-px"
          )}
          style={{ top: `${i * 10}%` }}
        />
      );
    })}
    <div className="absolute top-1/2 -left-4 text-[8px] text-muted-foreground/70">0</div>
    <div className="absolute top-0 -left-5 text-[8px] text-muted-foreground/70">+10</div>
     <div className="absolute bottom-0 -left-5 text-[8px] text-muted-foreground/70">-dB</div>
  </div>
));
FaderMarks.displayName = "FaderMarks";


const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { 
    rangeClassName?: string, 
    thumbClassName?: string,
    trackClassName?: string,
  }
>(({ className, orientation = 'horizontal', ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    orientation={orientation}
    className={cn(
      "relative flex touch-none select-none items-center group",
      orientation === 'horizontal' ? 'h-5 w-full' : 'h-full w-full flex-col',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className={cn(
        "relative grow overflow-visible",
        orientation === 'horizontal' ? 'h-0.5 w-full' : 'h-full w-0.5 bg-input',
    )}>
        {orientation === 'vertical' && <FaderMarks />}
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb 
        className={cn(
          "block h-1 w-12 rounded-sm bg-slider-thumb bg-cover bg-center cursor-pointer relative",
          "ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        )}
    >
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-white/0" />
        <div className="absolute inset-x-0 top-[calc(50%-1px)] h-px bg-amber-400/80 shadow-[0_0_2px_theme(colors.amber.400)]" />
    </SliderPrimitive.Thumb>
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
