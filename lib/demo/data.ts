import type {
  Cluster,
  MailThread,
  PromiseItem,
  Task,
  Tracker,
} from "@/lib/domain/types";

export const TASKS: readonly Task[] = [
  {
    id: "t1",
    status: "now",
    title: "Send Kestrel the two references they asked for",
    company: "Kestrel Labs",
    stage: "Onsite",
    due: "Today",
    confidence: 0.94,
    evidence: [
      "Great to meet you Thursday. Before we take you to the panel, ",
      "could you send over two references by end of day Friday",
      "? Either format is fine.",
    ],
    source: "Dana Whitfield · Kestrel Labs · Aug 14, 09:12",
    lineage:
      "2 threads merged. Deduped against the Aug 12 request so this only asks you once.",
    fields: [
      ["Company", "Kestrel Labs"],
      ["Role", "Senior Product Designer"],
      ["Stage", "Onsite → Panel"],
      ["Contact", "Dana Whitfield"],
      ["Due", "Fri Aug 21, EOD"],
      ["Threads", "#4412, #4390"],
    ],
  },
  {
    id: "t2",
    status: "now",
    title: "Confirm Tuesday 10:00 with Northline Systems",
    company: "Northline Systems",
    stage: "Interview 2 of 3",
    due: "Today",
    confidence: 0.91,
    evidence: [
      "We have two slots open next week: ",
      "Tuesday at 10:00 or Thursday at 15:30",
      ". Whichever suits you.",
    ],
    source: "Owen Reyes · Northline Systems · Aug 15, 16:40",
    lineage:
      "Calendar hold placed on both slots. Neither is confirmed, so Eve is holding them.",
    fields: [
      ["Company", "Northline Systems"],
      ["Role", "Staff Product Designer"],
      ["Stage", "Interview 2 of 3"],
      ["Contact", "Owen Reyes"],
      ["Due", "Today, before 18:00"],
      ["Threads", "#4501"],
    ],
  },
  {
    id: "t3",
    status: "now",
    title: "Reply to Marguerite with a scope for the take-home",
    company: "Atlas Foundry",
    stage: "Panel",
    due: "Tomorrow",
    confidence: 0.88,
    evidence: [
      "No rush on the work itself. ",
      "We would just like a rough scope and timeline back by Monday",
      ", so we can plan the panel.",
    ],
    source: "Marguerite Vance · Atlas Foundry · Aug 13, 11:05",
    lineage:
      "3 threads merged. Two earlier duplicates suppressed after the brief was re-sent.",
    fields: [
      ["Company", "Atlas Foundry"],
      ["Role", "Product Designer"],
      ["Stage", "Take-home"],
      ["Contact", "Marguerite Vance"],
      ["Due", "Mon Aug 24"],
      ["Threads", "#4288, #4301, #4356"],
    ],
  },
  {
    id: "t4",
    status: "wait",
    title: "Halyard still has not confirmed the offer timeline",
    company: "Halyard",
    stage: "Offer pending",
    due: "6 days",
    confidence: 0.79,
    evidence: [
      "Thanks for your patience while we finish the levelling. ",
      "We should have the final number to you early next week",
      ".",
    ],
    source: "Priya Anand · Halyard · Aug 10, 08:22",
    lineage:
      "Waiting six days against a commitment they made. Eve has a nudge drafted.",
    fields: [
      ["Company", "Halyard"],
      ["Role", "Design Lead"],
      ["Stage", "Offer pending"],
      ["Contact", "Priya Anand"],
      ["Silent", "6 days"],
      ["Threads", "#4102"],
    ],
  },
  {
    id: "t5",
    status: "wait",
    title: "Atlas Foundry panel feedback",
    company: "Atlas Foundry",
    stage: "Panel",
    due: "3 days",
    confidence: 0.72,
    evidence: [
      "The panel wrapped up well. ",
      "You should hear from us within the week",
      ".",
    ],
    source: "Marguerite Vance · Atlas Foundry · Aug 12, 17:48",
    lineage:
      "Within their stated window. Eve will raise this again on Aug 19.",
    fields: [
      ["Company", "Atlas Foundry"],
      ["Role", "Product Designer"],
      ["Stage", "Awaiting decision"],
      ["Contact", "Marguerite Vance"],
      ["Silent", "3 days"],
      ["Threads", "#4356"],
    ],
  },
  {
    id: "t6",
    status: "later",
    title: "Renew the Figma seat before the trial lapses",
    company: "Money",
    stage: "Renewal",
    due: "Aug 29",
    confidence: 0.97,
    evidence: [
      "Your team trial ends on ",
      "August 29",
      ". Renew to keep your files editable.",
    ],
    source: "Figma Billing · Aug 12, 06:00",
    lineage:
      "Not job search. Filed under Money, surfaced here because it has a hard date.",
    fields: [
      ["Vendor", "Figma"],
      ["Amount", "$15 / month"],
      ["Cluster", "Money"],
      ["Due", "Fri Aug 29"],
      ["Threads", "#4340"],
    ],
  },
  {
    id: "t7",
    status: "later",
    title: "Return the signed NDA to Cove & Wick",
    company: "Cove & Wick",
    stage: "Screen",
    due: "Sep 2",
    confidence: 0.85,
    evidence: [
      "Attached is the standard NDA. ",
      "No hurry, any time before our call on the 2nd",
      ".",
    ],
    source: "Ines Barros · Cove & Wick · Aug 11, 14:20",
    lineage:
      "Attachment detected and stashed. Eve will attach it back to your reply.",
    fields: [
      ["Company", "Cove & Wick"],
      ["Role", "Brand Designer"],
      ["Stage", "Screen"],
      ["Contact", "Ines Barros"],
      ["Due", "Tue Sep 2"],
      ["Threads", "#4210"],
    ],
  },
  {
    id: "t8",
    status: "done",
    title: "Send the portfolio PDF to Cove & Wick",
    company: "Cove & Wick",
    stage: "Screen",
    due: "Aug 11",
    confidence: 0.93,
    evidence: ["Would you mind sending ", "a PDF of the portfolio", "before Monday?"],
    source: "Ines Barros · Cove & Wick · Aug 08, 10:31",
    lineage: "Closed automatically when Eve saw your reply with an attachment.",
    fields: [
      ["Company", "Cove & Wick"],
      ["Closed", "Aug 11, by reply"],
      ["Threads", "#4210"],
    ],
  },
  {
    id: "t9",
    status: "done",
    title: "Reschedule the Meridian intro call",
    company: "Meridian Freight",
    stage: "Applied",
    due: "Aug 09",
    confidence: 0.81,
    evidence: [
      "Sorry to do this, but ",
      "could we move Thursday to the following week",
      "?",
    ],
    source: "Recruiting · Meridian Freight · Aug 06, 12:00",
    lineage: "Closed automatically when a new invite landed for the same thread.",
    fields: [
      ["Company", "Meridian Freight"],
      ["Closed", "Aug 09, by calendar"],
      ["Threads", "#3990"],
    ],
  },
];

