import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CampaignInput {
  campaignId: string;
  businessName: string;
  businessBrief: string;
  targetAudience: string;
  goal: string;
  channels: string[];
  startDate: string;
  durationDays: number;
}

interface AITask {
  title: string;
  channel: string;
  day_offset: number;
  est_minutes: number;
  intent_tag: string;
  campaign_phase: string | null;
  draft_copy: string;
}

interface GeneratedTask {
  title: string;
  channel: string;
  due_date: string;
  draft_copy: string;
  est_minutes: number;
  intent_tag: string;
  campaign_phase: string | null;
  sort_order: number;
}

interface TaskTemplate {
  title: string;
  channel: string;
  est_minutes: number;
  intent_tag: string;
  draft: (input: CampaignInput) => string;
}

// ---------- Draft helpers ----------

function launchDraft(input: CampaignInput): string {
  return [
    `We're excited to introduce ${input.businessName} to you!`,
    ``,
    input.businessBrief,
    ``,
    `If you're part of ${input.targetAudience}, this campaign is for you.`,
    `Our goal: ${input.goal}.`,
    ``,
    `Follow along as we share content, stories, and updates over the coming ${input.durationDays} days. We'd love to hear from you — reply, comment, or reach out anytime.`,
  ].join("\n");
}

function ctaDraft(input: CampaignInput, action: string): string {
  return [
    `Ready to take action? Here's what to do:`,
    ``,
    action,
    ``,
    `This is part of our campaign for ${input.targetAudience}.`,
    `Our goal: ${input.goal}.`,
    ``,
    `[Add a clear, specific call to action here — e.g. "Click the link in bio" or "Reply to this email to get started."]`,
  ].join("\n");
}

function tipsDraft(input: CampaignInput, tips: string[]): string {
  return [
    `Here are ${tips.length} quick tips for ${input.targetAudience}:`,
    ``,
    ...tips.map((t, i) => `${i + 1}. ${t}`),
    ``,
    `Brought to you by ${input.businessName}.`,
    `[Replace these tips with ones specific to your business and audience.]`,
  ].join("\n");
}

function testimonialDraft(input: CampaignInput): string {
  return [
    `We love hearing from our customers.`,
    ``,
    `[Insert a real customer quote here — 1-2 sentences about their experience with ${input.businessName}.]`,
    ``,
    `Want to share your story? Reach out — we'd love to feature you.`,
    ``,
    `For ${input.targetAudience} who are curious about what we do: ${input.businessBrief}`,
  ].join("\n");
}

function promoDraft(input: CampaignInput): string {
  return [
    `Something special is happening at ${input.businessName}.`,
    ``,
    `For a limited time: [OFFER — describe the promotion, e.g. "20% off your first order" or "free consultation call"].`,
    ``,
    `This is for ${input.targetAudience}.`,
    `Our goal: ${input.goal}.`,
    ``,
    `[Add offer details: start date, end date, how to redeem, any exclusions.]`,
  ].join("\n");
}

function behindScenesDraft(input: CampaignInput): string {
  return [
    `Ever wonder what happens behind the scenes at ${input.businessName}?`,
    ``,
    `[Describe a real aspect of your process — how you make your product, prep for the day, or serve customers. Keep it authentic and short.]`,
    ``,
    `We created this for ${input.targetAudience}. If that's you, follow along for more.`,
  ].join("\n");
}

function emailWelcomeDraft(input: CampaignInput): string {
  return [
    `Subject: Welcome to ${input.businessName}`,
    ``,
    `Hi there,`,
    ``,
    `Thanks for joining us. Here's what you expect:`,
    ``,
    `- [Describe what subscribers will receive — e.g. weekly tips, early access, exclusive offers]`,
    `- [Set expectations on frequency — e.g. one email per week]`,
    ``,
    `A bit about us: ${input.businessBrief}`,
    ``,
    `Our goal for this campaign: ${input.goal}.`,
    ``,
    `[Add a personal sign-off and a link to your website or most popular content.]`,
  ].join("\n");
}

