import { v } from "convex/values";
import { Resend as ResendAPI } from "resend";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { getReviewEligibility } from "./collegeReviewHelpers";
import { hasConfirmedAttendance } from "./formalAttendance";
import { emailNotificationsEnabled } from "./emailNotifications";
import { listingIsPast } from "./listingHelpers";
import { normalizeCollegeName } from "../lib/data/colleges";

function resolveRequestType(req: Doc<"requests">): "swap" | "pay" {
  return (
    req.requestType ?? (req.offeringListingId !== undefined ? "swap" : "pay")
  );
}

const APP_BASE_URL = "https://oxformals.vercel.app";

function siteUrl(): string {
  return APP_BASE_URL;
}

function formatListingDate(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const suffix = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  const time =
    minutes === "00" ? `${hours}${suffix}` : `${hours}:${minutes}${suffix}`;
  return `${day} · ${time}`;
}

function formatPrice(gbp: number): string {
  return `£${gbp}`;
}

function truncateMessage(message: string, maxLen = 200): string {
  const trimmed = message.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const newRequestEmailPayloadValidator = v.union(
  v.null(),
  v.object({
    toEmail: v.string(),
    subject: v.string(),
    requesterName: v.string(),
    requestTypeLabel: v.string(),
    formalLabel: v.string(),
    message: v.string(),
    reviewUrl: v.string(),
  }),
);

export const getNewRequestEmailPayload = internalQuery({
  args: { requestId: v.id("requests") },
  returns: newRequestEmailPayloadValidator,
  handler: async (ctx, args) => {
    const req = await ctx.db.get(args.requestId);
    if (!req || req.status !== "pending") {
      return null;
    }

    const toUser = await ctx.db.get(req.toUserId);
    const fromUser = await ctx.db.get(req.fromUserId);
    const targetListing = await ctx.db.get(req.targetListingId);
    if (!toUser?.email || !targetListing) {
      return null;
    }

    const requestType = resolveRequestType(req);
    const requesterName = fromUser?.name?.trim() || "Someone";
    const formalDate = formatListingDate(targetListing.dateTime);

    let requestTypeLabel: string;
    if (requestType === "pay") {
      requestTypeLabel =
        targetListing.price !== undefined
          ? `Pay request · ${formatPrice(targetListing.price)}`
          : "Pay request";
    } else if (req.offeringListingId) {
      const offering = await ctx.db.get(req.offeringListingId);
      requestTypeLabel = offering
        ? `Swap request · offering ${offering.college} · ${formatListingDate(offering.dateTime)}`
        : "Swap request";
    } else {
      requestTypeLabel = "Swap request";
    }

    const formalLabel = `${targetListing.college} · ${formalDate}`;
    const reviewUrl = `${siteUrl()}/requests/${req.targetListingId}`;

    return {
      toEmail: toUser.email.trim().toLowerCase(),
      subject: `New request for your ${targetListing.college} formal`,
      requesterName,
      requestTypeLabel,
      formalLabel,
      message: truncateMessage(req.message),
      reviewUrl,
    };
  },
});

function buildNewRequestEmailHtml(payload: {
  requesterName: string;
  requestTypeLabel: string;
  formalLabel: string;
  message: string;
  reviewUrl: string;
}): string {
  const messageBlock = payload.message
    ? `<p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#1b1a12;font-style:italic;">&ldquo;${escapeHtml(payload.message)}&rdquo;</p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>New formal request</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Schoolbell&amp;family=Space+Grotesk:wght@400;500;700&amp;display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0;padding:0;background:#f2ecdd;color:#1b1a12;font-family:'Space Grotesk',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f2ecdd;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border:2px solid #1b1a12;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 24px 10px 24px;text-align:center;">
                <div style="font-family:'Schoolbell','Marker Felt','Comic Sans MS','Space Grotesk',ui-sans-serif,sans-serif;font-size:34px;line-height:1.05;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">Oxformals</div>
                <p style="margin:10px 0 0 0;font-size:15px;line-height:1.6;color:#565039;">Find your next formal.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 0 24px;">
                <p style="margin:0;font-size:16px;line-height:1.6;color:#1b1a12;"><strong>${escapeHtml(payload.requesterName)}</strong> sent you a request for your formal.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 0 24px;">
                <div style="background:#f2c4cb;border:2px solid #1b1a12;border-radius:14px;padding:16px 14px;">
                  <p style="margin:0;font-size:14px;line-height:1.5;color:#565039;">${escapeHtml(payload.requestTypeLabel)}</p>
                  <p style="margin:8px 0 0 0;font-size:18px;line-height:1.4;font-weight:800;color:#1b1a12;">${escapeHtml(payload.formalLabel)}</p>
                  ${messageBlock}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 0 24px;text-align:center;">
                <a href="${escapeHtml(payload.reviewUrl)}" style="display:inline-block;background:#b8524c;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:12px 24px;border-radius:999px;border:2px solid #b8524c;">Review request</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 0 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#716b55;">You can accept or decline this request in Oxformals.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 24px 0 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#565039;">For inquiries or issues, contact us at <a href="mailto:team@oxformals.com" style="color:#1b1a12;font-weight:700;text-decoration:underline;">team@oxformals.com</a>.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px 28px 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#1b1a12;">See you at dinner,<br />The Oxformals Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildNewRequestEmailText(payload: {
  requesterName: string;
  requestTypeLabel: string;
  formalLabel: string;
  message: string;
  reviewUrl: string;
}): string {
  const messageLine = payload.message
    ? `\n\n"${payload.message}"`
    : "";

  return `${payload.requesterName} sent you a request for your formal.

${payload.requestTypeLabel}
${payload.formalLabel}${messageLine}

Review the request: ${payload.reviewUrl}

You can accept or decline this request in Oxformals.

For inquiries or issues, contact us at team@oxformals.com.

See you at dinner,
The Oxformals Team`;
}

export const sendNewRequestEmail = internalAction({
  args: { requestId: v.id("requests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payload: {
      toEmail: string;
      subject: string;
      requesterName: string;
      requestTypeLabel: string;
      formalLabel: string;
      message: string;
      reviewUrl: string;
    } | null = await ctx.runQuery(internal.emails.getNewRequestEmailPayload, {
      requestId: args.requestId,
    });

    if (!payload) {
      return null;
    }

    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      console.error("sendNewRequestEmail: AUTH_RESEND_KEY is not set");
      return null;
    }

    const resend = new ResendAPI(apiKey);
    const { error } = await resend.emails.send({
      from: "Oxformals <team@oxformals.com>",
      to: [payload.toEmail],
      subject: payload.subject,
      html: buildNewRequestEmailHtml(payload),
      text: buildNewRequestEmailText(payload),
    });

    if (error) {
      console.error("sendNewRequestEmail: Resend error", error);
    }

    return null;
  },
});

const listingAlertRecipientValidator = v.object({
  userId: v.id("users"),
  toEmail: v.string(),
});

const newListingAlertEmailPayloadValidator = v.union(
  v.null(),
  v.object({
    toEmail: v.string(),
    subject: v.string(),
    posterName: v.string(),
    listingTypeLabel: v.string(),
    formalLabel: v.string(),
    message: v.string(),
    browseUrl: v.string(),
  }),
);

function resolveListingType(
  listing: Pick<Doc<"listings">, "listingType">,
): "swap" | "pay" | "both" {
  return listing.listingType ?? "swap";
}

function formatListingTypeLabel(listing: Doc<"listings">): string {
  const listingType = resolveListingType(listing);
  if (listingType === "pay") {
    return listing.price !== undefined
      ? `Pay · ${formatPrice(listing.price)}`
      : "Pay";
  }
  if (listingType === "both") {
    const pricePart =
      listing.price !== undefined ? ` · ${formatPrice(listing.price)}` : "";
    return `Swap or pay${pricePart}`;
  }
  return "Swap";
}

function listingBrowseUrl(listingId: string): string {
  return `${siteUrl()}/?listing=${listingId}`;
}

export const getNewListingAlertRecipients = internalQuery({
  args: { listingId: v.id("listings") },
  returns: v.array(listingAlertRecipientValidator),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "active") {
      return [];
    }

    const rows = await ctx.db
      .query("collegeWishlists")
      .withIndex("by_college", (q) => q.eq("college", listing.college))
      .collect();

    const recipients: { userId: Doc<"users">["_id"]; toEmail: string }[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      if (row.userId === listing.ownerUserId) continue;
      if (seen.has(row.userId)) continue;

      const user = await ctx.db.get(row.userId);
      if (!user?.email?.trim()) continue;
      if (!emailNotificationsEnabled(user)) continue;

      seen.add(row.userId);
      recipients.push({
        userId: row.userId,
        toEmail: user.email.trim().toLowerCase(),
      });
    }

    return recipients;
  },
});

export const getNewListingAlertEmailPayload = internalQuery({
  args: {
    listingId: v.id("listings"),
    userId: v.id("users"),
  },
  returns: newListingAlertEmailPayloadValidator,
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "active") {
      return null;
    }

    const subscription = await ctx.db
      .query("collegeWishlists")
      .withIndex("by_userId_and_college", (q) =>
        q.eq("userId", args.userId).eq("college", listing.college),
      )
      .unique();
    if (!subscription) {
      return null;
    }

    const user = await ctx.db.get(args.userId);
    if (!user?.email?.trim() || !emailNotificationsEnabled(user)) {
      return null;
    }
    if (args.userId === listing.ownerUserId) {
      return null;
    }

    const owner = await ctx.db.get(listing.ownerUserId);
    const posterName = owner?.name?.trim() || "Someone";
    const formalLabel = `${listing.college} · ${formatListingDate(listing.dateTime)}`;

    return {
      toEmail: user.email.trim().toLowerCase(),
      subject: `New ${listing.college} formal on Oxformals`,
      posterName,
      listingTypeLabel: formatListingTypeLabel(listing),
      formalLabel,
      message: truncateMessage(listing.message),
      browseUrl: listingBrowseUrl(args.listingId),
    };
  },
});

function buildNewListingAlertEmailHtml(payload: {
  posterName: string;
  listingTypeLabel: string;
  formalLabel: string;
  message: string;
  browseUrl: string;
}): string {
  const messageBlock = payload.message
    ? `<p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#1b1a12;font-style:italic;">&ldquo;${escapeHtml(payload.message)}&rdquo;</p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>New formal listing</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Schoolbell&amp;family=Space+Grotesk:wght@400;500;700&amp;display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0;padding:0;background:#f2ecdd;color:#1b1a12;font-family:'Space Grotesk',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f2ecdd;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border:2px solid #1b1a12;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 24px 10px 24px;text-align:center;">
                <div style="font-family:'Schoolbell','Marker Felt','Comic Sans MS','Space Grotesk',ui-sans-serif,sans-serif;font-size:34px;line-height:1.05;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">Oxformals</div>
                <p style="margin:10px 0 0 0;font-size:15px;line-height:1.6;color:#565039;">Find your next formal.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 0 24px;">
                <p style="margin:0;font-size:16px;line-height:1.6;color:#1b1a12;"><strong>${escapeHtml(payload.posterName)}</strong> posted a new formal at a college on your wishlist.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 0 24px;">
                <div style="background:#f2c4cb;border:2px solid #1b1a12;border-radius:14px;padding:16px 14px;">
                  <p style="margin:0;font-size:14px;line-height:1.5;color:#565039;">${escapeHtml(payload.listingTypeLabel)}</p>
                  <p style="margin:8px 0 0 0;font-size:18px;line-height:1.4;font-weight:800;color:#1b1a12;">${escapeHtml(payload.formalLabel)}</p>
                  ${messageBlock}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 0 24px;text-align:center;">
                <a href="${escapeHtml(payload.browseUrl)}" style="display:inline-block;background:#b8524c;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:12px 24px;border-radius:999px;border:2px solid #b8524c;">View formal</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 0 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#716b55;">You received this because ${escapeHtml(payload.formalLabel.split(" · ")[0] ?? "this college")} is on your wishlist. Turn off email notifications in Settings.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 24px 0 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#565039;">For inquiries or issues, contact us at <a href="mailto:team@oxformals.com" style="color:#1b1a12;font-weight:700;text-decoration:underline;">team@oxformals.com</a>.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px 28px 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#1b1a12;">See you at dinner,<br />The Oxformals Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildNewListingAlertEmailText(payload: {
  posterName: string;
  listingTypeLabel: string;
  formalLabel: string;
  message: string;
  browseUrl: string;
}): string {
  const messageLine = payload.message ? `\n\n"${payload.message}"` : "";

  return `${payload.posterName} posted a new formal at a college on your wishlist.

${payload.listingTypeLabel}
${payload.formalLabel}${messageLine}

View the formal: ${payload.browseUrl}

You received this because this college is on your wishlist. Turn off email notifications in Settings.

For inquiries or issues, contact us at team@oxformals.com.

See you at dinner,
The Oxformals Team`;
}