export const PROMISES: readonly PromiseItem[] = [
  {
    id: "p4",
    to: "Owen Reyes · Northline Systems",
    said: "Aug 15",
    status: "due",
    due: "Today",
    quote: "I will confirm a slot today.",
    context:
      "The same commitment as the Northline task. Eve keeps it as one thing, not two.",
  },
  {
    id: "p1",
    to: "Dana Whitfield · Kestrel Labs",
    said: "Aug 14",
    status: "due",
    due: "Fri Aug 21",
    quote: "I will get those over to you by Friday.",
    context:
      "Two references. This is where the Friday deadline actually came from, you set it yourself.",
  },
  {
    id: "p6",
    to: "Tobin Wray",
    said: "Aug 05",
    status: "due",
    due: "Before Friday",
    quote: "I will let you know before I put your name down.",
    context:
      "This one gates another. The Kestrel reference goes out Friday, and Tobin has not been told.",
  },
  {
    id: "p3",
    to: "Ilse Kramer · Verge Road",
    said: "Aug 12",
    status: "late",
    due: "Sun Aug 17",
    quote: "I will confirm by the weekend whether we want a second viewing.",
    context:
      "Nothing sent since. The flat is still listed, so the door has not closed.",
  },
  {
    id: "p2",
    to: "Rae Odell · Coalfell",
    said: "Aug 13",
    status: "late",
    due: "Mon Aug 18",
    quote: "Let me come back to you on September early next week.",
    context:
      "You said early next week on the 13th. That is the same phrase you are currently annoyed at Halyard for using.",
  },
  {
    id: "p5",
    to: "Marguerite Vance · Atlas Foundry",
    said: "Aug 09",
    status: "broken",
    due: "Was Aug 15",
    quote: "I will send the scope through this week.",
    context:
      "The week ended and nothing went out. Eve suggests saying so rather than quietly delivering late.",
  },
  {
    id: "p7",
    to: "Ines Barros · Cove & Wick",
    said: "Aug 08",
    status: "kept",
    due: "Aug 08",
    quote: "Portfolio PDF coming your way today.",
    context: "Kept. Sent three hours later, closed automatically.",
  },
];