function emailNewsletterDraft(input: CampaignInput): string {
  return [
    `Subject: [Newsletter title — e.g. "This week at ${input.businessName}"]`,
    ``,
    `Hi there,`,
    ``,
    `Here's what's new this week:`,
    ``,
    `- [Update 1: something new, useful, or timely]`,
    `- [Update 2: a tip or resource for ${input.targetAudience}]`,
    `- [Update 3: something to engage with — a question, poll, or invitation]`,
    ``,
    `We'd love your feedback — just reply to this email.`,
  ].join("\n");
}

function emailPromoDraft(input: CampaignInput): string {
  return [
    `Subject: [OFFER — e.g. "Special offer inside"]`,
    ``,
    `Hi there,`,
    ``,
    `As a thank you for being part of our community, here's something special:`,
    ``,
    `[OFFER — describe the promotion, e.g. "Take [DISCOUNT] off your next order"]`,
    `[How to redeem: e.g. use code [CODE] at checkout]`,
    `[Valid through: DATE]`,
    ``,
    `This is for ${input.targetAudience}. Questions? Just reply to this email.`,
  ].join("\n");
}

function emailFollowUpDraft(input: CampaignInput): string {
  return [
    `Subject: [Follow-up subject — e.g. "How did we do?"]`,
    ``,
    `Hi there,`,
    ``,
    `We want to make sure you're getting value from ${input.businessName}.`,
    ``,
    `- [Ask one specific question about their experience]`,
    `- [Share a relevant resource or next step]`,
    ``,
    `Your feedback helps us serve ${input.targetAudience} better. Reply anytime.`,
  ].join("\n");
}

function landingPageDraft(input: CampaignInput): string {
  return [
    `Landing page copy for ${input.businessName}:`,
    ``,
    `Headline: [Clear, benefit-driven headline — e.g. "Get [BENEFIT] with [PRODUCT/SERVICE]"]`,
    `Subheadline: [One sentence expanding on the headline — reference ${input.businessBrief}]`,
    ``,
    `Body:`,
    `- [Key benefit 1 for ${input.targetAudience}]`,
    `- [Key benefit 2]`,
    `- [Key benefit 3]`,
    ``,
    `Call to action: [BUTTON TEXT — e.g. "Get started" or "Learn more"]`,
    `[Where the button links to — e.g. signup form, product page]`,
  ].join("\n");
}

function bannerDraft(input: CampaignInput): string {
  return [
    `Homepage banner copy:`,
    ``,
    `Headline: [Short, punchy — 3-6 words]`,
    `Subtext: [One line supporting the headline, referencing ${input.goal}]`,
    `Button: [2-3 word CTA]`,
    ``,
    `[Banner should be visible above the fold. Link to your campaign landing page.]`,
  ].join("\n");
}

function blogDraft(input: CampaignInput): string {
  return [
    `Blog post outline for ${input.businessName}:`,
    ``,
    `Title: [Working title relevant to ${input.targetAudience} and ${input.goal}]`,
    ``,
    `Introduction (2-3 sentences):`,
    `[Hook the reader with a question or scenario they relate to. Reference ${input.businessBrief} naturally.]`,
    ``,
    `Section 1: [Subheading]`,
    `[2-3 paragraphs of useful content]`,
    ``,
    `Section 2: [Subheading]`,
    `[2-3 paragraphs of useful content]`,
    ``,
    `Conclusion:`,
    `[Summarize key points. End with a call to action aligned with ${input.goal}.]`,
  ].join("\n");
}

function reviewDraft(input: CampaignInput): string {
  return [
    `Campaign review checklist for ${input.businessName}:`,
    ``,
    `1. Did we achieve ${input.goal}? [Compare against specific metrics]`,
    `2. Which channel performed best? [Check engagement across ${input.channels.join(", ")}]`,
    `3. Which content type got the most response? [Posts, videos, emails]`,
    `4. What would we do differently? [List 2-3 concrete changes]`,
    `5. Top performing draft copy: [Note which posts to reuse]`,
    ``,
    `Document these lessons before starting the next campaign.`,
  ].join("\n");
}

// ---------- Task templates per channel ----------

