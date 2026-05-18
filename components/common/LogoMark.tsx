import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type LogoMarkProps = {
  className?: string;
  priority?: boolean;
};

export function LogoMark({ className, priority = false }: LogoMarkProps) {
  return (
    <Image
      alt="ClubX"
      className={cn("h-auto w-36 rounded-xl bg-white px-3 py-2 shadow-sm", className)}
      height={98}
      priority={priority}
      src="/clubx-logo.svg"
      width={386}
    />
  );
}
