/// <reference types="vite/client" />
import { afterEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "./_generated/api";
import { bioFromInterests, normalizeBio } from "./bio";
import { moderateText } from "./moderation";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

function stubModeration(response: { ok: boolean; flagged?: boolean }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      response.ok
        ? new Response(
            JSON.stringify({ results: [{ flagged: response.flagged ?? false }] }),
            { status: 200 },
          )
        : new Response("nope", { status: 500 }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("moderateText", () => {
  test("clean, flagged, and fail-closed", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    stubModeration({ ok: true, flagged: false });
    expect(await moderateText("hi")).toBe("clean");
    stubModeration({ ok: true, flagged: true });
    expect(await moderateText("bad")).toBe("flagged");
    stubModeration({ ok: false });
    expect(await moderateText("hi")).toBe("unavailable");
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(await moderateText("hi")).toBe("unavailable");
  });
});

describe("bio helpers", () => {
  test("normalizeBio trims and collapses blank lines", () => {
    expect(normalizeBio("  hi there \n\n\n\n rowing  ")).toBe(
      "hi there\n\nrowing",
    );
  });
  test("bioFromInterests joins tags and stops at a tag boundary", () => {
    expect(bioFromInterests(["rowing", "jazz", "PPE"])).toBe(
      "rowing · jazz · PPE",
    );
    const long = Array.from({ length: 30 }, (_, i) => `interest${i}`);
    const seeded = bioFromInterests(long);
    expect(seeded.length).toBeLessThanOrEqual(150);
    expect(seeded.endsWith("·")).toBe(false);
  });
});

async function makeUser(
  t: ReturnType<typeof convexTest>,
  fields: Record<string, unknown> = {},
) {
  return await t.run((ctx) =>
    ctx.db.insert("users", {
      name: "U",
      email: `${Math.random()}@ox.ac.uk`,
      agreedToRules: true,
      emailVerificationTime: 1,
      ...fields,
    }),
  );
}

describe("saveBio", () => {
  test("clean bio is stored; flagged, unavailable and too long are not", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const t = convexTest(schema, modules);
    const me = await makeUser(t);
    const as = t.withIdentity({ subject: `${me}|s` });

    stubModeration({ ok: true, flagged: false });
    expect(await as.action(api.bio.saveBio, { bio: " hello \n world " })).toEqual(
      { ok: true },
    );
    expect((await t.run((ctx) => ctx.db.get(me)))?.bio).toBe("hello\nworld");

    stubModeration({ ok: true, flagged: true });
    expect(await as.action(api.bio.saveBio, { bio: "nasty" })).toEqual({
      ok: false,
      reason: "flagged",
    });
    stubModeration({ ok: false });
    expect(await as.action(api.bio.saveBio, { bio: "fine" })).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(
      await as.action(api.bio.saveBio, { bio: "x".repeat(151) }),
    ).toEqual({ ok: false, reason: "tooLong" });
    expect((await t.run((ctx) => ctx.db.get(me)))?.bio).toBe("hello\nworld");
  });

  test("clearing a bio skips moderation", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, { bio: "old" });
    stubModeration({ ok: false });
    expect(
      await t
        .withIdentity({ subject: `${me}|s` })
        .action(api.bio.saveBio, { bio: "   " }),
    ).toEqual({ ok: true });
    expect((await t.run((ctx) => ctx.db.get(me)))?.bio).toBe("");
  });
});

describe("backfill and reports", () => {
  test("backfill seeds only users without a bio", async () => {
    const t = convexTest(schema, modules);
    const tagged = await makeUser(t, { interests: ["rowing", "jazz"] });
    const hasBio = await makeUser(t, { interests: ["x"], bio: "mine" });
    const none = await makeUser(t);
    await t.mutation(internal.bio.backfillBioFromInterests, {});
    const [a, b, c] = await t.run(async (ctx) =>
      Promise.all([ctx.db.get(tagged), ctx.db.get(hasBio), ctx.db.get(none)]),
    );
    expect(a?.bio).toBe("rowing · jazz");
    expect(b?.bio).toBe("mine");
    expect(c?.bio).toBeUndefined();
  });

  test("one report per reporter, never yourself, and clearBio removes it", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const target = await makeUser(t, { bio: "bad words" });
    const me = await makeUser(t);
    const as = t.withIdentity({ subject: `${me}|s` });
    expect(await as.mutation(api.bio.reportBio, { userId: target })).toEqual({
      alreadyReported: false,
    });
    expect(await as.mutation(api.bio.reportBio, { userId: target })).toEqual({
      alreadyReported: true,
    });
    await expect(
      as.mutation(api.bio.reportBio, { userId: me }),
    ).rejects.toThrow("yourself");
    const reports = await t.run((ctx) => ctx.db.query("bioReports").collect());
    expect(reports).toHaveLength(1);
    expect(reports[0].bioText).toBe("bad words");
    await t.mutation(internal.bio.clearBio, { userId: target });
    expect((await t.run((ctx) => ctx.db.get(target)))?.bio).toBe("");
    vi.useRealTimers();
  });
});
