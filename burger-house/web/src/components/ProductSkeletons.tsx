type Props = { count?: number };

export function ProductSkeletons({ count = 8 }: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="surface-card overflow-hidden p-4">
          <div className="skeleton aspect-square w-full rounded-3xl" />
          <div className="mt-4 space-y-2.5">
            <div className="skeleton h-3.5 w-24 rounded-full" />
            <div className="skeleton h-4 w-3/4 rounded-full" />
            <div className="skeleton h-3 w-full rounded-full" />
            <div className="flex items-center justify-between pt-2">
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton size-10 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