export const notifyWishlistForNewListing = internalAction({
  args: { listingId: v.id("listings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const recipients: { userId: Doc<"users">["_id"]; toEmail: string }[] =
      await ctx.runQuery(internal.emails.getNewListingAlertRecipients, {
        listingId: args.listingId,
      });

    for (const recipient of recipients) {
      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendNewListingAlertEmail,
        {
          listingId: args.listingId,
          userId: recipient.userId,
        },
      );
    }

    return null;
  },
});

export const sendNewListingAlertEmail = internalAction({
  args: {
    listingId: v.id("listings"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payload: {
      toEmail: string;
      subject: string;
      posterName: string;
      listingTypeLabel: string;
      formalLabel: string;
      message: string;
      browseUrl: string;
    } | null = await ctx.runQuery(internal.emails.getNewListingAlertEmailPayload, {
      listingId: args.listingId,
      userId: args.userId,
    });

    if (!payload) {
      return null;
    }

    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      console.error("sendNewListingAlertEmail: AUTH_RESEND_KEY is not set");
      return null;
    }

    const resend = new ResendAPI(apiKey);
    const { error } = await resend.emails.send({
      from: "Oxformals <team@oxformals.com>",
      to: [payload.toEmail],
      subject: payload.subject,
      html: buildNewListingAlertEmailHtml(payload),
      text: buildNewListingAlertEmailText(payload),
    });

    if (error) {
      console.error("sendNewListingAlertEmail: Resend error", error);
    }

    return null;
  },
});