const TEMPLATES: Record<string, TaskTemplate[]> = {
  Instagram: [
    { title: "Launch announcement post", channel: "Instagram", est_minutes: 30, intent_tag: "AWARENESS", draft: launchDraft },
    { title: "Carousel: 3 tips for your audience", channel: "Instagram", est_minutes: 45, intent_tag: "ENGAGEMENT", draft: (i) => tipsDraft(i, ["[Tip 1 — specific to your business]", "[Tip 2]", "[Tip 3]"]) },
    { title: "Reel: behind-the-scenes look", channel: "Instagram", est_minutes: 90, intent_tag: "AWARENESS", draft: behindScenesDraft },
    { title: "Story sequence: customer spotlight", channel: "Instagram", est_minutes: 30, intent_tag: "RETENTION", draft: testimonialDraft },
    { title: "Engagement post: poll or question", channel: "Instagram", est_minutes: 15, intent_tag: "ENGAGEMENT", draft: (i) => ctaDraft(i, "We want to hear from you. [Ask a specific question your audience will want to answer.]") },
    { title: "Reel: product or service highlight", channel: "Instagram", est_minutes: 120, intent_tag: "CONVERSION", draft: (i) => ctaDraft(i, `See what makes ${i.businessName} different. [Show your product or service in action.]`) },
    { title: "Carousel: common questions answered", channel: "Instagram", est_minutes: 45, intent_tag: "CONVERSION", draft: (i) => tipsDraft(i, ["[FAQ 1 — with a clear answer]", "[FAQ 2]", "[FAQ 3]"]) },
  ],
  Facebook: [
    { title: "Launch post with call to action", channel: "Facebook", est_minutes: 30, intent_tag: "AWARENESS", draft: launchDraft },
    { title: "Community engagement post: ask a question", channel: "Facebook", est_minutes: 15, intent_tag: "ENGAGEMENT", draft: (i) => ctaDraft(i, "[Ask a question that starts a conversation with your audience.]") },
    { title: "Share customer success story", channel: "Facebook", est_minutes: 30, intent_tag: "RETENTION", draft: testimonialDraft },
    { title: "Promotional post with special offer", channel: "Facebook", est_minutes: 30, intent_tag: "CONVERSION", draft: promoDraft },
    { title: "Milestone or announcement post", channel: "Facebook", est_minutes: 20, intent_tag: "AWARENESS", draft: (i) => ctaDraft(i, `[Share a real milestone — e.g. "We just served our 1,000th customer" or "New location opening soon".]`) },
  ],
  TikTok: [
    { title: "Trend-based video introducing the brand", channel: "TikTok", est_minutes: 90, intent_tag: "AWARENESS", draft: (i) => ctaDraft(i, `Quick intro to ${i.businessName}. [Use a trending audio or format. Keep it under 30 seconds.]`) },
    { title: "Day-in-the-life content video", channel: "TikTok", est_minutes: 120, intent_tag: "AWARENESS", draft: behindScenesDraft },
    { title: "Quick tips video: 3 things to know", channel: "TikTok", est_minutes: 60, intent_tag: "ENGAGEMENT", draft: (i) => tipsDraft(i, ["[Tip 1 — keep it visual and quick]", "[Tip 2]", "[Tip 3]"]) },
    { title: "User-generated content style video", channel: "TikTok", est_minutes: 90, intent_tag: "RETENTION", draft: testimonialDraft },
    { title: "Before-and-after or transformation video", channel: "TikTok", est_minutes: 120, intent_tag: "CONVERSION", draft: (i) => ctaDraft(i, `[Show a real transformation related to your product or service. No health or medical claims — focus on the process or result.]`) },
  ],
  Email: [
    { title: "Welcome email: introduction", channel: "Email", est_minutes: 60, intent_tag: "RETENTION", draft: emailWelcomeDraft },
    { title: "Newsletter: value content and tips", channel: "Email", est_minutes: 90, intent_tag: "ENGAGEMENT", draft: emailNewsletterDraft },
    { title: "Promotional email: special offer", channel: "Email", est_minutes: 60, intent_tag: "CONVERSION", draft: emailPromoDraft },
    { title: "Follow-up email: check in and gather feedback", channel: "Email", est_minutes: 45, intent_tag: "RETENTION", draft: emailFollowUpDraft },
  ],
  Website: [
    { title: "Publish campaign landing page", channel: "Website", est_minutes: 120, intent_tag: "CONVERSION", draft: landingPageDraft },
    { title: "Add campaign banner to homepage", channel: "Website", est_minutes: 45, intent_tag: "AWARENESS", draft: bannerDraft },
    { title: "Publish blog post related to campaign", channel: "Website", est_minutes: 90, intent_tag: "AWARENESS", draft: blogDraft },
    { title: "Add testimonials section to landing page", channel: "Website", est_minutes: 60, intent_tag: "RETENTION", draft: testimonialDraft },
  ],
};

