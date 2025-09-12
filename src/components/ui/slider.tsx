
"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { rangeClassName?: string, thumbClassName?: string }
>(({ className, orientation = 'horizontal', rangeClassName, thumbClassName, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    orientation={orientation}
    className={cn(
      "relative flex touch-none select-none items-center group",
      orientation === 'horizontal' && 'h-5 w-full',
      orientation === 'vertical' && 'h-full w-5 flex-col items-center', // Wider for retro feel
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className={cn(
        "relative grow overflow-hidden rounded-sm bg-input", // Less rounded, darker background
        orientation === 'horizontal' && 'h-1.5 w-full',
        orientation === 'vertical' && 'h-full w-1.5'
    )}>
      <SliderPrimitive.Range className={cn(
          "absolute bg-primary",
          orientation === 'horizontal' && 'h-full',
          orientation === 'vertical' && 'w-full bottom-0',
          rangeClassName
      )} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className={cn(
      "block h-6 w-4 rounded-sm border-2 border-border bg-accent ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-md",
      "data-[orientation=horizontal]:h-4 data-[orientation=horizontal]:w-6",
      thumbClassName
      )} />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }

    