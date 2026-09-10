export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-5 py-16 md:px-10">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton mt-6 h-14 w-2/3 max-w-xl" />
      <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index}>
            <div className="skeleton aspect-3/4 w-full" />
            <div className="skeleton mt-4 h-3.5 w-4/5" />
            <div className="skeleton mt-2.5 h-3 w-2/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