// ---------- Template-based generator (fallback) ----------

function generateTasks(input: CampaignInput): GeneratedTask[] {
  const tasks: GeneratedTask[] = [];
  const start = new Date(input.startDate + "T00:00:00");
  const channels = input.channels;
  const totalDays = input.durationDays;

  const targetCount = Math.round(Math.max(8, Math.min(25, (totalDays / 30) * 18)));

  let pool: TaskTemplate[] = [];
  for (const ch of channels) {
    const templates = TEMPLATES[ch] || [];
    pool.push(...templates);
  }

  const kickoffChannel = channels[0] || "Website";
  const reviewChannel = channels[0] || "Website";

  tasks.push({
    title: `Kickoff: Set up ${kickoffChannel} for ${input.businessName}`,
    channel: kickoffChannel,
    due_date: dateStr(start, 0),
    draft_copy: launchDraft(input),
    est_minutes: 30,
    intent_tag: "AWARENESS",
    campaign_phase: phaseForDayOffset(0, totalDays),
    sort_order: 0,
  });

  const middleCount = Math.max(0, targetCount - 2);
  const spacing = middleCount > 0 ? Math.max(1, Math.floor((totalDays - 1) / (middleCount + 1))) : 1;

  let poolIndex = 0;
  for (let i = 0; i < middleCount; i++) {
    const tmpl = pool[poolIndex % pool.length];
    poolIndex++;
    const dayOffset = spacing * (i + 1);
    if (dayOffset >= totalDays) break;

    tasks.push({
      title: tmpl.title,
      channel: tmpl.channel,
      due_date: dateStr(start, dayOffset),
      draft_copy: tmpl.draft(input),
      est_minutes: tmpl.est_minutes,
      intent_tag: tmpl.intent_tag,
      campaign_phase: phaseForDayOffset(dayOffset, totalDays),
      sort_order: i + 1,
    });
  }

  tasks.push({
    title: `Campaign wrap-up: review results for ${input.businessName}`,
    channel: reviewChannel,
    due_date: dateStr(start, totalDays - 1),
    draft_copy: reviewDraft(input),
    est_minutes: 45,
    intent_tag: "RETENTION",
    campaign_phase: phaseForDayOffset(totalDays - 1, totalDays),
    sort_order: tasks.length,
  });

  return tasks;
}

function dateStr(start: Date, dayOffset: number): string {
  const d = new Date(start.getTime() + dayOffset * 86400000);
  return d.toISOString().slice(0, 10);
}

// ---------- OpenAI generator ----------

const VALID_CHANNELS = ["Instagram", "Facebook", "TikTok", "Email", "Website"];
const VALID_INTENT_TAGS = ["AWARENESS", "ENGAGEMENT", "RETENTION", "CONVERSION"];
const VALID_PHASES = ["Prep", "Build", "Launch", "Grow"];

function phaseForDayOffset(dayOffset: number, totalDays: number): string {
  const pct = dayOffset / totalDays;
  if (pct < 0.25) return "Prep";
  if (pct < 0.5) return "Build";
  if (pct < 0.75) return "Launch";
  return "Grow";
}

