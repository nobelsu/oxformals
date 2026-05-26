export const NEWSLETTER_STATS = {
  users: 500,
  requests: 350,
  listings: 100,
} as const;

export const NEWSLETTER_FEATURES = [
  {
    title: "Email notifications",
    icon: "envelope" as const,
    body: "Set your wishlist colleges and turn on notifications to get real time updates on the formal listings that matter to you.",
  },
  {
    title: "Reviews and rankings",
    icon: "star" as const,
    body: "Rate, review, and post pictures of college formals you attend. Leaderboards are up and running so get your reviews in!",
  },
  {
    title: "Much, much tidier interfaces and layouts!",
    icon: "layout" as const,
    body: null,
  },
] as const;

export const NEWSLETTER_SUBJECT = "tldr; oxformals is going mobile!";
export const NEWSLETTER_DATE = "26 May 2026";

export const NEWSLETTER_GREETING =
  "Hey! I'm Nobel, the other guy behind oxformals.";

export const NEWSLETTER_INTRO_OPENING =
  "Unfortunately, Juyeon's busy trying not to fail her prelims, so she won't be able to join us today. Hopefully I'd be a sufficiently acceptable replacement (just for now, of course!) 😬";

export const NEWSLETTER_INTRO_STATS = {
  before:
    "oxformals is two weeks old! The level of support you guys have shown has honestly been overwhelming. We've hit over ",
  betweenUsersAndRequests: ", ",
  betweenRequestsAndListings: ", and ",
  after:
    ", numbers we found astonishing for Trinity term. Over the last week, we've also received tons of great feedback from y'all and have been working around the clock to turn them into reality. Here are some of my personal favourites:",
} as const;

export const NEWSLETTER_MOBILE = {
  badge: "New · Beta",
  headline: "oxformals is going mobile",
  body: "After pulling a few all-nighters, we spun up the first version of our app — oxformally (HAHA get it?? 😅) releasing it in testing now. Reply to hosts faster, get push notifications on the formals you care about, and swap on the go. We've got iOS and Android ready — it'd be a huge help if you tried it and told us everything we're still missing!",
} as const;

export const NEWSLETTER_SERIOUS_LEAD =
  "On a serious note, your voice REALLY matters to us. We don't just ask you for your opinions as a oxformality (okay, I'll stop…), but we actually actively listen, and implement them to the best of our ability. From gameifying the formal swapping experience to adding group swaps and better automations and more integrations, there's so just much we can't wait to bring to you.";

export const NEWSLETTER_MISSION_LINE =
  "Formal swapping should be fun and easy, the way our Oxford years ought to be.";

export const NEWSLETTER_SERIOUS = [
  "Sadly, this will be our final (and only second) newsletter for the term, as I, too, would like the privilege of passing my exams. In the meantime, we'll continue to post updates, reels, and formal reviews on our Instagram page, so do check it out from time-to-time!",
  "Whether you've already started taking your exams, or are gearing up for your first ones, we wish you the best of luck! In the meantime, we'll see you at dinner! 😉",
] as const;

export const NEWSLETTER_SIGN_OFF = {
  line: "With much care,",
  team: "The oxformals team",
} as const;