function listingReviewUrl(listingId: string): string {
  return `${siteUrl()}/requests/${listingId}`;
}

const reviewReminderRecipientValidator = v.object({
  userId: v.id("users"),
  toEmail: v.string(),
});

const reviewReminderEmailPayloadValidator = v.union(
  v.null(),
  v.object({
    toEmail: v.string(),
    subject: v.string(),
    formalLabel: v.string(),
    reviewUrl: v.string(),
  }),
);

async function isReviewReminderEligible(
  ctx: QueryCtx,
  listing: Doc<"listings">,
  userId: Id<"users">,
  nowMs: number,
): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user?.email?.trim() || !emailNotificationsEnabled(user)) {
    return false;
  }
  if (!listing.members.includes(userId)) {
    return false;
  }

  const home = normalizeCollegeName(user.college ?? "");
  const host = normalizeCollegeName(listing.college);
  if (home && host && home === host) {
    return false;
  }

  const confirmed = await hasConfirmedAttendance(ctx, listing._id, userId);
  const eligibility = getReviewEligibility(user, listing, userId, nowMs, {
    hasExistingReview: false,
    hasConfirmedAttendance: confirmed,
  });
  if (!eligibility.canReview) {
    return false;
  }

  return true;
}

export const getReviewReminderRecipients = internalQuery({
  args: { listingId: v.id("listings") },
  returns: v.array(reviewReminderRecipientValidator),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      return [];
    }

    const nowMs = Date.now();
    if (!listingIsPast(listing.dateTime, nowMs)) {
      return [];
    }

    const recipients: { userId: Id<"users">; toEmail: string }[] = [];
    const seen = new Set<string>();

    for (const memberId of listing.members) {
      if (seen.has(memberId)) continue;
      seen.add(memberId);

      const eligible = await isReviewReminderEligible(
        ctx,
        listing,
        memberId,
        nowMs,
      );
      if (!eligible) continue;

      const user = await ctx.db.get(memberId);
      if (!user?.email?.trim()) continue;

      const existing = await ctx.db
        .query("collegeReviews")
        .withIndex("by_listingId_and_userId", (q) =>
          q.eq("listingId", listing._id).eq("userId", memberId),
        )
        .unique();
      if (existing) continue;

      recipients.push({
        userId: memberId,
        toEmail: user.email.trim().toLowerCase(),
      });
    }

    return recipients;
  },
});

