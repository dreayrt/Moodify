"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Play, RefreshCw, Save, ListMusic, Loader2, Plus } from "lucide-react";
import { addTrackToPlaylist, fetchPlaylistById, type Track } from "@/lib/api-client";
import { copyPersonalizedMix, createRecommendationQueue, fetchPersonalizedMix,
  fetchPlaylistContinuation, queuePlayerTracks, recalledRecommendation, refreshPersonalizedMix,
  type RecommendationItem, type PersonalizedMix } from "@/lib/recommendation-client";
import { usePlayer } from "./player-context";

type Detail = { id: string; name: string; description: string | null; imageUrl: string | null;
  tracks: Track[]; versionId: string | null; personalized: boolean; generatedAt?: string; refreshDueAt?: string };

function detailFromMix(mix: PersonalizedMix): Detail {
  return { ...mix, personalized: true };
}

async function loadPlaylistDetail(id: string, personalized: boolean): Promise<{ detail: Detail; suggestions: RecommendationItem[] }> {
  if (personalized) return { detail: detailFromMix(await fetchPersonalizedMix(id)), suggestions: [] };
  const playlist = await fetchPlaylistById(id);
  const next = await fetchPlaylistContinuation(id).catch(() => null);
  return { detail: { ...playlist, imageUrl: playlist.coverUrl, personalized: false, versionId: playlist.updatedAt },
    suggestions: next?.sections.flatMap(section => section.items) ?? [] };
}

