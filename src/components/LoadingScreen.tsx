import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";

interface LoadingScreenProps {
  isVisible: boolean;
  onComplete: () => void;
}

export function LoadingScreen({ isVisible, onComplete }: LoadingScreenProps) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Particle field */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: Math.random() * 3 + 1,
                  height: Math.random() * 3 + 1,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  background: i % 3 === 0
                    ? "hsl(var(--primary))"
                    : "hsl(0 0% 100% / 0.3)",
                }}
                animate={{
                  y: [0, -40, 0],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: Math.random() * 2 + 1.5,
                  repeat: Infinity,
                  delay: Math.random() * 1.5,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          {/* Radial glow behind logo */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 300,
              height: 300,
              background: "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
            }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Logo size="xl" />
          </motion.div>

          {/* Loading ring */}
          <motion.div
            className="mt-8 relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" className="animate-spin" style={{ animationDuration: "1.5s" }}>
              <circle
                cx="24" cy="24" r="20"
                stroke="hsl(var(--muted))"
                strokeWidth="2"
                fill="none"
              />
              <circle
                cx="24" cy="24" r="20"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                fill="none"
                strokeDasharray="40 86"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>

          {/* Loading text */}
          <motion.p
            className="mt-4 text-sm text-muted-foreground font-display tracking-widest uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.6, 1] }}
            transition={{ delay: 0.5, duration: 2, repeat: Infinity }}
          >
            Preparando sua pelada...
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
