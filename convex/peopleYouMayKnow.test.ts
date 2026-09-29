/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type T = ReturnType<typeof convexTest<(typeof schema)["tables"]>>;

const makeUser = (t: T, name: string, college: string, extra: Record<string, unknown> = {}) =>
  t.run((ctx) =>
    ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college,
      year: "2",
      role: "UG",
      ...extra,
    }),
  );

const follow = (t: T, a: Id<"users">, b: Id<"users">, status: "active" | "pending" = "active") =>
  t.run((ctx) => ctx.db.insert("follows", { followerId: a, followeeId: b, status }));

describe("people you may know", () => {
  test("ranks friends-of-friends, then shared formals, then college; skips people I follow", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, "Me", "Keble");
    const amy = await makeUser(t, "Amy", "Keble"); // my friend
    const bob = await makeUser(t, "Bob", "Worcester"); // Amy's friend
    const cal = await makeUser(t, "Cal", "Keble", {
      isPrivate: true,
      avatar: { kind: "preset", id: "p1" },
      bio: "secret",
    }); // same college only, private
    const dee = await makeUser(t, "Dee", "Magdalen"); // shared a formal with me
    const eve = await makeUser(t, "Eve", "Keble"); // I already asked to follow
    const gone = await makeUser(t, "Gone", "Keble", { deletedAt: 1 });
    await follow(t, me, amy);
    await follow(t, amy, me);
    await follow(t, amy, bob);
    await follow(t, bob, amy);
    await follow(t, me, eve, "pending");
    await t.run((ctx) =>
      ctx.db.insert("listings", {
        ownerUserId: me,
        college: "Keble",
        dateTime: new Date(Date.now() - 30 * 864e5).toISOString(),
        groupSize: 2,
        seatsAvailable: 0,
        members: [me, dee],
        year: "2",
        role: "UG",
        message: "",
        status: "expired",
      }),
    );

    const people = await t
      .withIdentity({ subject: `${me}|s` })
      .query(api.peopleYouMayKnow.getPeopleYouMayKnow, {});
    expect(people.map((p) => p.user._id)).toEqual([bob, dee, cal]);
    expect(people[0]).toMatchObject({ mutualFriends: 1, sharedFormals: 0, sameCollege: false });
    expect(people[1]).toMatchObject({ mutualFriends: 0, sharedFormals: 1 });
    expect(people.map((p) => p.user._id)).not.toContain(gone);
    // A private account I don't follow shows only who they are.
    expect(people[2].user).toMatchObject({ name: "Cal", bio: "" });
    expect(people[2].user.avatar).toBeUndefined();
  });

  test("signed out gets nothing", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.peopleYouMayKnow.getPeopleYouMayKnow, {})).toEqual([]);
  });
});