const JOB_ROWS = [
  {
    id: "halyard",
    name: "Halyard",
    role: "Design Lead",
    stageIndex: 5,
    stage: "Offer pending",
    age: "6 days quiet",
    warm: true,
    signal:
      'Priya committed to a final number "early next week" on Aug 10. Nothing since.',
  },
  {
    id: "kestrel",
    name: "Kestrel Labs",
    role: "Senior Product Designer",
    stageIndex: 4,
    stage: "Onsite",
    age: "1 day",
    warm: false,
    signal: "References requested. Panel provisionally held for the 26th.",
  },
  {
    id: "atlas",
    name: "Atlas Foundry",
    role: "Product Designer",
    stageIndex: 4,
    stage: "Panel",
    age: "3 days",
    warm: false,
    signal: "Panel complete, take-home scope outstanding on your side.",
  },
  {
    id: "northline",
    name: "Northline Systems",
    role: "Staff Product Designer",
    stageIndex: 3,
    stage: "Interview",
    age: "2 days",
    warm: false,
    signal: "Two slots offered for next week. Awaiting your pick.",
  },
  {
    id: "cove",
    name: "Cove & Wick",
    role: "Brand Designer",
    stageIndex: 2,
    stage: "Screen",
    age: "4 days",
    warm: false,
    signal: "Warm note about the portfolio. NDA sitting unsigned.",
  },
  {
    id: "meridian",
    name: "Meridian Freight",
    role: "Design Systems",
    stageIndex: 1,
    stage: "Applied",
    age: "11 days quiet",
    warm: true,
    signal: "Only an auto-acknowledgement. Going cold.",
  },
] as const;

const PLACE_ROWS = [
  {
    id: "ostler",
    name: "Ostler Lane, studio",
    role: "£1,325 · available now",
    stageIndex: 4,
    stage: "Viewed",
    age: "2 days",
    warm: true,
    signal:
      "You saw it Tuesday. They want references by Friday, same week as Kestrel.",
  },
  {
    id: "bramble",
    name: "Bramble Street, flat 4",
    role: "£1,390 · 1 bed",
    stageIndex: 3,
    stage: "Viewing booked",
    age: "Saturday 11:00",
    warm: false,
    signal: "Confirmed for Saturday. Thirty-four minutes door to door.",
  },
  {
    id: "verge",
    name: "Verge Road, flat 2",
    role: "£1,450 · 1 bed",
    stageIndex: 2,
    stage: "Enquired",
    age: "4 days quiet",
    warm: true,
    signal:
      "Ilse says it is free from Sept 1. You have not replied in four days.",
  },
  {
    id: "halsey",
    name: "Halsey Court",
    role: "£1,600 · 2 bed",
    stageIndex: 1,
    stage: "Enquired",
    age: "1 day",
    warm: false,
    signal: "Agent auto-reply only. No person on the thread yet.",
  },
  {
    id: "pike",
    name: "Pike Wharf",
    role: "£1,700 · 2 bed",
    stageIndex: 1,
    stage: "Enquired",
    age: "9 days quiet",
    warm: false,
    signal: "Over your ceiling anyway. Eve kept it because you replied once.",
  },
] as const;

