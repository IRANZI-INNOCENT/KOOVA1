export default function HeroVisual() {
  return (
    <div className="overflow-hidden rounded-2xl border border-kova-border bg-kova-white">
      <div className="aspect-[4/3] bg-kova-background">
        <div className="flex h-full items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="mb-5 h-3 w-24 rounded-full bg-kova-border" />
            <div className="h-8 w-3/4 rounded-lg bg-kova-dark/10" />

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="aspect-[4/3] rounded-xl bg-white" />
              <div className="aspect-[4/3] rounded-xl bg-white" />
            </div>

            <div className="mt-4 h-24 rounded-xl bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}