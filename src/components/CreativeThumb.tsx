// A creative cover image. Uses /api/thumb/<itemId> for Spark Ads; falls back to
// an initial-badge placeholder when no TikTok post id is available (e.g. mock).
export function CreativeThumb({
  itemId,
  name,
  className = "",
}: {
  itemId: string | null;
  name: string;
  className?: string;
}) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <div className={`relative overflow-hidden bg-surface-muted ${className}`}>
      {itemId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/thumb/${itemId}`}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-base font-semibold text-muted">
          {initial}
        </div>
      )}
    </div>
  );
}
