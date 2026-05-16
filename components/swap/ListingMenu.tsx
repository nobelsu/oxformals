import {
  isMenuImageContentType,
  menuFileLabel,
} from "@/lib/upload/menuFile";

type Props = {
  menu?: string;
  menuPdfUrl?: string;
  menuFileContentType?: string;
  className?: string;
  textClassName?: string;
  linkClassName?: string;
  imageClassName?: string;
};

export function hasListingMenu(
  menu?: string,
  menuPdfUrl?: string,
): boolean {
  return !!(menu?.trim() || menuPdfUrl);
}

export function ListingMenu({
  menu,
  menuPdfUrl,
  menuFileContentType,
  className = "text-sm text-[var(--ink-muted)]",
  textClassName,
  linkClassName = "underline underline-offset-2 hover:text-[var(--ink)]",
  imageClassName = "mt-1 max-h-40 max-w-full rounded-[12px] border-[2px] border-[var(--ink)] object-contain",
}: Props) {
  const menuText = menu?.trim();
  const hasText = !!menuText;
  const hasFile = !!menuPdfUrl;
  const isImage = isMenuImageContentType(menuFileContentType);

  if (!hasText && !hasFile) return null;

  return (
    <div className={className}>
      {hasText ? (
        <p className={textClassName}>
          <span className="font-semibold">Menu:</span> {menuText}
        </p>
      ) : null}
      {hasFile ? (
        <div className={hasText ? "mt-1" : undefined}>
          {!hasText ? <span className="font-semibold">Menu: </span> : null}
          {isImage ? (
            <a
              href={menuPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={menuPdfUrl}
                alt="Menu"
                className={imageClassName}
              />
            </a>
          ) : (
            <a
              href={menuPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName}
            >
              View menu ({menuFileLabel(menuFileContentType)})
            </a>
          )}
        </div>
      ) : null}
    </div>
  );
}
