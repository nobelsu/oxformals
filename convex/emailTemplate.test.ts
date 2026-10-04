import { describe, expect, test } from "vitest";
import { newRequestEmail, reviewReminderEmail } from "./emails";
import { EMAIL_SITE_URL, renderEmail, renderEmailText } from "./emailTemplate";
import { otpEmail } from "./ResendOTP";

const base = { eyebrow: "New request", heading: "Tom wants a seat at your formal" };

describe("renderEmail", () => {
  test("escapes user text everywhere it appears", () => {
    const html = renderEmail({
      eyebrow: "<b>eye</b>",
      heading: 'Tom "<script>alert(1)</script>"',
      body: "a & b",
      ticket: { college: "<img src=x>", when: "Thu <9>", tag: "<i>", quote: "</td><script>x</script>" },
      cta: { href: 'https://x.test/?a=1&b="2"', label: "<Go>" },
      note: "<note>",
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x>");
    expect(html).not.toContain("<b>eye</b>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("a &amp; b");
    expect(html).toContain('href="https://x.test/?a=1&amp;b=&quot;2&quot;"');
    expect(html).toContain("&lt;Go&gt;");
  });

  test("shows the crest and name images for a known college", () => {
    const html = renderEmail({ ...base, ticket: { college: "St John's", when: "Thu 9 Oct · 7:15pm", tag: "Swap" } });
    expect(html).toContain(`${EMAIL_SITE_URL}/email/crest/st-johns.png`);
    expect(html).toMatch(/src="[^"]*\/email\/name\/st-johns\.png" width="\d+" height="25" alt="St John&#39;s"/);
    expect(html).toContain("Thu 9 Oct · 7:15pm");
    expect(html).toContain(">Swap</span>");
  });

  test("matches college names case-insensitively", () => {
    expect(renderEmail({ ...base, ticket: { college: "keble" } })).toContain("/email/crest/keble.png");
  });

  test("falls back to text, with no crest, for an unknown college", () => {
    const html = renderEmail({ ...base, ticket: { college: "Hogwarts", when: "Fri" } });
    expect(html).not.toContain("/email/crest/");
    expect(html).not.toContain("/email/name/");
    expect(html).toContain("Hogwarts");
  });

  test("renders a sign-in code box instead of a ticket", () => {
    const html = renderEmail(otpEmail({ token: "482913", expiresInMinutes: 10 }));
    expect(html).toMatch(/monospace[^>]*>482913<\/div>/);
    expect(html).toContain("Expires in 10 minutes.");
    expect(html).not.toContain("/email/crest/");
  });

  test("has the logo, footer settings link and team address, and no web fonts", () => {
    const html = renderEmail(base);
    expect(html).toContain(`${EMAIL_SITE_URL}/email/logo.png`);
    expect(html).toContain(`${EMAIL_SITE_URL}/email/squiggle.png`);
    expect(html).toContain(`href="${EMAIL_SITE_URL}/settings?section=notifications"`);
    expect(html).toContain(">Email settings</a>");
    expect(html).toContain('href="mailto:team@oxformals.com"');
    expect(html).not.toContain("fonts.googleapis.com");
  });

  test("uses the given site URL for images and links", () => {
    const html = renderEmail({ ...base, ticket: { college: "Keble" } }, { siteUrl: "file:///preview" });
    expect(html).toContain("file:///preview/email/crest/keble.png");
    expect(html).not.toContain(EMAIL_SITE_URL);
  });

  test("renders primary and secondary buttons", () => {
    const html = renderEmail({
      ...base,
      cta: { href: "https://a.test", label: "I'm in" },
      secondary: { href: "https://b.test", label: "Not me" },
    });
    expect(html).toContain("I&#39;m in</a>&nbsp;&nbsp;<a");
    expect(html).toContain(">Not me</a>");
  });
});

describe("renderEmailText", () => {
  test("carries the same content, unescaped", () => {
    const text = renderEmailText(
      newRequestEmail({
        requesterName: "Tom",
        seats: 1,
        college: "Keble",
        when: "Thu 9 Oct · 7:15pm",
        tag: "Swap",
        detail: "",
        message: "Happy to host you at Worcester & more",
        reviewUrl: "https://oxformals.vercel.app/requests/1",
      }),
    );
    expect(text).toContain("Tom wants a seat at your formal");
    expect(text).toContain("Keble · Thu 9 Oct · 7:15pm");
    expect(text).toContain('"Happy to host you at Worcester & more"');
    expect(text).toContain("Review request: https://oxformals.vercel.app/requests/1");
    expect(text).toContain("Email settings: https://oxformals.vercel.app/settings?section=notifications");
  });

  test("review reminder copy", () => {
    const content = reviewReminderEmail({ college: "Keble", day: "Thu 9 Oct", reviewUrl: "https://x.test" });
    expect(content.heading).toBe("How was Keble?");
    expect(renderEmailText(content)).toContain("Rate formal: https://x.test");
  });
});
