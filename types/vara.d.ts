declare module "vara" {
  interface VaraTextOptions {
    text: string;
    fontSize?: number;
    strokeWidth?: number;
    color?: string;
    duration?: number;
    textAlign?: "left" | "center" | "right";
    x?: number;
    y?: number;
    autoAnimation?: boolean;
    queued?: boolean;
    delay?: number;
    letterSpacing?: number | { global?: number };
  }
  interface VaraOptions {
    fontSize?: number;
    strokeWidth?: number;
    color?: string;
    duration?: number;
    textAlign?: "left" | "center" | "right";
    autoAnimation?: boolean;
  }
  export default class Vara {
    constructor(
      selector: string,
      fontUrl: string,
      text: VaraTextOptions[],
      options?: VaraOptions,
    );
    ready(cb: () => void): void;
    draw(name?: string): void;
    animationEnd(cb: (name: string, obj: unknown) => void): void;
  }
}