export const TRACKERS: Record<string, Tracker> = {
  job: {
    id: "job",
    name: "Job Search",
    stages: ["Applied", "Screen", "Interview", "Onsite", "Offer"],
    rows: JOB_ROWS,
    note: "Six companies across 41 threads.\nStages and next steps stay current as replies arrive.",
  },
  places: {
    id: "places",
    name: "Places to Live",
    stages: ["Enquired", "Viewing", "Viewed", "Applied", "Signed"],
    rows: PLACE_ROWS,
    note:
      "Five places across twelve agent threads.\nStages are inferred from enquiries, viewings, and applications.",
  },
};

export const TRACKER_SUGGESTION = {
  id: "places",
  name: "Places to Live",
  reason:
    "Four letting agents and twelve related threads follow the same path: enquire, view, apply. A tracker would keep every place and next step together.",
} as const;

export const CLUSTERS: readonly Cluster[] = [
  {
    id: "search",
    name: "The Search",
    count: 41,
    note: "Applications, recruiters, scheduling",
  },
  {
    id: "homes",
    name: "Places to Live",
    count: 12,
    note: "Listings and viewings. Cluster created Aug 9.",
  },
  { id: "money", name: "Money", count: 8, note: "Invoices, renewals, the bank" },
  {
    id: "rest",
    name: "Everything Else",
    count: 214,
    note: "Nothing in here has asked you for anything",
  },
];

export const CLUSTER_SUGGESTIONS = [
  {
    id: "travel",
    name: "Conference and travel",
    count: 9,
    countLabel: "9 threads · 3 senders",
    reason:
      "Nine threads since Aug 2 about the same two dates in October. Flights, a ticket and a hotel hold, currently scattered.",
  },
  {
    id: "coalfell",
    name: "Coalfell, freelance",
    count: 6,
    countLabel: "6 threads · 1 client",
    reason:
      "Invoices and briefs from one client, sitting inside the job search where they keep being mistaken for applications.",
  },
] as const;

