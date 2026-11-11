import Image from "next/image";

function isGoogleAvatar(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".googleusercontent.com");
  } catch {
    return false;
  }
}

/** Round avatar: the profile photo when there is one we can load, otherwise an initial on brushed metal. */
export function Avatar({ name, image, size = 32 }: { name?: string | null; image?: string | null; size?: number }) {
  const initial = (name?.trim()[0] ?? "").toUpperCase();
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-surface-2 font-semibold text-silver-hi"
    >
      {isGoogleAvatar(image) ? (
        <Image src={image} alt="" width={size} height={size} unoptimized referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      ) : initial ? (
        initial
      ) : (
        <svg viewBox="0 0 24 24" className="h-[58%] w-[58%] text-muted" fill="currentColor">
          <circle cx="12" cy="8.5" r="4" />
          <path d="M4 20.5c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5z" />
        </svg>
      )}
    </span>
  );
}
