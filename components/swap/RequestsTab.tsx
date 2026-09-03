"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Modal } from "@/components/ui/Modal";
import { AttendedFormalsSection } from "./listings-hub/AttendedFormalsSection";
import { ListFormalForm } from "./ListFormalForm";
import { ListingsHubNav } from "./listings-hub/ListingsHubNav";
import { ListingsOverview } from "./listings-hub/ListingsOverview";
import { MyListingsSection } from "./listings-hub/MyListingsSection";
import { PayRequestsSection } from "./listings-hub/PayRequestsSection";
import { useListingsHubData } from "./listings-hub/useListingsHubData";
import { useListingsSection } from "./listings-hub/useListingsSection";

export function RequestsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { createListing, getUser, getListing, withdrawRequest } = useData();
  const { section, setSection } = useListingsSection();
  const data = useListingsHubData();

  const [listFormalOpen, setListFormalOpen] = useState(false);
  const shouldOpenListModal = searchParams.get("openList") === "1";

  useEffect(() => {
    if (!shouldOpenListModal) return;
    setListFormalOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("openList");
    params.set("tab", "requests");
    params.set("section", "listings");
    const qs = params.toString();
    router.replace(`/?${qs}`, { scroll: false });
  }, [shouldOpenListModal, router, searchParams]);

  if (!user) return null;

  const navCounts = {
    myListings: data.myListingsUnreadCount,
    pay: data.pendingPayRequestCount,
    attended: data.attendedUnreadCount,
    overviewAttention: data.overviewAttentionCount,
  };

  return (
    <>
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
        >
          <span aria-hidden>‹</span> Back to feed
        </Link>
        <h1 className="mt-2 font-display text-3xl uppercase tracking-wide sm:text-4xl">
          Your formals
        </h1>
      </div>
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <ListingsHubNav
          section={section}
          onSectionChange={setSection}
          counts={navCounts}
        />

        <div className="min-w-0 flex-1">
          {section === "overview" ? (
            <ListingsOverview
              myActiveCount={data.myActiveListings.length}
              totalPendingIncoming={data.totalPendingIncoming}
              payRequestCount={data.myPayRequests.length}
              formalsToReviewCount={data.formalsToReviewCount}
              listingsNeedingAttendance={data.listingsNeedingAttendance}
              listingsNeedingReview={data.listingsNeedingReview}
              listingsNeedingRequests={data.listingsNeedingRequests}
              hasNeedsAttention={data.hasNeedsAttention}
              onListFormal={() => setListFormalOpen(true)}
            />
          ) : null}

          {section === "listings" ? (
            <MyListingsSection
              user={user}
              myActiveListings={data.myActiveListings}
              myBookedListings={data.myBookedListings}
              pendingCountByListing={data.pendingCountByListing}
              pendingReviewSet={data.pendingReviewSet}
              getUser={getUser}
              onListFormal={() => setListFormalOpen(true)}
            />
          ) : null}

          {section === "pay" ? (
            <PayRequestsSection
              myPayRequests={data.myPayRequests}
              getUser={getUser}
              getListing={getListing}
              onWithdraw={(requestId) => withdrawRequest(requestId)}
            />
          ) : null}

          {section === "attended" ? (
            <AttendedFormalsSection
              attendedPastListings={data.attendedPastListings}
              pendingReviewSet={data.pendingReviewSet}
              pendingAttendanceSet={data.pendingAttendanceSet}
              getUser={getUser}
            />
          ) : null}
        </div>
      </div>

      <Modal
        open={listFormalOpen}
        onClose={() => setListFormalOpen(false)}
        panelClassName="!max-w-[min(48rem,calc(100vw-1.5rem))]"
        bodyScrollable={false}
      >
        <ListFormalForm
          embedded
          profile={{
            college: user.college,
            year: user.year,
            role: user.role,
          }}
          onSubmit={(input) => {
            const created = createListing(input);
            if (created) setListFormalOpen(false);
          }}
        />
      </Modal>
    </>
  );
}
