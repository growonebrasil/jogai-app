import { cn } from "@/lib/utils";

interface PageBackgroundProps {
  image: string;
  children: React.ReactNode;
  className?: string;
  overlay?: "heavy" | "medium" | "light";
}

export function PageBackground({ image, children, className, overlay = "heavy" }: PageBackgroundProps) {
  const overlayOpacity = {
    heavy: "bg-background/85",
    medium: "bg-background/75",
    light: "bg-background/65",
  };

  return (
    <div className={cn("relative min-h-full", className)}>
      {/* Background image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${image})` }}
      />
      {/* Overlay */}
      <div className={cn("fixed inset-0 z-0", overlayOpacity[overlay])} />
      {/* Gradient vignette */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-background via-transparent to-background/50" />
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
