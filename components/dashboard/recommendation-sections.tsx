"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Play, ListMusic, Music2, Loader2, RefreshCw, X, ArrowUpRight } from "lucide-react";
import { usePlayer } from "./player-context";
import { createRecommendationQueue, fetchRecommendationHome, queuePlayerTracks,
  recommendationFeedback, recordRecommendationEvent, rememberRecommendation,
  type RecommendationHome, type RecommendationItem } from "@/lib/recommendation-client";

function RecommendationCard({ item, onPlay, onOpen, onHide, busy }: {
  item: RecommendationItem; onPlay: () => void; onOpen: () => void; onHide: () => void; busy: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const recorded = useRef(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || recorded.current) return;
    let visible = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (timer) clearTimeout(timer);
      if (visible && document.visibilityState === "visible" && !recorded.current) {
        timer = setTimeout(() => { recorded.current = true; recordRecommendationEvent(item, "IMPRESSION"); }, 1000);
      }
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting && entry.intersectionRatio >= 0.5; update(); }, { threshold: [0, 0.5] });
    observer.observe(node);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); if (timer) clearTimeout(timer); document.removeEventListener("visibilitychange", update); };
  }, [item]);

  return <article ref={ref} className="group relative min-w-0 rounded-xl bg-white/[0.025] p-3 transition-colors hover:bg-white/[0.055]">
    <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-white/5">
      <button onClick={onOpen} className="h-full w-full" aria-label={`Mở ${item.title}`}>
        {item.imageUrl ? <Image src={item.imageUrl} alt="" width={320} height={320} unoptimized className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /> :
          <span className="flex h-full items-center justify-center text-purple-300/60">{item.entityType === "TRACK" ? <Music2 size={44} /> : <ListMusic size={44} />}</span>}
      </button>
      <button onClick={onHide} aria-label={`Ẩn ${item.title}`} className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white/70 hover:text-white"><X size={14} /></button>
      <button onClick={onPlay} disabled={busy} aria-label={`Phát ${item.title}`} className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-white shadow-lg transition-colors hover:bg-purple-400 disabled:opacity-60">
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
      </button>
    </div>
    <button onClick={onOpen} className="block max-w-full truncate text-left text-sm font-semibold text-white hover:text-purple-200" title={item.title}>{item.title}</button>
    <p className="mt-1 truncate text-xs text-white/50">{item.entityType === "TRACK" ? item.subtitle : `${item.trackCount} bài hát`}</p>
    <p className="mt-2 line-clamp-2 min-h-8 text-[11px] leading-4 text-white/35">{item.reason}</p>
  </article>;
}

export default function RecommendationSections() {
  const [home, setHome] = useState<RecommendationHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [lastHidden, setLastHidden] = useState<RecommendationItem | null>(null);
  const router = useRouter();
  const { playTrack } = usePlayer();

  const load = useCallback(async (signal?: AbortSignal) => {
    try { const result = await fetchRecommendationHome(signal); if (!signal?.aborted) setHome(result); }
    catch (failure) { if (!signal?.aborted) setError(failure instanceof Error ? failure.message : "Chưa thể tải gợi ý."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetchRecommendationHome(controller.signal).then(result => {
      if (!controller.signal.aborted) { setHome(result); setLoading(false); }
    }).catch(failure => {
      if (!controller.signal.aborted) { setError(failure instanceof Error ? failure.message : "Chưa thể tải gợi ý."); setLoading(false); }
    });
    return () => controller.abort();
  }, []);

  const play = async (item: RecommendationItem) => {
    setBusy(item.itemId); setError(null);
    try {
      const queue = await createRecommendationQueue(item);
      const tracks = queuePlayerTracks(queue);
      if (tracks.length === 0) throw new Error("Chưa có bài đủ điều kiện để phát trong danh sách này.");
      playTrack(tracks[0], tracks);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa thể phát nội dung."); }
    finally { setBusy(null); }
  };
  const open = (item: RecommendationItem) => {
    recordRecommendationEvent(item, "OPEN");
    if (item.entityType === "TRACK") { void play(item); return; }
    rememberRecommendation(item);
    router.push(`/dashboard/recommendations/${encodeURIComponent(item.entityId)}?type=${item.entityType}&item=${item.itemId}`);
  };
  const hide = async (item: RecommendationItem) => {
    try {
      await recommendationFeedback(item, true);
      setHidden(prior => new Set([...prior, `${item.entityType}:${item.entityId}`])); setLastHidden(item);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa thể lưu lựa chọn."); }
  };
  const undo = async () => {
    if (!lastHidden) return;
    try {
      await recommendationFeedback(lastHidden, false);
      setHidden(prior => { const next = new Set(prior); next.delete(`${lastHidden.entityType}:${lastHidden.entityId}`); return next; });
      setLastHidden(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa thể hoàn tác."); }
  };

  return <div className="flex flex-col gap-9" aria-label="Gợi ý cá nhân">
    {error && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4 text-sm text-white/60">
      <span>{error}</span><button onClick={() => { setLoading(true); setError(null); void load(); }} className="flex items-center gap-2 text-purple-300"><RefreshCw size={14} />Thử lại</button>
    </div>}
    {lastHidden && <div role="status" className="flex items-center gap-3 text-xs text-white/60"><span>Đã ẩn {lastHidden.title}.</span><button onClick={() => void undo()} className="text-purple-300 underline">Hoàn tác</button></div>}
    {loading && !home && <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Đang tải gợi ý">{[0,1,2,3].map(i => <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-white/5" />)}</div>}
    {home?.sections.map(section => {
      const items = section.items.filter(item => !hidden.has(`${item.entityType}:${item.entityId}`));
      if (!items.length) return null;
      return <section key={section.id} aria-labelledby={`rec-${section.id}`}>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><h2 id={`rec-${section.id}`} className="font-display text-xl font-bold text-white md:text-2xl">{section.title}</h2><p className="mt-1 text-xs text-white/45">{section.description}</p></div>
          {section.id === "personal_mixes" && <Link href="/dashboard/recommendations" className="flex shrink-0 items-center gap-1 text-xs text-purple-300">Bản phối của tôi<ArrowUpRight size={14} /></Link>}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{items.map(item => <RecommendationCard key={item.itemId} item={item} busy={busy === item.itemId} onPlay={() => void play(item)} onOpen={() => open(item)} onHide={() => void hide(item)} />)}</div>
      </section>;
    })}
    {home && !home.sections.some(section => section.items.length) && <p className="py-4 text-sm text-white/50">Chưa có nội dung phù hợp để đề xuất. Bạn có thể tiếp tục khám phá thư viện nhạc.</p>}
  </div>;
}