export const getReviewReminderEmailPayload = internalQuery({
  args: {
    listingId: v.id("listings"),
    userId: v.id("users"),
  },
  returns: reviewReminderEmailPayloadValidator,
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      return null;
    }

    const nowMs = Date.now();
    const eligible = await isReviewReminderEligible(
      ctx,
      listing,
      args.userId,
      nowMs,
    );
    if (!eligible) {
      return null;
    }

    const existing = await ctx.db
      .query("collegeReviews")
      .withIndex("by_listingId_and_userId", (q) =>
        q.eq("listingId", listing._id).eq("userId", args.userId),
      )
      .unique();
    if (existing) {
      return null;
    }

    const user = await ctx.db.get(args.userId);
    if (!user?.email?.trim()) {
      return null;
    }

    const formalLabel = `${listing.college} · ${formatListingDate(listing.dateTime)}`;

    return {
      toEmail: user.email.trim().toLowerCase(),
      subject: `Rate your ${listing.college} formal`,
      formalLabel,
      reviewUrl: listingReviewUrl(args.listingId),
    };
  },
});

function buildReviewReminderEmailHtml(payload: {
  formalLabel: string;
  reviewUrl: string;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rate your formal</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Schoolbell&amp;family=Space+Grotesk:wght@400;500;700&amp;display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0;padding:0;background:#f2ecdd;color:#1b1a12;font-family:'Space Grotesk',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f2ecdd;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border:2px solid #1b1a12;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 24px 10px 24px;text-align:center;">
                <div style="font-family:'Schoolbell','Marker Felt','Comic Sans MS','Space Grotesk',ui-sans-serif,sans-serif;font-size:34px;line-height:1.05;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">Oxformals</div>
                <p style="margin:10px 0 0 0;font-size:15px;line-height:1.6;color:#565039;">How was dinner?</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 0 24px;">
                <p style="margin:0;font-size:16px;line-height:1.6;color:#1b1a12;">Your formal has finished — share how it went so other students can discover great formals.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 0 24px;">
                <div style="background:#f2c4cb;border:2px solid #1b1a12;border-radius:14px;padding:16px 14px;">
                  <p style="margin:0;font-size:18px;line-height:1.4;font-weight:800;color:#1b1a12;">${escapeHtml(payload.formalLabel)}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 0 24px;text-align:center;">
                <a href="${escapeHtml(payload.reviewUrl)}" style="display:inline-block;background:#b8524c;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:12px 24px;border-radius:999px;border:2px solid #b8524c;">Rate formal</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 0 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#716b55;">Turn off email notifications in Settings if you prefer not to receive these reminders.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 24px 0 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#565039;">For inquiries or issues, contact us at <a href="mailto:team@oxformals.com" style="color:#1b1a12;font-weight:700;text-decoration:underline;">team@oxformals.com</a>.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px 28px 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#1b1a12;">See you at dinner,<br />The Oxformals Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildReviewReminderEmailText(payload: {
  formalLabel: string;
  reviewUrl: string;
}): string {
  return `Your formal has finished — share how it went so other students can discover great formals.

${payload.formalLabel}

Rate the formal: ${payload.reviewUrl}

Turn off email notifications in Settings if you prefer not to receive these reminders.

For inquiries or issues, contact us at team@oxformals.com.

See you at dinner,
The Oxformals Team`;
}

