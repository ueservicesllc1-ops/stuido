
"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  // Se devuelve un div vacío para eliminar completamente la funcionalidad y apariencia del slider.
  return <div className="hidden" />;
});
Slider.displayName = "Slider"

export { Slider }

    