import type { ReactNode } from "react";

/**
 * Line icons for controls. Sized in em so they follow the button's font size,
 * and drawn (not typed) so they sit dead-centre in round buttons.
 */
function Icon({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] ${className}`}
    >
      {children}
    </svg>
  );
}

type P = { className?: string };

export const ChevronLeftIcon = (p: P) => (
  <Icon {...p}>
    <path d="m15 6-6 6 6 6" />
  </Icon>
);
export const ChevronRightIcon = (p: P) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);
export const ChevronDownIcon = (p: P) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
export const ArrowLeftIcon = (p: P) => (
  <Icon {...p}>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </Icon>
);
export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
export const PlusIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const MinusIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 12h14" />
  </Icon>
);
export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);
