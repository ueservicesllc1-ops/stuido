
"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { 
    rangeClassName?: string, 
    thumbClassName?: string,
    trackClassName?: string,
  }
>(({ className, orientation = 'horizontal', rangeClassName, thumbClassName, trackClassName, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    orientation={orientation}
    className={cn(
      "relative flex touch-none select-none items-center group",
      orientation === 'horizontal' && 'h-5 w-full',
      orientation === 'vertical' && 'h-full w-full flex-col',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className={cn(
        "relative grow overflow-hidden rounded-full bg-transparent",
        orientation === 'horizontal' && 'h-1.5 w-full',
        orientation === 'vertical' && 'h-full w-1.5',
        trackClassName
    )}>
      <SliderPrimitive.Range className={cn(
          "absolute bg-primary",
          orientation === 'horizontal' && 'h-full',
          orientation === 'vertical' && 'w-full bottom-0',
          rangeClassName
      )} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb 
        className={cn(
            "block h-8 w-10 rounded-sm border-none bg-black shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex items-center justify-center cursor-pointer",
            "hover:bg-gray-900",
            thumbClassName
        )}
    >
      <div className="w-8 h-0.5 bg-amber-400 rounded-full shadow-[0_0_3px_1px_rgba(251,191,36,0.5)]" />
    </SliderPrimitive.Thumb>
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