export const notifyReviewReminderForListing = internalAction({
  args: { listingId: v.id("listings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const recipients: { userId: Id<"users">; toEmail: string }[] =
      await ctx.runQuery(internal.emails.getReviewReminderRecipients, {
        listingId: args.listingId,
      });

    for (const recipient of recipients) {
      await ctx.scheduler.runAfter(0, internal.emails.sendReviewReminderEmail, {
        listingId: args.listingId,
        userId: recipient.userId,
      });
    }

    return null;
  },
});

export const sendReviewReminderEmail = internalAction({
  args: {
    listingId: v.id("listings"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payload: {
      toEmail: string;
      subject: string;
      formalLabel: string;
      reviewUrl: string;
    } | null = await ctx.runQuery(internal.emails.getReviewReminderEmailPayload, {
      listingId: args.listingId,
      userId: args.userId,
    });

    if (!payload) {
      return null;
    }

    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      console.error("sendReviewReminderEmail: AUTH_RESEND_KEY is not set");
      return null;
    }

    const resend = new ResendAPI(apiKey);
    const { error } = await resend.emails.send({
      from: "Oxformals <team@oxformals.com>",
      to: [payload.toEmail],
      subject: payload.subject,
      html: buildReviewReminderEmailHtml(payload),
      text: buildReviewReminderEmailText(payload),
    });

    if (error) {
      console.error("sendReviewReminderEmail: Resend error", error);
    }

    return null;
  },
});
