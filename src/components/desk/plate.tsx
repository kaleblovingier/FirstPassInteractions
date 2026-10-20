import { cn } from "@/lib/utils";

export function Plate({
  src,
  alt,
  className,
  overlay,
}: {
  src: string;
  alt: string;
  className?: string;
  overlay?: boolean;
}) {
  return (
    <span className={cn("relative block overflow-hidden bg-bg-sunken", className)}>
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 size-full object-cover"
        draggable={false}
        loading="lazy"
        decoding="async"
      />
      {overlay ? <span className="absolute inset-0 bg-ink/20" /> : null}
    </span>
  );
}
