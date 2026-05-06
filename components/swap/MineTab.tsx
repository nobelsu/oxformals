"use client";

import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { ProfileEditor } from "./ProfileEditor";
import { WishlistChips } from "./WishlistChips";

export function MineTab() {
  const { user } = useAuth();
  const { wishlist, toggleWishlist } = useData();

  if (!user) return null;

  return (
    <div className="flex flex-col gap-10">
      <ProfileEditor />

      <WishlistChips selected={wishlist} onToggle={toggleWishlist} />
    </div>
  );
}
