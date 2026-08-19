"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarRange,
  ChevronRight,
  CircleDollarSign,
  Disc3,
  Download,
  Flame,
  Heart,
  MessageSquare,
  Music2,
  Radio,
  Search,
  Sparkles,
  UploadCloud,
  Users,
} from "lucide-react";
import {
  clearAuthSession,
  getCurrentUser,
  getValidAccessToken,
  type UserProfileResponse,
} from "@/lib/auth-client";

type TabKey = "tracks" | "distribution" | "vinyl" | "comments" | "benefits";

type Stat = {
  label: string;
  value: string;
  trend: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

type Release = {
  title: string;
  type: string;
  stage: string;
  date: string;
  progress: number;
};

const KEYFRAMES = `
@keyframes artistFloat {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -10px, 0); }
}

@keyframes artistPulse {
  0%, 100% { opacity: 0.45; transform: scale(0.96); }
  50% { opacity: 0.95; transform: scale(1.02); }
}

@keyframes artistSheen {
  0% { transform: translateX(-130%) skewX(-16deg); }
  100% { transform: translateX(150%) skewX(-16deg); }
}

@keyframes artistEqualize {
  0%, 100% { transform: scaleY(0.28); opacity: 0.55; }
  50% { transform: scaleY(1); opacity: 1; }
}
`;

const STATS: Stat[] = [
  { label: "SC plays", value: "248.6K", trend: "+12.4%", icon: Activity },
  { label: "Reposts", value: "18.2K", trend: "+4.8%", icon: Radio },
  { label: "Downloads", value: "8.9K", trend: "+9.1%", icon: Download },
  { label: "Likes", value: "63.7K", trend: "+16.0%", icon: Heart },
  { label: "Comments", value: "4.3K", trend: "+7.2%", icon: MessageSquare },
];

const RELEASES: Release[] = [
  {
    title: "Neon Afterglow",
    type: "Single rollout",
    stage: "Master approved",
    date: "22 Aug",
    progress: 84,
  },
  {
    title: "Blue Hour Tapes",
    type: "EP campaign",
    stage: "Pitching playlists",
    date: "30 Aug",
    progress: 66,
  },
  {
    title: "Live at District 7",
    type: "Visual live set",
    stage: "Assets pending",
    date: "05 Sep",
    progress: 41,
  },
];

const FAN_TOUCHPOINTS = [
  { city: "Ho Chi Minh City", share: "31%", tone: "Top city" },
  { city: "Jakarta", share: "18%", tone: "Fastest growth" },
  { city: "Bangkok", share: "14%", tone: "Strong saves" },
  { city: "Manila", share: "11%", tone: "High replay rate" },
];

const COMMENT_PREVIEWS = [
  {
    name: "Annie K.",
    excerpt: "Drop at 1:12 is insane. Need a live edit for this one.",
    age: "12m ago",
  },
  {
    name: "Mika Tran",
    excerpt: "Can you release the acoustic version too? The topline is sticky.",
    age: "39m ago",
  },
  {
    name: "Sage Audio",
    excerpt: "Audience retention on the teaser is holding well above your average.",
    age: "2h ago",
  },
];

const TAB_LABELS: Array<{ key: TabKey; label: string }> = [
  { key: "tracks", label: "SoundCloud Tracks" },
  { key: "distribution", label: "Distribution" },
  { key: "vinyl", label: "Vinyl Records" },
  { key: "comments", label: "Comments" },
  { key: "benefits", label: "Benefits" },
];

function StatCard({ item, delay }: { item: Stat; delay: number }) {
  const Icon = item.icon;

  return (
    <div
      className="anim-fade-up rounded-[22px] border border-white/8 bg-white/[0.04] p-4 md:p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.05]">
          <Icon className="h-[18px] w-[18px] text-white/72" strokeWidth={1.7} />
        </div>
        <span className="rounded-full border border-[#ff8b4d]/25 bg-[#ff8b4d]/10 px-2.5 py-1 text-[10px] tracking-[0.18em] text-[#ffb488]">
          {item.trend}
        </span>
      </div>
      <p className="mt-5 font-graphik text-[28px] leading-none tracking-[-0.03em] text-white">
        {item.value}
      </p>
      <p className="mt-2 text-[12px] tracking-[0.14em] text-white/46 uppercase">
        {item.label}
      </p>
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative pb-4 text-left text-[14px] transition-colors ${
        active ? "text-white" : "text-white/48 hover:text-white/76"
      }`}
    >
      <span>{label}</span>
      <span
        className={`absolute bottom-0 left-0 h-[3px] rounded-full bg-white transition-all ${
          active ? "w-full opacity-100" : "w-8 opacity-0"
        }`}
      />
    </button>
  );
}

function WaveBars() {
  const bars = useMemo(() => Array.from({ length: 20 }, (_, i) => i), []);

  return (
    <div className="flex h-10 items-end gap-[4px]">
      {bars.map((bar) => (
        <span
          key={bar}
          className="w-[4px] rounded-full bg-gradient-to-t from-[#ff7a2c] via-[#ffc09a] to-[#eaf2ff]"
          style={{
            height: `${28 + ((bar * 17) % 60)}%`,
            transformOrigin: "bottom",
            animation: `artistEqualize ${820 + bar * 45}ms ease-in-out ${bar * 80}ms infinite`,
          }}
        />
      ))}
    </div>
  );
}

function TracksPanel() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
      <div className="anim-fade-up rounded-[28px] border border-white/8 bg-[#121316] p-5 md:p-6 shadow-[0_28px_80px_rgba(0,0,0,0.28)]" style={{ animationDelay: "760ms" }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-[0.24em] text-[#ffb488] uppercase">Upload queue</p>
            <h3 className="mt-2 font-graphik text-[28px] tracking-[-0.03em] text-white">
              Drop new audio to get started
            </h3>
          </div>
          <button
            type="button"
            className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] text-white/72 transition hover:bg-white/[0.08] md:inline-flex"
          >
            Upload history
          </button>
        </div>

        <div className="relative mt-6 overflow-hidden rounded-[26px] border border-dashed border-white/14 bg-[radial-gradient(circle_at_top,_rgba(255,122,44,0.14),_transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-7 md:p-9">
          <div className="absolute inset-0 opacity-60">
            <div className="absolute left-[10%] top-5 h-32 w-32 rounded-full bg-[#ff7a2c]/10 blur-3xl" />
            <div className="absolute bottom-0 right-[10%] h-28 w-28 rounded-full bg-[#8fb4ff]/10 blur-3xl" />
          </div>
          <div className="relative flex flex-col items-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-[18px] border border-white/10 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <UploadCloud className="h-8 w-8 text-white" strokeWidth={1.7} />
            </div>
            <p className="mt-5 text-[24px] font-graphik tracking-[-0.03em] text-white">
              Drag and drop audio files here
            </p>
            <p className="mt-2 max-w-xl text-[14px] leading-6 text-white/58">
              Keep it simple for first-time visitors: upload, set release date, and track performance without leaving the dashboard.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="group relative overflow-hidden rounded-full bg-white px-5 py-3 text-[13px] font-medium text-black transition hover:-translate-y-0.5"
              >
                <span className="relative z-10">Choose files</span>
                <span
                  className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{
                    background:
                      "linear-gradient(115deg, transparent 0%, rgba(255,122,44,0.08) 35%, rgba(255,255,255,0.85) 50%, rgba(255,122,44,0.08) 65%, transparent 100%)",
                    animation: "artistSheen 820ms ease",
                  }}
                />
              </button>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-[13px] text-white/74 transition hover:bg-white/[0.08]"
              >
                Import from archive
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="anim-fade-up rounded-[28px] border border-white/8 bg-white/[0.04] p-5 md:p-6 shadow-[0_28px_80px_rgba(0,0,0,0.22)]" style={{ animationDelay: "860ms" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.24em] text-[#9ec5ff] uppercase">Release pulse</p>
            <h3 className="mt-2 font-graphik text-[24px] tracking-[-0.03em] text-white">
              Upcoming campaigns
            </h3>
          </div>
          <CalendarRange className="h-5 w-5 text-white/42" strokeWidth={1.7} />
        </div>

        <div className="mt-5 space-y-4">
          {RELEASES.map((release) => (
            <div
              key={release.title}
              className="rounded-[22px] border border-white/8 bg-black/20 p-4 transition hover:border-white/14 hover:bg-white/[0.05]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[15px] text-white">{release.title}</p>
                  <p className="mt-1 text-[12px] text-white/48">{release.type}</p>
                </div>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/64">
                  {release.date}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-[12px] text-white/58">
                <span>{release.stage}</span>
                <span>{release.progress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#ff7a2c_0%,#ffb37a_56%,#dce9ff_100%)]"
                  style={{ width: `${release.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DistributionPanel() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {[
        { label: "Spotify", value: "142.8K streams", delta: "+18% MoM" },
        { label: "Apple Music", value: "76.4K plays", delta: "+9% MoM" },
        { label: "YouTube", value: "58.1K views", delta: "+22% MoM" },
        { label: "TikTok", value: "12.9K creates", delta: "+31% MoM" },
      ].map((item, index) => (
        <div
          key={item.label}
          className="anim-fade-up rounded-[26px] border border-white/8 bg-white/[0.04] p-6"
          style={{ animationDelay: `${760 + index * 70}ms` }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-white/64">{item.label}</p>
            <ArrowUpRight className="h-4 w-4 text-[#ffb488]" strokeWidth={1.8} />
          </div>
          <p className="mt-5 font-graphik text-[30px] tracking-[-0.03em] text-white">{item.value}</p>
          <p className="mt-2 text-[12px] tracking-[0.18em] text-[#9ec5ff] uppercase">{item.delta}</p>
        </div>
      ))}
    </div>
  );
}

function VinylPanel() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
      <div className="anim-fade-up rounded-[28px] border border-white/8 bg-white/[0.04] p-6" style={{ animationDelay: "760ms" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.24em] text-[#ffb488] uppercase">Collector drop</p>
            <h3 className="mt-2 font-graphik text-[26px] tracking-[-0.03em] text-white">
              Limited pressing in motion
            </h3>
          </div>
          <Disc3 className="h-5 w-5 text-white/44" strokeWidth={1.7} />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["Pressing run", "500 units"],
            ["Reserved", "312 pre-orders"],
            ["Margin", "$4.9K est."],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[22px] border border-white/8 bg-black/20 p-4">
              <p className="text-[12px] tracking-[0.18em] text-white/42 uppercase">{label}</p>
              <p className="mt-4 font-graphik text-[24px] tracking-[-0.03em] text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="anim-fade-up rounded-[28px] border border-white/8 bg-[#121316] p-6" style={{ animationDelay: "860ms" }}>
        <p className="text-[11px] tracking-[0.24em] text-[#9ec5ff] uppercase">Audio signature</p>
        <div className="mt-4 flex min-h-[180px] items-center justify-center rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top,_rgba(158,197,255,0.12),_transparent_40%),rgba(255,255,255,0.02)]">
          <WaveBars />
        </div>
      </div>
    </div>
  );
}

function CommentsPanel() {
  return (
    <div className="anim-fade-up rounded-[28px] border border-white/8 bg-white/[0.04] p-6" style={{ animationDelay: "760ms" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.24em] text-[#ffb488] uppercase">Community inbox</p>
          <h3 className="mt-2 font-graphik text-[26px] tracking-[-0.03em] text-white">
            Fresh audience feedback
          </h3>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] text-white/72 transition hover:bg-white/[0.08]"
        >
          Moderate
        </button>
      </div>
      <div className="mt-6 space-y-4">
        {COMMENT_PREVIEWS.map((comment) => (
          <div key={comment.name} className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14px] text-white">{comment.name}</p>
              <p className="text-[11px] text-white/44">{comment.age}</p>
            </div>
            <p className="mt-3 text-[14px] leading-6 text-white/62">{comment.excerpt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BenefitsPanel() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {[
        { title: "Insights Pro", body: "Unlock cohort retention, save rates, and skip segments." },
        { title: "Fan messaging", body: "Send lightweight drop alerts to your top listeners." },
        { title: "Early merch", body: "Bundle unreleased edits with exclusive merch windows." },
      ].map((item, index) => (
        <div
          key={item.title}
          className="anim-fade-up rounded-[28px] border border-white/8 bg-white/[0.04] p-6"
          style={{ animationDelay: `${760 + index * 80}ms` }}
        >
          <Sparkles className="h-5 w-5 text-[#ffb488]" strokeWidth={1.7} />
          <h3 className="mt-5 font-graphik text-[24px] tracking-[-0.03em] text-white">{item.title}</h3>
          <p className="mt-3 text-[14px] leading-6 text-white/58">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

function RightRail() {
  return (
    <div className="grid gap-5">
      <div className="anim-fade-up overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.04] p-5 md:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)]" style={{ animationDelay: "900ms" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.24em] text-[#9ec5ff] uppercase">Audience pulse</p>
            <h3 className="mt-2 font-graphik text-[24px] tracking-[-0.03em] text-white">
              Fans are leaning in
            </h3>
          </div>
          <Users className="h-5 w-5 text-white/40" strokeWidth={1.7} />
        </div>

        <div className="relative mt-6 rounded-[24px] border border-white/8 bg-black/20 p-5">
          <div
            className="absolute right-[-10px] top-[-12px] h-24 w-24 rounded-full bg-[#ff7a2c]/12 blur-2xl"
            style={{ animation: "artistPulse 4s ease-in-out infinite" }}
          />
          <p className="text-[42px] font-graphik leading-none tracking-[-0.04em] text-white">
            78%
          </p>
          <p className="mt-2 max-w-[220px] text-[13px] leading-6 text-white/58">
            Save-to-listen ratio is outperforming your last release cycle across the first 48 hours.
          </p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full w-[78%] rounded-full bg-[linear-gradient(90deg,#8fb4ff_0%,#dce9ff_100%)]" />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {FAN_TOUCHPOINTS.map((point) => (
            <div key={point.city} className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-black/20 px-4 py-3">
              <div>
                <p className="text-[13px] text-white">{point.city}</p>
                <p className="mt-1 text-[11px] text-white/42">{point.tone}</p>
              </div>
              <p className="text-[13px] text-[#ffb488]">{point.share}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="anim-fade-up rounded-[28px] border border-white/8 bg-[#121316] p-5 md:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)]" style={{ animationDelay: "980ms" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.24em] text-[#ffb488] uppercase">Studio actions</p>
            <h3 className="mt-2 font-graphik text-[24px] tracking-[-0.03em] text-white">
              Next best moves
            </h3>
          </div>
          <ChevronRight className="h-5 w-5 text-white/40" strokeWidth={1.7} />
        </div>
        <div className="mt-6 space-y-3">
          {[
            {
              icon: Bell,
              title: "Schedule teaser reminder",
              copy: "Best send window in your top market: tonight at 8:30 PM.",
            },
            {
              icon: CircleDollarSign,
              title: "Turn on artist monetization",
              copy: "Earnings panel is ready once your next release goes live.",
            },
            {
              icon: Flame,
              title: "Boost top-performing snippet",
              copy: "The chorus cut is trending above average completion.",
            },
          ].map((task) => {
            const Icon = task.icon;
            return (
              <div key={task.title} className="rounded-[20px] border border-white/8 bg-black/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05]">
                    <Icon className="h-[17px] w-[17px] text-white/72" strokeWidth={1.7} />
                  </div>
                  <div>
                    <p className="text-[14px] text-white">{task.title}</p>
                    <p className="mt-1 text-[12px] leading-5 text-white/52">{task.copy}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ArtistDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("tracks");
  const [authState, setAuthState] = useState<"checking" | "allowed" | "denied">(
    "checking"
  );
  const [currentUser, setCurrentUser] = useState<UserProfileResponse | null>(null);

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/dashboard");
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const guardArtistAccess = async () => {
      try {
        const token = await getValidAccessToken();
        if (!token) {
          if (!cancelled) {
            setAuthState("denied");
            router.replace("/");
          }
          return;
        }

        const profile = await getCurrentUser(token);
        const normalizedRole = profile.role.trim().toLowerCase();

        if (cancelled) {
          return;
        }

        if (normalizedRole !== "artist") {
          setAuthState("denied");
          router.replace("/dashboard");
          return;
        }

        setCurrentUser(profile);
        setAuthState("allowed");
      } catch {
        clearAuthSession();
        if (!cancelled) {
          setAuthState("denied");
          router.replace("/");
        }
      }
    };

    void guardArtistAccess();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const activePanel = useMemo(() => {
    switch (activeTab) {
      case "distribution":
        return <DistributionPanel />;
      case "vinyl":
        return <VinylPanel />;
      case "comments":
        return <CommentsPanel />;
      case "benefits":
        return <BenefitsPanel />;
      case "tracks":
      default:
        return <TracksPanel />;
    }
  }, [activeTab]);

  if (authState !== "allowed") {
    return (
      <section className="flex min-h-screen items-center justify-center bg-[#08090d] px-6 text-[#f4f2ed]">
        <div className="w-full max-w-[460px] rounded-[28px] border border-white/8 bg-white/[0.04] p-7 text-center shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
          <p className="text-[11px] tracking-[0.28em] text-[#ffb488] uppercase">
            Artist Access
          </p>
          <h1 className="mt-3 font-graphik text-[30px] tracking-[-0.04em] text-white">
            {authState === "checking"
              ? "Checking your account..."
              : "This page is only for artist accounts."}
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-white/58">
            {authState === "checking"
              ? "We are verifying your session and role before opening the artist studio."
              : "You will be redirected to the appropriate page based on your current session."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#08090d] text-[#f4f2ed]">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,122,44,0.12),_transparent_28%),radial-gradient(circle_at_80%_22%,_rgba(143,180,255,0.1),_transparent_20%),linear-gradient(180deg,#0a0b10_0%,#08090d_100%)]" />
        <div
          className="absolute right-[6%] top-28 h-40 w-40 rounded-full bg-[#ff7a2c]/10 blur-3xl"
          style={{ animation: "artistFloat 8s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-20 left-[8%] h-56 w-56 rounded-full bg-[#8fb4ff]/8 blur-3xl"
          style={{ animation: "artistFloat 10s ease-in-out 600ms infinite" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1500px] flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="anim-fade-up">
            <p className="text-[11px] tracking-[0.28em] text-white/44 uppercase">Moodify for Artists</p>
            <h1 className="mt-2 font-graphik text-[34px] tracking-[-0.04em] text-white sm:text-[40px]">
              Artist dashboard
            </h1>
          </div>

          <div className="anim-slide-right flex flex-1 flex-col gap-3 lg:ml-auto lg:max-w-[620px] lg:flex-row" style={{ animationDelay: "120ms" }}>
            <label className="flex min-h-[54px] flex-1 items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 backdrop-blur-md transition focus-within:border-white/20 focus-within:bg-white/[0.06]">
              <Search className="h-4 w-4 text-white/44" strokeWidth={1.7} />
              <input
                aria-label="Search dashboard"
                placeholder="Search tracks, campaigns, fans..."
                className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/36"
              />
            </label>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-md">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(135deg,#ff8b4d,#ffd1b5)] text-black">
                {(() => {
                  const source = (currentUser?.fullName || currentUser?.username || "Artist").trim();
                  const parts = source.split(/\s+/).filter(Boolean);
                  if (parts.length === 0) return "AR";
                  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                  return `${parts[0][0] ?? "A"}${parts[parts.length - 1][0] ?? "R"}`.toUpperCase();
                })()}
              </div>
              <div>
                <p className="text-[13px] text-white">
                  {currentUser?.fullName || currentUser?.username || "Artist"}
                </p>
                <p className="mt-0.5 text-[11px] tracking-[0.16em] text-white/42 uppercase">
                  Artist studio
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="anim-fade-up mt-6 flex flex-col gap-4 rounded-[28px] border border-white/8 bg-white/[0.04] px-5 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)] md:flex-row md:items-center md:justify-between" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-white/[0.05]">
              <UploadCloud className="h-6 w-6 text-white" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-[15px] text-white">62% of monthly upload space used</p>
              <div className="mt-2 h-2 w-[220px] max-w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[62%] rounded-full bg-[linear-gradient(90deg,#ff7a2c_0%,#ffb488_60%,#dce9ff_100%)]" />
              </div>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-[13px] text-white transition hover:bg-white/[0.08]"
          >
            Get unlimited uploads
          </button>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_340px]">
          <div className="grid gap-6">
            <div className="anim-fade-up overflow-hidden rounded-[34px] border border-white/8 bg-[linear-gradient(135deg,rgba(18,19,22,0.96)_0%,rgba(12,13,18,0.9)_58%,rgba(13,17,28,0.94)_100%)] px-5 py-6 shadow-[0_30px_90px_rgba(0,0,0,0.28)] md:px-7 md:py-7" style={{ animationDelay: "260ms" }}>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
                <div>
                  <p className="text-[11px] tracking-[0.28em] text-[#ffb488] uppercase">Artist Studio</p>
                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <h2 className="font-graphik text-[38px] leading-none tracking-[-0.05em] text-white sm:text-[48px]">
                      Build momentum
                    </h2>
                    <p className="pb-1 text-[14px] text-white/52">All-time stats update daily.</p>
                  </div>
                  <p className="mt-4 max-w-[640px] text-[15px] leading-7 text-white/60">
                    A clean command center for releases, audience signals, and artist growth. Motion is present, but calm enough to keep the page feeling premium.
                  </p>
                </div>

                <div className="relative mx-auto flex h-[190px] w-[190px] items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full border border-white/8"
                    style={{ animation: "artistPulse 5s ease-in-out infinite" }}
                  />
                  <div
                    className="absolute inset-[16px] rounded-full border border-[#ff7a2c]/30"
                    style={{ animation: "artistPulse 5s ease-in-out 400ms infinite" }}
                  />
                  <div
                    className="absolute inset-[34px] rounded-full bg-[radial-gradient(circle,_rgba(255,122,44,0.24),_rgba(255,122,44,0.04)_60%,_transparent_70%)] blur-sm"
                    style={{ animation: "artistFloat 7s ease-in-out infinite" }}
                  />
                  <div className="relative grid h-[88px] w-[88px] place-items-center rounded-full border border-white/10 bg-white/[0.06] shadow-[0_24px_50px_rgba(0,0,0,0.28)]">
                    <Music2 className="h-10 w-10 text-white" strokeWidth={1.6} />
                  </div>
                </div>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {STATS.map((item, index) => (
                  <StatCard key={item.label} item={item} delay={340 + index * 70} />
                ))}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                {[
                  { icon: BarChart3, label: "Insights", copy: "Deep listener trends" },
                  { icon: CircleDollarSign, label: "Earnings", copy: "Revenue + payouts" },
                  { icon: Users, label: "Fans", copy: "Audience growth and saves" },
                  { icon: Sparkles, label: "Benefits", copy: "Perks for artist accounts" },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="anim-fade-up flex items-center gap-4 rounded-[22px] border border-white/8 bg-black/20 p-4"
                      style={{ animationDelay: `${620 + index * 80}ms` }}
                    >
                      <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-white/[0.04]">
                        <Icon className="h-5 w-5 text-white/74" strokeWidth={1.7} />
                      </div>
                      <div>
                        <p className="text-[14px] text-white">{item.label}</p>
                        <p className="mt-1 text-[12px] text-white/44">{item.copy}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="anim-fade-up rounded-[30px] border border-white/8 bg-white/[0.03] px-5 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.18)] md:px-6" style={{ animationDelay: "520ms" }}>
              <div className="flex flex-wrap items-end gap-x-8 gap-y-4 border-b border-white/8">
                {TAB_LABELS.map((tab) => (
                  <TabButton
                    key={tab.key}
                    active={tab.key === activeTab}
                    label={tab.label}
                    onClick={() => setActiveTab(tab.key)}
                  />
                ))}
              </div>
              <div className="mt-5">{activePanel}</div>
            </div>
          </div>

          <RightRail />
        </div>

        <div className="anim-fade-up mt-6 grid gap-5 lg:grid-cols-3" style={{ animationDelay: "1080ms" }}>
          <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-5">
            <p className="text-[11px] tracking-[0.24em] text-[#ffb488] uppercase">Track energy</p>
            <h3 className="mt-2 font-graphik text-[24px] tracking-[-0.03em] text-white">Chorus retention is peaking</h3>
            <p className="mt-3 text-[14px] leading-6 text-white/58">
              Listeners are replaying the central hook and staying longer through the second drop than they did last cycle.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-5">
            <p className="text-[11px] tracking-[0.24em] text-[#9ec5ff] uppercase">A&R radar</p>
            <h3 className="mt-2 font-graphik text-[24px] tracking-[-0.03em] text-white">Playlist fit looks healthy</h3>
            <p className="mt-3 text-[14px] leading-6 text-white/58">
              Warm electronic and alt-pop buckets are the strongest lanes based on skip rate, saves, and regional replay patterns.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-5">
            <p className="text-[11px] tracking-[0.24em] text-[#ffb488] uppercase">Brand note</p>
            <h3 className="mt-2 font-graphik text-[24px] tracking-[-0.03em] text-white">Visual style stays understated</h3>
            <p className="mt-3 text-[14px] leading-6 text-white/58">
              Soft gradients, glass panels, and restrained motion keep the screen attractive without feeling noisy or over-designed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
