type Props = {
  imageUrls: string[];
  className?: string;
  imageClassName?: string;
};

const defaultImageClassName =
  "max-h-40 max-w-full rounded-[12px] border-[2px] border-[var(--ink)] object-cover";

export function ReviewImageGallery({
  imageUrls,
  className = "mt-3 flex flex-wrap gap-2",
  imageClassName = defaultImageClassName,
}: Props) {
  if (imageUrls.length === 0) return null;

  return (
    <div className={className}>
      {imageUrls.map((url, index) => (
        <a
          key={`${url}-${index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Review photo ${index + 1}`} className={imageClassName} />
        </a>
      ))}
    </div>
  );
}
