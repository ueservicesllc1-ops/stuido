import type { SVGProps } from "react";

export const Logo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 21v-7" />
    <path d="M4 8V3" />
    <path d="M12 21v-9" />
    <path d="M12 6V3" />
    <path d="M20 21v-5" />
    <path d="M20 10V3" />
    <path d="M2 14h4" />
    <path d="M10 12h4" />
    <path d="M18 16h4" />
  </svg>
);
