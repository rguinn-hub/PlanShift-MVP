import type { Campaign, Task, CampaignPhase } from "./types";

export const DEMO_CAMPAIGN: Omit<Campaign, "id" | "user_id" | "created_at"> = {
  business_name: "The Velvet Thread",
  business_brief: "Independent retail boutique curating thoughtfully made clothing and accessories. Known for personal styling sessions and a warm, editorial social presence.",
  target_audience: "Style-conscious women who value curated, versatile seasonal pieces and prefer shopping small/local",
  goal: "Build anticipation, launch the Fall Capsule Collection, drive purchases, and sustain interest for 30 days",
  channels: ["Instagram", "TikTok", "Email", "Facebook", "Website"],
  start_date: new Date().toISOString().slice(0, 10),
  duration_days: 30,
};

interface DemoTaskInput {
  title: string;
  channel: string;
  dayOffset: number;
  est_minutes: number;
  intent_tag: string;
  campaign_phase: CampaignPhase;
  draft_copy: string;
  micro_steps?: { text: string; done: boolean }[];
}

function dateStr(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export const DEMO_TASKS: DemoTaskInput[] = [
  {
    title: "Fall Capsule Teaser",
    channel: "Instagram",
    dayOffset: 0,
    est_minutes: 25,
    intent_tag: "AWARENESS",
    campaign_phase: "Tease",
    draft_copy: "Something new is settling in. \u{1F341} Thoughtful layers. Effortless color. Pieces you'll reach for all season long. Our Fall Capsule Collection is almost here. Stay close — we're just getting started. #FallStyle #ShopSmall #FallCapsule",
    micro_steps: [
      { text: "Choose a moody autumn photo or flat lay", done: false },
      { text: "Paste the caption and add hashtags", done: false },
      { text: "Schedule the post for 6pm", done: false },
    ],
  },
  {
    title: "\"Something New Is Coming\" teaser email",
    channel: "Email",
    dayOffset: 2,
    est_minutes: 35,
    intent_tag: "AWARENESS",
    campaign_phase: "Tease",
    draft_copy: "Subject: A little fall magic is on the way \u{1F341}\n\nCooler days are coming — and so is something we've been waiting to show you. Our new Fall Capsule Collection is designed around easy-to-wear pieces you can mix, layer and make your own.\n\nConsider this your first peek. Coming soon.\n\nCTA: GET A SNEAK PEEK",
  },
  {
    title: "Behind the scenes video",
    channel: "TikTok",
    dayOffset: 4,
    est_minutes: 45,
    intent_tag: "TRUST",
    campaign_phase: "Tease",
    draft_copy: "Video idea: Quick clips of unpacking inventory, hanging garments, styling racks and close-ups of textures.\n\nCaption: Before the collection hits the rack… this is what it looks like behind the scenes. \u{1F440}\u{1F341} Boxes everywhere. Outfit combinations everywhere. And yes — we're already picking favorites. Fall Capsule coming soon.",
  },
  {
    title: "Fall style poll",
    channel: "Instagram",
    dayOffset: 6,
    est_minutes: 15,
    intent_tag: "ENGAGEMENT",
    campaign_phase: "Tease",
    draft_copy: "Story: Help us settle a fall debate. \u{1F447}\n\nPoll 1: Cozy Layers / Clean & Classic\nPoll 2: Warm Neutrals / Rich Fall Color\nPoll 3: What do you want to see FIRST from the new collection? Sweaters / Jackets / Dresses / Everyday Basics",
  },
  {
    title: "Collection theme reveal",
    channel: "Instagram",
    dayOffset: 8,
    est_minutes: 30,
    intent_tag: "AWARENESS",
    campaign_phase: "Build-Up",
    draft_copy: "Meet your fall wardrobe reset. \u{1F341} Our Fall Capsule Collection was curated around one idea: Fewer pieces. More ways to wear them. Easy layers, rich seasonal tones and pieces that work together instead of competing for space in your closet. Launching soon.\n\n(Cross-post to Facebook page after publishing to Instagram.)",
  },
  {
    title: "One Piece, Three Ways styling video",
    channel: "TikTok",
    dayOffset: 10,
    est_minutes: 50,
    intent_tag: "TRUST",
    campaign_phase: "Build-Up",
    draft_copy: "Video: LOOK 1: Casual, LOOK 2: Work, LOOK 3: Weekend\n\nCaption: One piece. Three completely different moods. That's exactly what we wanted from this collection. Which look are you wearing — 1, 2 or 3? \u{1F447}\n\n(Cross-post as Instagram Reel after publishing to TikTok.)",
  },
  {
    title: "Collection preview page",
    channel: "Website",
    dayOffset: 12,
    est_minutes: 60,
    intent_tag: "CONVERSION",
    campaign_phase: "Build-Up",
    draft_copy: "Hero copy: Fall, Curated.\n\nMeet a collection designed to make getting dressed easier. Versatile layers. Seasonal color. Pieces made to mix, match and wear again.\n\nThe Fall Capsule arrives soon.\n\n[PREVIEW THE COLLECTION]",
  },
  {
    title: "VIP early access email",
    channel: "Email",
    dayOffset: 13,
    est_minutes: 40,
    intent_tag: "CONVERSION",
    campaign_phase: "Build-Up",
    draft_copy: "Subject: You're in first. \u{1F341}\n\nYou didn't hear it from us... Actually, yes you did. Our Fall Capsule Collection officially launches tomorrow, but we're opening the doors a little early for you.\n\nShop before we announce it everywhere else. Your early access starts now.\n\nCTA: SHOP EARLY ACCESS",
  },
  {
    title: "Official launch announcement",
    channel: "Instagram",
    dayOffset: 14,
    est_minutes: 35,
    intent_tag: "CONVERSION",
    campaign_phase: "Launch",
    draft_copy: "\u{1F341} IT'S HERE. The Fall Capsule Collection has officially arrived.\n\nA curated collection of layers, everyday staples and statement pieces designed to work together all season long. Dress them up. Dress them down. Make them yours.\n\nShop the collection now.\n\n[SHOP NOW]\n\n(Cross-post to Facebook page after publishing to Instagram.)",
  },
  {
    title: "Launch email",
    channel: "Email",
    dayOffset: 15,
    est_minutes: 45,
    intent_tag: "CONVERSION",
    campaign_phase: "Launch",
    draft_copy: "Subject: The Fall Capsule is HERE \u{1F341}\n\nYour fall wardrobe just got easier. Our new Fall Capsule Collection has officially arrived.\n\nWe built this collection around versatile pieces you'll actually wear — not just once, but in different combinations all season long. Your new favorite fall look may already be waiting.\n\nShop before your favorites disappear.\n\nCTA: SHOP THE FALL CAPSULE",
  },
  {
    title: "Shop the Look video",
    channel: "TikTok",
    dayOffset: 17,
    est_minutes: 50,
    intent_tag: "CONVERSION",
    campaign_phase: "Launch",
    draft_copy: "Video: Start with one complete outfit. Then reveal each individual product. On-screen copy: SHOP THE LOOK\n\nCaption: The outfit is already planned for you. \u{1F609} Here's everything you need to recreate this fall look. Tap to shop each piece.\n\n(Cross-post as Instagram Reel after publishing to TikTok.)",
  },
  {
    title: "Why we chose these pieces",
    channel: "Instagram",
    dayOffset: 20,
    est_minutes: 30,
    intent_tag: "TRUST",
    campaign_phase: "Momentum",
    draft_copy: "There are hundreds of pieces we could put in the shop. So why these?\n\nEvery item in our Fall Capsule was chosen because it passed one test: Can you actually wear it more than one way?\n\nWe want your closet filled with pieces you love wearing — not pieces that still have tags on them six months later. That's the heart behind this collection. \u{2764}\u{FE0F}\n\n(Cross-post to Facebook page after publishing to Instagram.)",
  },
  {
    title: "Customer favorite spotlight",
    channel: "Instagram",
    dayOffset: 23,
    est_minutes: 25,
    intent_tag: "TRUST",
    campaign_phase: "Momentum",
    draft_copy: "We suspected you might love this one. You proved us right. \u{1F60D}\n\n[Rescue Apparel] is quickly becoming one of the favorites from our Fall Capsule. Here's why:\n\n\u2713 Easy to layer\n\u2713 Dresses up or down\n\u2713 Works with pieces already in your closet\n\nHave you tried it yet?",
  },
  {
    title: "\"Which Look Are You?\" carousel",
    channel: "Instagram",
    dayOffset: 26,
    est_minutes: 30,
    intent_tag: "ENGAGEMENT",
    campaign_phase: "Momentum",
    draft_copy: "Slide 1: What's your fall style?\nSlide 2: \u{1F341} The Cozy One\nSlide 3: \u{1F9D0}\u{1F35E} The Classic One\nSlide 4: \u{1F525} The Statement Maker\nSlide 5: Tell us yours: 1, 2 or 3?\n\nCaption: We all enter fall with a personality. \u{1F602} Which one are you?\n\n(Cross-post to Facebook page as a carousel after publishing to Instagram.)",
  },
  {
    title: "Final capsule reminder email",
    channel: "Email",
    dayOffset: 29,
    est_minutes: 40,
    intent_tag: "CONVERSION",
    campaign_phase: "Momentum",
    draft_copy: "Subject: One last look at fall \u{1F341}\n\nThirty days. So many outfits. Before we close out our Fall Capsule launch, we're revisiting some of the pieces — and looks — you've loved most.\n\nIf something has been sitting in your cart or you've been waiting to build your fall wardrobe, now is a good time to take another look.\n\nYour fall favorites are waiting.\n\nCTA: SHOP THE COLLECTION",
  },
];

export function buildDemoTasks(campaignId: string): Omit<Task, "id" | "created_at">[] {
  return DEMO_TASKS.map((t, i) => ({
    campaign_id: campaignId,
    title: t.title,
    channel: t.channel,
    due_date: dateStr(t.dayOffset),
    draft_copy: t.draft_copy,
    est_minutes: t.est_minutes,
    intent_tag: t.intent_tag,
    campaign_phase: t.campaign_phase,
    micro_steps: t.micro_steps || [],
    status: "todo" as const,
    sort_order: i,
  }));
}