export default function RecommendedPlaylistDetail({ id }: { id: string }) {
  const search = useSearchParams();
  const personalized = search.get("type") === "PERSONALIZED_PLAYLIST";
  const itemId = search.get("item");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [suggestions, setSuggestions] = useState<RecommendationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const copyRequest = useRef<string | null>(null);
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  const load = useCallback(async () => {
    try {
      const result = await loadPlaylistDetail(id, personalized);
      setDetail(result.detail); setSuggestions(result.suggestions);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa thể tải playlist."); }
    finally { setLoading(false); }
  }, [id, personalized]);
  useEffect(() => {
    let cancelled = false;
    loadPlaylistDetail(id, personalized).then(result => {
      if (!cancelled) { setDetail(result.detail); setSuggestions(result.suggestions); setLoading(false); }
    }).catch(failure => {
      if (!cancelled) { setError(failure instanceof Error ? failure.message : "Chưa thể tải playlist."); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [id, personalized]);

  const play = async (trackId?: string) => {
    if (!detail) return;
    setBusy("play"); setError(null);
    try {
      const remembered = recalledRecommendation(itemId);
      const attributionToken = remembered?.entityId === id && remembered.versionId === detail.versionId ? remembered.attributionToken : undefined;
      const queue = await createRecommendationQueue({ entityType: personalized ? "PERSONALIZED_PLAYLIST" : "PLAYLIST",
        entityId: id, versionId: detail.versionId, attributionToken });
      const tracks = queuePlayerTracks(queue);
      const first = trackId ? tracks.find(t => t.id === trackId) : tracks[0];
      if (!first) throw new Error("Bài hát không còn khả dụng. Hãy tải lại danh sách.");
      playTrack(first, tracks);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa thể phát playlist."); }
    finally { setBusy(null); }
  };
  const refresh = async () => {
    setBusy("refresh"); setError(null);
    try { setDetail(detailFromMix(await refreshPersonalizedMix(id))); copyRequest.current = null; setNotice("Đã cập nhật bản phối. Danh sách đang phát vẫn được giữ nguyên."); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa thể làm mới."); }
    finally { setBusy(null); }
  };
  const copy = async () => {
    if (!detail?.versionId) return;
    setBusy("copy"); setError(null);
    try {
      copyRequest.current ||= crypto.randomUUID();
      await copyPersonalizedMix(id, detail.versionId, copyRequest.current);
      setNotice("Đã lưu bản sao riêng tư vào thư viện. Bạn có thể chỉnh sửa bản sao đó.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa thể lưu bản sao."); }
    finally { setBusy(null); }
  };
  const add = async (item: RecommendationItem) => {
    if (!item.track) return;
    setBusy(item.itemId); setError(null);
    try {
      await addTrackToPlaylist(id, item.track.spotifyId || item.track.id);
      setSuggestions(items => items.filter(candidate => candidate.entityId !== item.entityId));
      const updated = await fetchPlaylistById(id);
      setDetail({ ...updated, imageUrl: updated.coverUrl, personalized: false, versionId: updated.updatedAt });
      setNotice("Đã thêm bài vào playlist.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Chỉ chủ playlist mới có thể thêm bài."); }
    finally { setBusy(null); }
  };

  return <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-8">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white"><ArrowLeft size={16} />Khám phá nhạc</Link>
    {loading && !detail && <div className="flex items-center gap-3 py-16 text-white/55"><Loader2 className="animate-spin" />Đang tải playlist...</div>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 p-4 text-sm text-white/70"><span>{error}</span><button onClick={() => { setLoading(true); setError(null); void load(); }} className="text-purple-300">Tải lại</button></div>}
    {notice && <p role="status" className="text-sm text-purple-200">{notice} <Link className="underline" href="/dashboard/library">Mở thư viện</Link></p>}
    {detail && <>
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="aspect-square w-44 shrink-0 overflow-hidden rounded-xl bg-white/5 md:w-56">{detail.imageUrl ? <Image alt="" src={detail.imageUrl} width={224} height={224} unoptimized className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-purple-300"><ListMusic size={64} /></div>}</div>
        <div className="min-w-0 space-y-4"><p className="text-xs uppercase tracking-widest text-purple-300">{personalized ? "Bản phối dành riêng cho bạn" : "Playlist"}</p>
          <h1 className="font-display text-3xl font-bold text-white md:text-5xl">{detail.name}</h1>
          <p className="max-w-xl text-sm text-white/55">{detail.description}</p>
          <p className="text-xs text-white/40">{detail.tracks.length} bài hát{detail.generatedAt && ` · Cập nhật ${new Date(detail.generatedAt).toLocaleString("vi-VN")}`}</p>
          <div className="flex flex-wrap gap-3">
            <button disabled={!!busy || !detail.tracks.length} onClick={() => void play()} className="inline-flex items-center gap-2 rounded-full bg-purple-500 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-400 disabled:opacity-50"><Play size={16} fill="currentColor" />{busy === "play" ? "Đang mở..." : "Phát playlist"}</button>
            {personalized && <><button disabled={!!busy} onClick={() => void copy()} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-3 text-sm text-white/80 disabled:opacity-50"><Save size={16} />{busy === "copy" ? "Đang lưu..." : "Lưu bản sao"}</button>
              <button disabled={!!busy} onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-3 text-sm text-white/80 disabled:opacity-50"><RefreshCw size={16} className={busy === "refresh" ? "animate-spin" : ""} />Làm mới</button></>}
          </div>
        </div>
      </section>
      <section aria-label="Danh sách bài hát"><div className="space-y-1">{detail.tracks.map((track, index) => <button key={track.id} onClick={() => void play(track.id)} disabled={!!busy} className="group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-white/5 disabled:opacity-60">
        <span className="w-6 shrink-0 text-center text-xs text-white/35">{currentTrack?.id === track.id && isPlaying ? <span className="text-purple-300">♫</span> : index + 1}</span>
        {track.imageUrl && <Image alt="" src={track.imageUrl} width={40} height={40} unoptimized className="h-10 w-10 rounded object-cover" />}
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-white/90">{track.name}</span><span className="mt-1 block truncate text-xs text-white/45">{track.artistName}</span></span>
        <span className="text-xs text-white/35">{Math.floor((track.durationMs || 0)/60000)}:{String(Math.floor((track.durationMs || 0)/1000)%60).padStart(2,"0")}</span>
      </button>)}</div>{!detail.tracks.length && <p className="py-10 text-sm text-white/50">Playlist chưa có bài khả dụng để phát.</p>}</section>
      {!personalized && suggestions.length > 0 && <section><h2 className="mb-2 text-xl font-semibold text-white">Gợi ý thêm bài</h2><p className="mb-4 text-xs text-white/45">Chủ playlist có thể chọn thêm từng bài; nội dung hiện tại luôn do bạn quyết định.</p>
        <div className="space-y-2">{suggestions.slice(0, 8).map(item => <div key={item.itemId} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.025] p-3"><div className="min-w-0"><p className="truncate text-sm text-white/85">{item.title}</p><p className="truncate text-xs text-white/40">{item.subtitle}</p></div><button onClick={() => void add(item)} disabled={!!busy} aria-label={`Thêm ${item.title}`} className="rounded-full border border-white/15 p-2 text-purple-300 hover:bg-white/5"><Plus size={16} /></button></div>)}</div>
      </section>}
    </>}
  </div>;
}