export const THREADS: Record<string, readonly MailThread[]> = {
  search: [
    {
      id: "4412",
      from: "Dana Whitfield",
      when: "Aug 14",
      subject: "Panel scheduling and references",
      quote: "could you send over two references by end of day Friday",
      eve: "Wants two references by Friday. That is your only open item here.",
      task: true,
    },
    {
      id: "4501",
      from: "Owen Reyes",
      when: "Aug 15",
      subject: "Next week?",
      quote: "We have two slots open next week: Tuesday at 10:00 or Thursday at 15:30",
      eve: "Two slots offered, neither confirmed. Holds are on your calendar.",
      task: true,
    },
    {
      id: "4102",
      from: "Priya Anand",
      when: "Aug 10",
      subject: "Re: offer timeline",
      quote: 'We should have the final number to you early next week',
      eve: 'Promised a number "early next week". That was six days ago.',
      task: true,
    },
    {
      id: "4288",
      from: "Marguerite Vance",
      when: "Aug 13",
      subject: "Take-home brief",
      quote: "We would just like a rough scope and timeline back by Monday",
      eve: "Rough scope wanted by Monday. Brief attached and stashed.",
      task: true,
    },
    {
      id: "3951",
      from: "Meridian Recruiting",
      when: "Aug 05",
      subject: "We received your application",
      quote: "We will be in touch if your profile matches an open role",
      eve: "Automated. No action, no person behind it yet.",
      task: false,
    },
    {
      id: "4210",
      from: "Ines Barros",
      when: "Aug 11",
      subject: "Loved the portfolio",
      quote: "No need to reply, just wanted to say the Coalfell work landed well",
      eve: "Positive, no ask. The NDA in the same thread is still unsigned.",
      task: true,
    },
  ],
  homes: [
    {
      id: "home-1",
      from: "Bramble Street Lettings",
      when: "Aug 15",
      subject: "Viewing confirmed, Saturday 11:00",
      quote: "We have you down for Saturday at 11:00, the code for the door is on arrival",
      eve: "Address parsed and added. Travel time is 34 minutes.",
      task: true,
    },
    {
      id: "home-2",
      from: "Ilse Kramer",
      when: "Aug 12",
      subject: "Verge Road flat, still available",
      quote: "It is still free from the 1st if you are interested, let me know either way",
      eve: "1,450 a month, free from Sept 1. You have not replied in four days.",
      task: true,
    },
    {
      id: "home-3",
      from: "Listings Alert",
      when: "Aug 16",
      subject: "6 new places near you",
      quote: "Six new listings match Flat, 1 bed, under 1500, within 40 minutes",
      eve: "Two match your saved filters. The other four are over budget.",
      task: false,
    },
  ],
  money: [
    {
      id: "money-1",
      from: "Figma Billing",
      when: "Aug 12",
      subject: "Your trial ends August 29",
      quote: "Your team trial ends on August 29. Renew to keep your files editable",
      eve: "Hard date. Fifteen a month if you keep it.",
      task: true,
    },
    {
      id: "money-2",
      from: "Bank",
      when: "Aug 14",
      subject: "Statement ready",
      quote: "Your August statement is ready to view",
      eve: "Nothing unusual. Filed.",
      task: false,
    },
    {
      id: "money-3",
      from: "Coalfell Studio",
      when: "Aug 09",
      subject: "Invoice 0114 paid",
      quote: "Payment sent this morning, thanks for the quick turnaround",
      eve: "Received. Closes the last freelance thread.",
      task: false,
    },
  ],
  travel: [
    {
      id: "travel-1",
      from: "Foundry Conf",
      when: "Aug 02",
      subject: "Your ticket, October 14–16",
      quote: "Your pass for October 14 to 16 is confirmed and non-transferable",
      eve: "Confirmed. Dates now clash with nothing in your calendar.",
      task: false,
    },
    {
      id: "travel-2",
      from: "Airline",
      when: "Aug 06",
      subject: "Hold expires in 48 hours",
      quote: "This fare is held for 48 hours and will be released after that",
      eve: "A held fare, unpaid. This is the only real deadline in the group.",
      task: true,
    },
    {
      id: "travel-3",
      from: "Hotel Marlowe",
      when: "Aug 08",
      subject: "Reservation options near the venue",
      quote: "Three rooms available within walking distance, none held yet",
      eve: "Three options, none booked. Walking distance is the middle one.",
      task: false,
    },
  ],
  coalfell: [
    {
      id: "coalfell-1",
      from: "Coalfell Studio",
      when: "Aug 09",
      subject: "Invoice 0114 paid",
      quote: "Payment sent this morning, thanks for the quick turnaround",
      eve: "Received. Nothing outstanding.",
      task: false,
    },
    {
      id: "coalfell-2",
      from: "Rae Odell",
      when: "Aug 13",
      subject: "One more sprint in September?",
      quote: "Any chance you could take one more sprint in September?",
      eve: "A real question with no date attached. Worth an answer before you sign anywhere.",
      task: true,
    },
    {
      id: "coalfell-3",
      from: "Coalfell Studio",
      when: "Jul 28",
      subject: "Brief, phase two",
      quote: "Attached is phase two for reference, nothing needed from you yet",
      eve: "Reference material. Filed, not urgent.",
      task: false,
    },
  ],
  rest: [
    {
      id: "rest-1",
      from: "Newsletters",
      when: "Ongoing",
      subject: "184 threads",
      eve: "None of these have ever received a reply from you.",
      task: false,
    },
    {
      id: "rest-2",
      from: "Receipts",
      when: "Ongoing",
      subject: "22 threads",
      eve: "Archived on arrival. Searchable, not shown.",
      task: false,
    },
    {
      id: "rest-3",
      from: "Old projects",
      when: "2024",
      subject: "8 threads",
      eve: "Dormant more than a year.",
      task: false,
    },
  ],
};

