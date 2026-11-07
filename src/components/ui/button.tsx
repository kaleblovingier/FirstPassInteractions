import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[opacity,transform,background-color,color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98] pointer-coarse:min-h-11",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-fg shadow-[var(--shadow-border)] hover:opacity-90",
        secondary:
          "bg-surface text-fg shadow-[var(--shadow-border)] hover:bg-surface-2",
        ghost: "bg-transparent text-fg hover:bg-bg-sunken",
        outline: "bg-transparent text-fg shadow-[var(--shadow-border)] hover:bg-surface",
        danger: "bg-danger text-accent-fg hover:opacity-90",
      },
      size: {
        default: "h-11 rounded-md px-4 text-sm",
        sm: "h-9 rounded-sm px-3 text-sm",
        lg: "h-12 rounded-md px-5 text-sm",
        icon: "size-11 rounded-md pointer-coarse:min-w-11",
        "icon-sm": "size-9 rounded-sm pointer-coarse:min-w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
