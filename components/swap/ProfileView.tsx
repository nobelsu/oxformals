"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Avatar, PRESET_AVATARS, PresetAvatarIcon, initialsFor } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { SketchCard } from "@/components/ui/SketchCard";
import { ListingCard } from "@/components/swap/ListingCard";
import { ListingDetailModal } from "@/components/swap/ListingDetailModal";
import { DEFAULT_UI_FONT } from "@/convex/uiFont";
import type { AvatarSource } from "@/lib/auth/types";
import type { Listing } from "@/lib/data/types";
import { formatYearLabel } from "@/lib/data/format";

function mapProfileListing(doc: {
  _id: string;
  _creationTime: number;
  ownerUserId: string;
  college: string;
  dateTime: string;
  groupSize: 2 | 3 | 4;
  seatsAvailable: number;
  members: string[];
  year: string;
  role: string;
  message: string;
  menu?: string;
  status: "active" | "confirmed" | "closed";
}): Listing {
  return {
    id: doc._id,
    ownerUserId: doc.ownerUserId,
    college: doc.college,
    dateTime: doc.dateTime,
    groupSize: doc.groupSize,
    seatsAvailable: doc.seatsAvailable,
    members: doc.members,
    year: doc.year,
    role: doc.role,
    message: doc.message,
    menu: doc.menu ?? "",
    status: doc.status,
    createdAt: doc._creationTime,
  };
}

