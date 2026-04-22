import { ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WelcomeStep() {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-glow"
      >
        <ShieldCheck className="h-9 w-9" aria-hidden="true" />
      </motion.div>
      <h2 className="mt-8 text-5xl font-black tracking-tight text-foreground sm:text-7xl">Titan starts local.</h2>
      <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
        A premium setup without the account ceremony. Your profile, money context, and goals stay offline.
      </p>

      <div className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-lg border border-border/70 bg-border/70 text-left">
        {['Private', 'Offline', 'Fast'].map((label) => (
          <div key={label} className="bg-background/70 px-4 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