export const BRIEF = [
  [
    "Moved",
    "Owen Reyes offered two slots for next week. Neither is confirmed, and you said you would answer today.",
    "tasks",
  ],
  [
    "Quiet",
    "Halyard, six days. Priya’s own window closed on Friday.",
    "pipeline",
  ],
  [
    "Collision",
    "Friday is carrying two reference requests, Kestrel and Ostler Lane. Same day, same favour, different people.",
    "tasks",
  ],
  [
    "Missed",
    "You told Marguerite the scope would go out this week. The deadline passed without a reply.",
    "promises",
  ],
  [
    "New",
    "Two listings matched your filters overnight. Neither is over budget.",
    "mail",
  ],
  [
    "Clear",
    "Nothing new in Money, and nothing in Everything Else has asked you for anything.",
    "mail",
  ],
] as const;

export const LEARNED = [
  'Aug 12 · "let me know if" stopped reading as an ask. You corrected it three times.',
  "Aug 09 · Newsletters from 41 senders never become tasks, whatever they say.",
  "Aug 06 · Calendar invites are not tasks unless there is a question in the body.",
  'Jul 30 · "no rush" now pushes a due date out a week instead of dropping it.',
  "Jul 24 · Threads where you are on cc and never named are read, not surfaced.",
] as const;

export const COLLISION = {
  day: "Friday 21 August",
  rows: [
    ["Kestrel Labs", "Two references, by end of day", "Their deadline"],
    ["Ostler Lane", "References for the tenancy, by Friday", "Their deadline"],
  ],
  note:
    "Both requests rely on Tobin and Alia, which would mean asking each person twice in one afternoon.",
} as const;

export const RULES = [
  {
    id: "tasks",
    label: "Create tasks from clear requests",
    description:
      "A direct request with a deadline becomes a task. Everything else stays as mail.",
  },
  {
    id: "dedupe",
    label: "Merge duplicate requests",
    description:
      "The same request across several messages produces one task, not several.",
  },
  {
    id: "pipeline",
    label: "Keep multi-step work in trackers",
    description:
      "Suggest a tracker when related conversations follow the same stages.",
  },
  {
    id: "clusters",
    label: "Suggest useful mail groups",
    description:
      "Recommend a group when several threads share a clear topic.",
  },
  {
    id: "holds",
    label: "Suggest calendar holds",
    description:
      "Offer tentative holds when someone sends you a choice of times.",
  },
  {
    id: "nudge",
    label: "Draft follow-ups when someone goes quiet",
    description: "Prepare a concise follow-up for your review. Never send it automatically.",
  },
] as const;

export type CheckOption = { label: string; value: string };
export type NowCheck = {
  key: string;
  text: string;
  verified?: boolean;
  source?: string;
  question?: string;
  note?: string;
  options?: readonly CheckOption[];
};

export interface NowItem {
  id: string;
  title: string;
  to: string;
  subject: string;
  evidence: string;
  source: string;
  draft: (slots: Record<string, string>) => string;
  checks: readonly NowCheck[];
}

