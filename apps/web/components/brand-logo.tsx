import Image from "next/image";
import { cn } from "@workspace/ui/lib/utils";

export function BrandLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2", className)}>
      <Image src="/images/biodentis-mark.png" alt={compact ? "Biodentis" : ""} width={36} height={36} className="size-9 shrink-0 rounded-lg" />
      {!compact && <span className="text-lg font-semibold tracking-tight">BIODENTIS</span>}
    </span>
  );
}
