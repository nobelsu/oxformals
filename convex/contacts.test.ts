/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import { phoneKey } from "./contacts";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
type T = ReturnType<typeof convexTest>;
const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

async function seed(t: T) {
  return await t.run(async (ctx) => {
    const user = (name: string, extra: Record<string, unknown> = {}) =>
      ctx.db.insert("users", {
        name,
        email: `${name.toLowerCase()}@ox.ac.uk`,
        college: "Keble",
        emailVerificationTime: 1,
        agreedToRules: true,
        ...extra,
      });
    const me = await user("Me", { whatsappPhone: "07700 900001" });
    const priya = await user("Priya", { whatsappPhone: "+44 7700 900123" });
    const hidden = await user("Hidden", {
      whatsappPhone: "07700900456",
      discoverableByContacts: false,
    });
    const blocked = await user("Blocked", { whatsappPhone: "07700900789" });
    const byEmail = await user("Emma");
    await ctx.db.insert("blocks", { blockerId: blocked, blockedId: me, createdAt: 1 });
    await ctx.db.insert("follows", { followerId: me, followeeId: byEmail, status: "active" });
    return { me, priya, hidden, blocked, byEmail };
  });
}

test("phone numbers match on their last ten digits", () => {
  expect(phoneKey("+44 7700 900123")).toBe(phoneKey("07700 900123"));
  expect(phoneKey("12345")).toBeNull();
});

test("finds contacts by phone or email, and says which entry and whether you follow them", async () => {
  const t = convexTest(schema, modules);
  const { me, priya, byEmail } = await seed(t);
  const matches = await as(t, me).mutation(api.contacts.matchContacts, {
    contacts: [
      { phones: ["07700 900999"], emails: [] },
      { phones: ["(07700) 900-123"], emails: [] },
      { phones: [], emails: ["Emma@OX.ac.uk"] },
      { phones: ["07700 900001"], emails: ["me@ox.ac.uk"] },
    ],
  });
  expect(matches.map((m) => [m.id, m.contactIndex, m.following])).toEqual([
    [byEmail, 2, "active"],
    [priya, 1, "none"],
  ]);
});

test("leaves out people who opted out and anyone blocked either way", async () => {
  const t = convexTest(schema, modules);
  const { me } = await seed(t);
  const matches = await as(t, me).mutation(api.contacts.matchContacts, {
    contacts: [{ phones: ["07700900456", "07700900789"], emails: [] }],
  });
  expect(matches).toEqual([]);
});

test("nothing from the address book is stored, and the switch is on by default", async () => {
  const t = convexTest(schema, modules);
  const { me } = await seed(t);
  const before = await t.run((ctx) => ctx.db.query("users").collect());
  await as(t, me).mutation(api.contacts.matchContacts, {
    contacts: [{ phones: ["07000 000000"], emails: ["stranger@example.com"] }],
  });
  const after = await t.run((ctx) => ctx.db.query("users").collect());
  expect(after).toEqual(before);

  expect(await as(t, me).query(api.contacts.getContactDiscovery, {})).toEqual({
    discoverable: true,
  });
  await as(t, me).mutation(api.contacts.setContactDiscovery, { discoverable: false });
  expect(await as(t, me).query(api.contacts.getContactDiscovery, {})).toEqual({
    discoverable: false,
  });
});
