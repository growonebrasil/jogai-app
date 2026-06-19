import { cn } from "@/lib/utils";
import logoImg from "@/assets/logo-jogai.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizes = {
    sm: "h-9",
    md: "h-12",
    lg: "h-[4.5rem]",
    xl: "h-28",
  };

  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={logoImg}
        alt="JOGAI"
        className={cn("object-contain", sizes[size])}
      />
    </div>
  );
}
