
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
    ledClassName?: string,
    renderRange?: boolean,
  }
>(({ className, orientation = 'horizontal', rangeClassName, thumbClassName, trackClassName, ledClassName, renderRange = true, ...props }, ref) => (
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
        "relative grow overflow-hidden rounded-full",
        orientation === 'horizontal' && 'h-1 w-full bg-muted-foreground/30',
        orientation === 'vertical' && 'h-full w-1.5 bg-input',
        trackClassName
    )}>
      {orientation === 'vertical' && (
        <div className="absolute left-1/2 top-1/2 h-full w-px -translate-x-1/2 -translate-y-1/2 bg-muted-foreground/30" />
      )}
      {renderRange && (
          <SliderPrimitive.Range className={cn(
              "absolute bg-primary",
              orientation === 'horizontal' && 'h-full',
              orientation === 'vertical' && 'w-full bottom-0',
              rangeClassName
          )} />
      )}
       {!renderRange && orientation === 'horizontal' && (
        <div className="absolute left-1/2 top-1/2 h-full w-px -translate-x-1/2 -translate-y-1/2 bg-background/80" />
      )}
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb 
        className={cn(
          orientation === 'horizontal' 
            ? "block h-4 w-4 rounded-full border-2 border-background bg-foreground shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            : "relative z-10 block h-10 w-10 rounded-sm border-none bg-black shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex items-center justify-center cursor-pointer hover:bg-gray-900",
          thumbClassName
        )}
    >
      {orientation === 'vertical' && (
        <>
          <div className="flex flex-col w-8 h-full justify-center items-center gap-y-1">
            <div className="w-full h-px bg-muted-foreground/30" />
            <div className="w-full h-px bg-muted-foreground/30" />
            <div className="w-full h-px bg-muted-foreground/30" />
          </div>
          <div className={cn(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-px w-8 rounded-full",
              ledClassName || "bg-amber-400 shadow-[0_0_3px_1px] shadow-amber-400/50"
            )} 
          />
        </>
      )}
    </SliderPrimitive.Thumb>
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