export const NOW_ITEMS: readonly NowItem[] = [
  {
    id: "t1",
    title: "Send Kestrel the two references they asked for",
    to: "Dana Whitfield · Kestrel Labs",
    subject: "Re: Panel scheduling and references",
    evidence: "could you send over two references by end of day Friday",
    source: "Aug 14, 09:12 · thread #4412",
    draft: (slots) =>
      `Hi Dana,\n\nGreat to meet you Thursday. My two references are ${slots.c1 || "————————————"}.\n\n${
        slots.c2 === "soften"
          ? "I am checking with them today and will confirm before Friday."
          : "Both are happy to be contacted directly this week, so Friday is no problem."
      }\n\nBest,\nJ.`,
    checks: [
      {
        key: "c1",
        text: "Names two referees",
        question: "Who should Dana contact?",
        note:
          "Both names appear in your sent mail, but Eve will not add either person until you choose them.",
        options: [
          {
            label: "Tobin Wray and Alia Ferrand",
            value: "Tobin Wray (Coalfell) and Alia Ferrand (Northgate)",
          },
          { label: "Only Tobin Wray", value: "Tobin Wray (Coalfell)" },
          { label: "Neither, I will add them", value: "[to add]" },
        ],
      },
      {
        key: "c2",
        text: "Both have agreed to be contacted",
        question: "Have you actually asked them?",
        note:
          "Your mail does not show that they agreed. The draft cannot make that claim without you.",
        options: [
          { label: "Yes, both agreed", value: "yes" },
          { label: "Not yet, soften the line", value: "soften" },
        ],
      },
      {
        key: "v1",
        text: "Friday end of day is the deadline they set",
        verified: true,
        source: "Verified · thread #4412",
      },
    ],
  },
  {
    id: "t2",
    title: "Confirm Tuesday 10:00 with Northline Systems",
    to: "Owen Reyes · Northline Systems",
    subject: "Re: Next week?",
    evidence: "Tuesday at 10:00 or Thursday at 15:30",
    source: "Aug 15, 16:40 · thread #4501",
    draft: () =>
      "Hi Owen,\n\nTuesday at 10:00 works well. I have held it on my side.\n\nSee you then,\nJ.",
    checks: [
      {
        key: "v2",
        text: "Tuesday 10:00 is free in your calendar",
        verified: true,
        source: "Verified · calendar, Aug 19",
      },
      {
        key: "v3",
        text: "No clash with the Kestrel panel on the 26th",
        verified: true,
        source: "Verified · calendar",
      },
      {
        key: "v4",
        text: "Owen is in your timezone, so 10:00 means the same thing",
        verified: true,
        source: "Verified · message headers",
      },
    ],
  },
  {
    id: "t4",
    title: "Nudge Halyard about the offer timeline",
    to: "Priya Anand · Halyard",
    subject: "Re: offer timeline",
    evidence: "We should have the final number to you early next week",
    source: "Aug 10, 08:22 · thread #4102",
    draft: (slots) => {
      if (slots.c3 === "firm") {
        return "Hi Priya,\n\nFollowing up on the levelling you mentioned on the 10th. I have another process moving, so a rough date this week would help me a lot.\n\nBest,\nJ.";
      }
      if (slots.c3 === "soft") {
        return "Hi Priya,\n\nHope the levelling is going smoothly. No rush at all, just let me know when there is news.\n\nBest,\nJ.";
      }
      return "Hi Priya,\n\nNo pressure at all, just circling back on the levelling you mentioned on the 10th. Happy to wait if it needs another week, it would only help me to know roughly when.\n\nBest,\nJ.";
    },
    checks: [
      {
        key: "v5",
        text: 'She did say "early next week" on Aug 10',
        verified: true,
        source: "Verified · thread #4102",
      },
      {
        key: "v6",
        text: "You have not already chased her",
        verified: true,
        source: "Verified · nothing sent since Aug 8",
      },
      {
        key: "c3",
        text: "Read it. Does this sound like you?",
        question: "Does the tone sound like you?",
        note:
          "Tone is personal, so this check always needs your answer before the draft can leave.",
        options: [
          { label: "Yes, send as written", value: "yes" },
          { label: "Too soft", value: "firm" },
          { label: "Too pushy", value: "soft" },
        ],
      },
    ],
  },
];

export const EVE_SCRIPT: Record<
  string,
  { text: string; draft?: string; chips?: readonly string[]; go?: "pipeline" }