function AvatarLightbox({
  source,
  name,
  onClose,
}: {
  source?: AvatarSource;
  name: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const largeCls =
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_18%,var(--bg))] text-[var(--ink-muted)] border-[3px] border-[var(--ink)] h-56 w-56 text-5xl";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[var(--ink)]/30 backdrop-blur-sm" />
      <div
        className={largeCls}
        onClick={(e) => e.stopPropagation()}
      >
        {source?.kind === "image" ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={source.dataUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : source?.kind === "preset" &&
          PRESET_AVATARS.some((p) => p.id === source.id) ? (
          <PresetAvatarIcon id={source.id} className="h-[1em] w-[1em] text-7xl" />
        ) : (
          <span className="select-none">{initialsFor(name)}</span>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ProfileView({ userId }: { userId: string }) {
  const { user: currentUser } = useAuth();
  const { getUser } = useData();
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const closeAvatar = useCallback(() => setAvatarOpen(false), []);

  const profile = useQuery(api.users.getPublicProfile, {
    userId: userId as Id<"users">,
  });

  if (profile === undefined) {
    return (
      <main className="mx-auto flex min-h-[50vh] w-full max-w-5xl items-center justify-center px-4 py-8 sm:px-6">
        <span className="inline-flex items-center gap-3 rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-6 py-3 text-base text-[var(--ink)]">
          <span
            aria-hidden="true"
            className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--ink-soft)] border-t-[var(--ink)]"
          />
          Loading...
        </span>
      </main>
    );
  }

  if (profile === null) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <SketchCard seed={3} className="p-8">
          <h2 className="font-display text-3xl uppercase tracking-wide">
            User not found
          </h2>
          <p className="mt-2 text-[var(--ink-muted)]">
            This profile does not exist.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            Back to Browse
          </Link>
        </SketchCard>
      </main>
    );
  }

  const { user: profileUser, listings: rawListings } = profile;
  const name = profileUser.name ?? "Anonymous";
  const college = profileUser.college ?? "";
  const year = profileUser.year ?? "";
  const role = profileUser.role ?? "";
  const interests = profileUser.interests ?? [];
  const instagramHandle = (profileUser.instagramHandle ?? "").replace(/^@+/, "");
  const whatsappPhone = (profileUser.whatsappPhone ?? "").trim();
  const dietaryRequirements = (profileUser.dietaryRequirements ?? "").trim();
  const subject = (profileUser.subject ?? "").trim();
  const avatar = profileUser.avatar as AvatarSource | undefined;

  const profileLine = [
    college,
    formatYearLabel(year) || year,
    role,
  ]
    .filter(Boolean)
    .join(" · ");

  const isOwnProfile = currentUser?.id === userId;
  const activeListings = rawListings.map(mapProfileListing);

  const ownerAsUser = {
    id: profileUser._id,
    email: "",
    name,
    college,
    year,
    role,
    interests,
    subject,
    uiFont: profileUser.uiFont ?? DEFAULT_UI_FONT,
    avatar,
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          Back to Browse
        </Link>
      </div>

      <SketchCard seed={userId.length} className="p-6">
        <div className="flex items-center gap-5">
          <div
            role="button"
            tabIndex={0}
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => setAvatarOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setAvatarOpen(true);
              }
            }}
            aria-label={`View ${name}'s avatar`}
          >
            <Avatar name={name} size="xl" source={avatar} />
          </div>
          {avatarOpen && (
            <AvatarLightbox source={avatar} name={name} onClose={closeAvatar} />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl uppercase tracking-wide">
              {name}
            </h1>
            {profileLine && (
              <p className="mt-1 text-[var(--ink-muted)]">{profileLine}</p>
            )}
          </div>
          {(instagramHandle || whatsappPhone) && (
            <div className="flex shrink-0 items-center gap-2">
              {instagramHandle && (
                <a
                  href={`https://instagram.com/${instagramHandle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 items-center gap-1.5 rounded-full border-[2px] border-[var(--ink)] px-3 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="5" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                  @{instagramHandle}
                </a>
              )}
              {whatsappPhone && (
                <a
                  href={`https://wa.me/${whatsappPhone.replace(/[^\d+]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 items-center gap-1.5 rounded-full border-[2px] border-[var(--ink)] px-3 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  {whatsappPhone}
                </a>
              )}
            </div>
          )}
        </div>

        {interests.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {interests.map((tag) => (
              <Chip key={tag} size="md" as="span">
                {tag}
              </Chip>
            ))}
          </div>
        )}

        {dietaryRequirements && (
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            <span className="font-medium text-[var(--ink)]">Allergens / Dietary requirements:</span>{" "}
            {dietaryRequirements}
          </p>
        )}

        {subject && (
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            <span className="font-medium text-[var(--ink)]">Subject:</span>{" "}
            {subject}
          </p>
        )}

        {isOwnProfile && (
          <Link
            href="/?tab=mine"
            className="mt-5 inline-flex rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            Edit profile
          </Link>
        )}
      </SketchCard>

      <section>
        <h2 className="font-display text-3xl uppercase tracking-wide">
          Active listings
        </h2>
        {activeListings.length === 0 ? (
          <p className="mt-2 text-[var(--ink-muted)]">
            {isOwnProfile
              ? "You don\u2019t have any active listings."
              : `${name.split(" ")[0]} doesn\u2019t have any active listings right now.`}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeListings.map((l) => {
              const members = l.members
                .filter((mid) => mid !== l.ownerUserId)
                .map(getUser)
                .filter((u): u is NonNullable<typeof u> => !!u);
              return (
                <ListingCard
                  key={l.id}
                  listing={l}
                  owner={ownerAsUser}
                  memberUsers={members}
                  onPress={() => setDetailListing(l)}
                  disabled={isOwnProfile || !currentUser}
                  hideInterests
                  disabledLabel={
                    isOwnProfile
                      ? "Your listing"
                      : !currentUser
                        ? "Sign in to request"
                        : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <ListingDetailModal
        open={!!detailListing}
        onClose={() => setDetailListing(null)}
        listing={detailListing}
        owner={detailListing ? ownerAsUser : null}
        memberUsers={
          detailListing
            ? detailListing.members
                .filter((mid) => mid !== detailListing.ownerUserId)
                .map(getUser)
                .filter((u): u is NonNullable<typeof u> => !!u)
            : []
        }
        disabled={isOwnProfile || !currentUser}
        hideInterests
        disabledLabel={
          isOwnProfile
            ? "Your listing"
            : !currentUser
              ? "Sign in to request"
              : undefined
        }
      />
    </main>
  );
}
