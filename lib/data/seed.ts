import { userStore } from "@/lib/auth/userStore";
import type { User } from "@/lib/auth/types";
import { dataClient } from "./dataClient";

type DemoUser = {
  email: string;
  name: string;
  college: string;
  year: string;
  interests: string[];
};

const DEMO_USERS: DemoUser[] = [
  {
    email: "olivia@demo.formalswap",
    name: "Olivia B.",
    college: "Trinity",
    year: "2nd year",
    interests: ["rowing", "debate", "jazz"],
  },
  {
    email: "tom@demo.formalswap",
    name: "Tom M.",
    college: "Pembroke",
    year: "3rd year",
    interests: ["rugby", "film", "cooking"],
  },
  {
    email: "lucy@demo.formalswap",
    name: "Lucy W.",
    college: "Magdalen",
    year: "2nd year",
    interests: ["poetry", "punting", "tennis"],
  },
  {
    email: "raj@demo.formalswap",
    name: "Raj P.",
    college: "Merton",
    year: "Postgrad",
    interests: ["chess", "baking"],
  },
  {
    email: "sophie@demo.formalswap",
    name: "Sophie K.",
    college: "Christ Church",
    year: "1st year",
    interests: ["choir", "drawing", "hiking"],
  },
  {
    email: "ben@demo.formalswap",
    name: "Ben D.",
    college: "Wadham",
    year: "4th year",
    interests: ["climbing", "photography"],
  },
];

function daysFromNow(days: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function seedDemoUsers(): User[] {
  return DEMO_USERS.map((u) => userStore.upsert(u));
}

function seedListings(demoUsers: User[]) {
  const [olivia, tom, lucy, raj, sophie, ben] = demoUsers;

  const listings: Array<Parameters<typeof dataClient.createListing>> = [
    [
      olivia.id,
      {
        college: "Trinity",
        dateTime: daysFromNow(4, 19, 15),
        seats: 2,
        year: olivia.year,
        swapFor: ["Balliol", "Merton", "Keble"],
        message: "Been dying to try somewhere new!",
      },
    ],
    [
      tom.id,
      {
        college: "Pembroke",
        dateTime: daysFromNow(5, 19, 0),
        seats: 1,
        year: tom.year,
        swapFor: ["Christ Church", "Magdalen"],
        message: "Happy to chat first.",
      },
    ],
    [
      lucy.id,
      {
        college: "Magdalen",
        dateTime: daysFromNow(6, 19, 30),
        seats: 2,
        year: lucy.year,
        swapFor: ["Worcester", "St John's"],
        message: "",
      },
    ],
    [
      raj.id,
      {
        college: "Merton",
        dateTime: daysFromNow(8, 19, 0),
        seats: 1,
        year: raj.year,
        swapFor: ["New College", "Trinity"],
        message: "Veggie menu available.",
      },
    ],
    [
      sophie.id,
      {
        college: "Christ Church",
        dateTime: daysFromNow(10, 19, 30),
        seats: 3,
        year: sophie.year,
        swapFor: ["Wadham", "Balliol"],
        message: "Bringing two friends.",
      },
    ],
    [
      ben.id,
      {
        college: "Wadham",
        dateTime: daysFromNow(12, 19, 0),
        seats: 2,
        year: ben.year,
        swapFor: ["Exeter", "Keble", "Jesus"],
        message: "",
      },
    ],
  ];

  for (const [ownerId, input] of listings) {
    dataClient.createListing(ownerId, input);
  }

  return { olivia, tom, lucy };
}

function seedCurrentUserListing(currentUser: User) {
  if (dataClient.listingsByOwner(currentUser.id).length > 0) return;
  dataClient.createListing(currentUser.id, {
    college: currentUser.college,
    dateTime: daysFromNow(4, 19, 15),
    seats: 2,
    year: currentUser.year,
    swapFor: ["Trinity", "Merton", "Magdalen"],
    message: "Swap welcome — drop me a line!",
  });
}

function seedIncomingRequests(
  currentUser: User,
  olivia: User,
  tom: User,
) {
  const myListings = dataClient.listingsByOwner(currentUser.id);
  if (myListings.length === 0) return;
  const target = myListings[0];

  const oliviaListings = dataClient.listingsByOwner(olivia.id);
  const tomListings = dataClient.listingsByOwner(tom.id);
  if (oliviaListings[0]) {
    dataClient.createRequest({
      fromUserId: olivia.id,
      toUserId: currentUser.id,
      targetListingId: target.id,
      offeringListingId: oliviaListings[0].id,
      message: `Hey! Saw your ${currentUser.college} listing — want to swap for my Trinity?`,
    });
  }
  if (tomListings[0]) {
    dataClient.createRequest({
      fromUserId: tom.id,
      toUserId: currentUser.id,
      targetListingId: target.id,
      offeringListingId: tomListings[0].id,
      message: "Could I grab a seat? Offering Pembroke in return.",
    });
  }
}

function seedSentRequest(currentUser: User, lucy: User) {
  const myListings = dataClient.listingsByOwner(currentUser.id);
  const lucyListings = dataClient.listingsByOwner(lucy.id);
  if (!myListings[0] || !lucyListings[0]) return;
  dataClient.createRequest({
    fromUserId: currentUser.id,
    toUserId: lucy.id,
    targetListingId: lucyListings[0].id,
    offeringListingId: myListings[0].id,
    message: "Would love to try Magdalen!",
  });
}

function seedChat(currentUser: User, olivia: User) {
  const convo = dataClient.ensureConversation(currentUser.id, olivia.id);
  const lines: Array<[string, string]> = [
    [olivia.id, `Hey! Saw your ${currentUser.college} listing — want to swap for my Trinity?`],
    [currentUser.id, "Yes!! Been dying to go there"],
    [olivia.id, "Amazing! I'm free that Thursday"],
    [currentUser.id, "Perfect, let's confirm it!"],
    [olivia.id, "I'm free that Thursday!"],
  ];
  for (const [from, body] of lines) {
    dataClient.sendMessage(convo.id, from, body);
  }
}

function seedWishlist(currentUser: User) {
  const existing = dataClient.getWishlist(currentUser.id);
  if (existing.length > 0) return;
  for (const college of ["Merton", "Christ Church", "Trinity"]) {
    dataClient.toggleWishlistCollege(currentUser.id, college);
  }
}

export function ensureSeeded(currentUser: User): void {
  if (dataClient.hasSeeded()) return;
  const users = seedDemoUsers();
  const { olivia, tom, lucy } = seedListings(users);
  seedCurrentUserListing(currentUser);
  seedIncomingRequests(currentUser, olivia, tom);
  seedSentRequest(currentUser, lucy);
  seedChat(currentUser, olivia);
  seedWishlist(currentUser);
  dataClient.markSeeded();
}