function buildOpenAIPrompt(input: CampaignInput): string {
  const targetCount = Math.round(Math.max(8, Math.min(25, (input.durationDays / 30) * 18)));
  return [
    `You are a marketing campaign planner. Generate a content calendar as a JSON array of task objects.`,
    ``,
    `CAMPAIGN DETAILS:`,
    `- Business name: ${input.businessName}`,
    `- Business brief: ${input.businessBrief}`,
    `- Target audience: ${input.targetAudience}`,
    `- Campaign goal: ${input.goal}`,
    `- Channels (use ONLY these): ${input.channels.join(", ")}`,
    `- Campaign start date: ${input.startDate}`,
    `- Campaign duration: ${input.durationDays} days`,
    ``,
    `RULES:`,
    `1. Generate between ${targetCount} and 25 tasks total.`,
    `2. Only use these channel values: ${VALID_CHANNELS.join(", ")}. Every task's channel MUST be one of the selected channels: ${input.channels.join(", ")}.`,
    `3. Each task must have: title, channel, day_offset (integer 0 to ${input.durationDays - 1}), est_minutes (honest estimate, 5-180), intent_tag (one of ${VALID_INTENT_TAGS.join(", ")}), campaign_phase (one of ${VALID_PHASES.join(", ")}, or null), draft_copy (string with ready-to-edit draft content).`,
    `4. The first task should be a kickoff/setup task on day_offset 0.`,
    `5. The last task should be a campaign review/wrap-up on day_offset ${input.durationDays - 1}.`,
    `6. Spread tasks across the full duration. Don't cluster them all at the start.`,
    `7. In draft_copy, use placeholders like [PRICE], [LINK], [DATE], [DISCOUNT] for facts the user must fill in. Do NOT invent specific prices, URLs, dates, or statistics.`,
    `8. Do NOT make any health or medical claims.`,
    `9. Keep draft_copy concise but actionable — 3-8 lines.`,
    `10. Titles should be specific and descriptive (e.g. "Instagram Reel: behind-the-scenes at the kitchen" not just "Reel").`,
    `11. Vary content types and intent tags across tasks.`,
    ``,
    `Return ONLY a JSON array of task objects. No markdown, no explanation, no code fence.`,
  ].join("\n");
}

interface OpenAIResponse {
  choices: { message: { content: string } }[];
}

async function generateTasksWithAI(input: CampaignInput): Promise<GeneratedTask[]> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const prompt = buildOpenAIPrompt(input);

  let resp: Response;
  try {
    resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a marketing campaign planner that outputs valid JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4000,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`OpenAI fetch failed: ${err.message}`);
  }
  clearTimeout(timeout);

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI API error ${resp.status}: ${errText}`);
  }

  const data: OpenAIResponse = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");

  const parsed = JSON.parse(content);
  const aiTasks: AITask[] = Array.isArray(parsed) ? parsed : parsed.tasks || [];
  if (!Array.isArray(aiTasks) || aiTasks.length === 0) {
    throw new Error("OpenAI returned no tasks");
  }

  const start = new Date(input.startDate + "T00:00:00");
  const validChannelSet = new Set(input.channels);

  const tasks: GeneratedTask[] = aiTasks
    .filter((t) => t && t.title && t.channel && validChannelSet.has(t.channel))
    .map((t, i) => ({
      title: String(t.title).slice(0, 200),
      channel: t.channel,
      due_date: dateStr(start, Math.max(0, Math.min(input.durationDays - 1, Math.round(t.day_offset || 0)))),
      draft_copy: String(t.draft_copy || "").slice(0, 5000),
      est_minutes: Math.max(5, Math.min(180, Math.round(t.est_minutes || 30))),
      intent_tag: VALID_INTENT_TAGS.includes(t.intent_tag) ? t.intent_tag : "AWARENESS",
      campaign_phase: t.campaign_phase && VALID_PHASES.includes(t.campaign_phase) ? t.campaign_phase : phaseForDayOffset(Math.max(0, Math.min(input.durationDays - 1, Math.round(t.day_offset || 0))), input.durationDays),
      sort_order: i,
    }));

  if (tasks.length === 0) throw new Error("OpenAI returned no valid tasks after filtering");

  return tasks;
}

// ---------- Server ----------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CampaignInput = await req.json();

    if (!body.campaignId || !body.channels || body.channels.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let tasks: GeneratedTask[];
    let usedAI = false;
    let aiError: string | null = null;

    try {
      tasks = await generateTasksWithAI(body);
      usedAI = true;
    } catch (err) {
      aiError = err.message;
      tasks = generateTasks(body);
    }

    const { error: insertError } = await supabase
      .from("tasks")
      .insert(
        tasks.map((t) => ({
          campaign_id: body.campaignId,
          title: t.title,
          channel: t.channel,
          due_date: t.due_date,
          draft_copy: t.draft_copy,
          est_minutes: t.est_minutes,
          intent_tag: t.intent_tag,
          campaign_phase: t.campaign_phase,
          status: "todo",
          sort_order: t.sort_order,
        }))
      );

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, taskCount: tasks.length, source: usedAI ? "openai" : "template", ...(aiError ? { fallback_reason: aiError } : {}) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
