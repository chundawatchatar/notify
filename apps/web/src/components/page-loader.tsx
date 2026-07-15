import { NotifyLogoMark } from "@notify/ui";

function PageLoader({ label }: Readonly<{ label: string }>) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <div aria-live="polite" className="relative grid size-20 place-items-center" role="status">
        <span
          aria-hidden="true"
          className="absolute inset-2 rounded-2xl border border-primary/30 motion-safe:animate-ping"
        />
        <NotifyLogoMark
          aria-hidden="true"
          className="relative size-12 shadow-sm motion-safe:animate-pulse"
        />
        <span className="sr-only">{label}</span>
      </div>
    </main>
  );
}

export { PageLoader };
