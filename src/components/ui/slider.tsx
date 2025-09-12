
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
            "block h-5 w-10 rounded-sm border-t-2 border-border bg-secondary shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            "hover:bg-accent cursor-pointer",
            thumbClassName
        )}
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