> = {
  "Draft a nudge": {
    text:
      "Here is a short one. It leans on her own words, so it reads as a check-in rather than chasing.",
    draft:
      "Hi Priya,\n\nNo pressure at all, just circling back on the levelling you mentioned on the 10th. Happy to wait if it needs another week, it would only help me to know roughly when.\n\nBest,\nJ.",
    chips: ["Send it", "Make it shorter", "Not yet"],
  },
  "Make it shorter": {
    text: "Tighter. Same intent, one breath.",
    draft:
      "Hi Priya, circling back on the levelling from the 10th. Any sense of timing? Happy to wait.\n\nJ.",
    chips: ["Send it", "Put it back", "Not yet"],
  },
  "Put it back": {
    text: "Restored the longer version. It is warmer, and Priya writes long.",
    chips: ["Send it", "Not yet"],
  },
  "Send it": {
    text:
      "This demo stops at the gate. In a connected workspace the draft would open in Now for your review—Eve still cannot send it.",
    chips: ["Show me the pipeline", "What else is quiet?"],
  },
  "Show me the thread": {
    text:
      'Three messages since Aug 4. The only commitment anywhere in it is "early next week". Everything else is scheduling.',
    chips: ["Draft a nudge", "Leave it"],
  },
  "Leave it": {
    text:
      "Fine. I will re-raise it Thursday if nothing lands, and stay quiet until then.",
    chips: ["Snooze it a week", "Actually, draft the nudge"],
  },
  "Actually, draft the nudge": {
    text:
      "Here is a short one. It leans on her own words, so it reads as a check-in rather than chasing.",
    draft:
      "Hi Priya,\n\nNo pressure at all, just circling back on the levelling you mentioned on the 10th. Happy to wait if it needs another week, it would only help me to know roughly when.\n\nBest,\nJ.",
    chips: ["Send it", "Make it shorter", "Not yet"],
  },
  "Snooze it a week": {
    text: "Snoozed to Aug 23. It will not appear in Tasks until then.",
    chips: ["What else is quiet?"],
  },
  "Not yet": {
    text: "Held. The draft stays here, nothing left your account.",
    chips: ["Send it", "What else is quiet?"],
  },
  "What else is quiet?": {
    text:
      "Meridian Freight, eleven days on an auto-acknowledgement. That one I would let go. Atlas is at three days and still inside the window they gave you.",
    chips: ["Draft a nudge", "Show me the pipeline"],
  },
  "Draft a reply": {
    text: "A short acknowledgement, so it stops sitting on your side of the table.",
    draft: "Thanks, that all works. Sending the rest across today.\n\nJ.",
    chips: ["Send it", "Make it shorter", "Not yet"],
  },
  "Ask Ostler Lane to move the references to Monday": {
    text:
      "Drafted. It is the smaller of the two asks and they have no stated deadline, only a Friday habit.",
    draft:
      "Hi,\n\nCould I get the references to you Monday rather than Friday? Same two people, I would rather not ask them twice in one afternoon.\n\nThanks,\nJ.",
    chips: ["Send it", "Not yet"],
  },
  "Show me the pipeline": {
    text:
      "Opened it. Halyard and Meridian are the two marked warm, for opposite reasons.",
    chips: ["What else is quiet?"],
    go: "pipeline",
  },
};

export const AGENT_TOOLS = [
  ["list_tasks", "List open tasks with stable IDs, status, stage, and due date.", "Read", true],
  [
    "get_evidence",
    "Return the exact source sentence, Gmail thread ID, and sender for a task.",
    "Read",
    true,
  ],
  [
    "get_stash",
    "Return normalized context, source thread IDs, and the task's dedupe key.",
    "Read",
    true,
  ],
  ["search_threads", "Search only the bounded Gmail index for this workspace.", "Read", true],
  ["draft_reply", "Queue a reply in Now for review. This tool never sends.", "Write draft", true],
  [
    "answer_check",
    "Resolve an evidence check only when a Gmail source supports the answer.",
    "Gated",
    true,
  ],
  [
    "sync_gmail",
    "Fetch conversations that changed since the last successful Gmail sync.",
    "Gated",
    true,
  ],
  [
    "send_email",
    "Send one cleared Now draft after fresh human approval, with retry protection and an audit record.",
    "Gated",
    true,
  ],
] as const;

export const CONNECTED_AGENTS = [
  {
    name: "Claude Desktop",
    activity:
      "Pulled evidence for four tasks this morning. Drafted the Kestrel reply you have open in Now.",
    calls: "214 calls · 7 days",
  },
  {
    name: "Research runner",
    activity:
      "Reads the pipeline nightly and looks up who else works at each company.",
    calls: "38 calls · 7 days",
  },
  {
    name: "Calendar agent",
    activity: "Revoked Aug 12 after it tried to answer a tone check.",
    calls: "0 calls",
  },
] as const;
