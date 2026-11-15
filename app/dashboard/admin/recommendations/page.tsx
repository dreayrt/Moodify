"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Plus, Loader2 } from "lucide-react";
import { fetchTracks, fetchPublicPlaylists, type Track, type Playlist } from "@/lib/api-client";
import { recommendationRequest } from "@/lib/recommendation-client";

type Campaign = { id: string; name: string; revision: number; startsAt: string; endsAt: string;
  priority: number; genres: string[]; targets: { entityType: "TRACK" | "PLAYLIST"; entityId: string }[];
  active: boolean; timezone: string };
type Readiness = { catalogTracks: number; eligibleTracks: number; publicPlaylists: number;
  requireActiveLicense: boolean; issues: Record<string, number>; demoCatalog?: boolean; standardEligibleTracks?: number };
const issueLabels: Record<string, string> = { NOT_PUBLISHED: "Chưa có trạng thái xuất bản hợp lệ", NOT_PUBLIC: "Chưa công khai",
  NOT_APPROVED: "Chưa được duyệt", NO_AUDIO: "Thiếu audio", NO_LICENSE: "Chưa liên kết giấy phép", LICENSE_NOT_EFFECTIVE: "Giấy phép chưa hoặc không còn hiệu lực" };

type Operations = {
  runtime: { startedAt: string; flags: { enabled: boolean; collaborative: boolean; campaigns: boolean; revision: number }; counters: Record<string, number> };
  outcomeQueue: { queued: number; capacity: number; circuitOpen: boolean };
  monitor?: { available: boolean; stale?: boolean; at?: string; alerts?: string[] };
};
function RecommendationOperations() {
  const [value, setValue] = useState<Operations | null>(null);
  const [error, setError] = useState('');const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const load = () => recommendationRequest<Operations>('/admin/recommendations/operations', { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setValue(data);setError(''); } })
      .catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Chưa tải được giám sát.'); });
    void load();const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 30000);
    return () => { controller.abort();clearInterval(timer); };
  }, []);
  const toggle = async () => {
    if (!value || busy) return;
    setBusy(true);setError('');
    try {
      await recommendationRequest('/admin/recommendations/controls', { method: 'PUT', body: JSON.stringify({
        enabled: !value.runtime.flags.enabled, collaborative: false, campaigns: false, expectedRevision: value.runtime.flags.revision,
      }) });
      setValue(await recommendationRequest<Operations>('/admin/recommendations/operations'));
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Chưa cập nhật được cấu hình.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-3 rounded-xl border border-white/10 p-5" aria-label="Vận hành đề xuất">
    <h2 className="text-lg font-semibold text-white">Vận hành đề xuất</h2>
    {!!error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
    {value ? <>
      <p className="text-sm text-white/65">Tạo gợi ý: {value.runtime.flags.enabled ? 'đang bật' : 'tạm dừng'} · CF: {value.runtime.flags.collaborative ? 'bật' : 'tắt'} · Campaign: {value.runtime.flags.campaigns ? 'bật' : 'tắt'}</p>
      <p className="text-sm text-white/65">Hàng đợi kết quả nghe: {value.outcomeQueue.queued}/{value.outcomeQueue.capacity} · {value.outcomeQueue.circuitOpen ? 'đang ngắt để chờ khôi phục' : 'đang nhận dữ liệu'}</p>
      <p className="text-sm text-white/65">Giám sát: {!value.monitor?.available ? 'chưa có dữ liệu' : value.monitor.stale ? 'dữ liệu quá hạn' : 'đang cập nhật'}</p>
      {value.monitor?.alerts?.map(code => <p key={code} className="text-xs text-amber-200">Cảnh báo: {code}</p>)}
      <button disabled={busy} onClick={() => void toggle()} className="rounded-lg border border-purple-300/30 px-4 py-2 text-sm text-purple-200 disabled:opacity-50">{busy ? 'Đang cập nhật...' : value.runtime.flags.enabled ? 'Tạm dừng tạo gợi ý mới' : 'Bật lại tạo gợi ý'}</button>
      <p className="text-xs text-white/40">Thay đổi này luôn giữ kiểm tra quyền nội dung. CF và campaign được giữ tắt trong đợt phát hành hiện tại.</p>
    </> : <p className="text-sm text-white/50">Đang tải trạng thái...</p>}
  </section>;
}

export default function RecommendationCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(0);
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [priority, setPriority] = useState(50);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Promise.all([recommendationRequest<Campaign[]>("/admin/recommendations/campaigns"), fetchTracks({ size: 500 }), fetchPublicPlaylists(),
      recommendationRequest<Readiness>("/admin/recommendations/readiness")])
      .then(([items, catalog, lists, readiness]) => { if (!cancelled) { setCampaigns(items); setTracks(catalog.content); setPlaylists(lists); setReadiness(readiness); setClock(Date.now()); setLoading(false); } })
      .catch(failure => { if (!cancelled) { setError(failure instanceof Error ? failure.message : "Chưa thể tải dữ liệu."); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 60_000); return () => clearInterval(timer); }, []);

  const refresh = async () => setCampaigns(await recommendationRequest<Campaign[]>("/admin/recommendations/campaigns"));
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      if (!selected.size) throw new Error("Hãy chọn ít nhất một bài hát hoặc playlist.");
      const targets = [...selected].map(key => { const colon = key.indexOf(":"); return { entityType: key.slice(0, colon), entityId: key.slice(colon + 1) }; });
      await recommendationRequest("/admin/recommendations/campaigns", { method: "POST", body: JSON.stringify({ name,
        active: true, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh",
        startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), priority,
        genres: [], targets, expectedRevision: 1 }) });
      await refresh(); setName(""); setSelected(new Set());
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa thể tạo đợt tuyển chọn."); }
    finally { setBusy(false); }
  };
  const toggle = async (campaign: Campaign) => {
    setBusy(true); setError(null);
    try {
      await recommendationRequest(`/admin/recommendations/campaigns/${campaign.id}`, { method: "PUT", body: JSON.stringify({ ...campaign,
        active: !campaign.active, expectedRevision: campaign.revision }) });
      await refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa thể cập nhật."); }
    finally { setBusy(false); }
  };
  const candidates = [...tracks.map(track => ({ key: `TRACK:${track.id}`, title: track.name, subtitle: track.artistName })),
    ...playlists.map(playlist => ({ key: `PLAYLIST:${playlist.id}`, title: playlist.name, subtitle: "Playlist công khai" }))]
    .filter(item => `${item.title} ${item.subtitle}`.toLocaleLowerCase("vi-VN").includes(query.toLocaleLowerCase("vi-VN")));

  return <div className="mx-auto max-w-6xl space-y-7 px-4 py-6 md:px-8">
    <Link href="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white"><ArrowLeft size={16} />Quản trị</Link>
    <div><p className="mb-2 text-xs uppercase tracking-widest text-purple-300">Nội dung theo thời điểm</p><h1 className="font-display text-3xl font-bold text-white">Các đợt tuyển chọn</h1><p className="mt-3 max-w-2xl text-sm text-white/50">Đặt lịch nội dung cho mùa, sự kiện và đợt phát hành. Nội dung được phối với sở thích người nghe trong thời gian hiệu lực.</p></div>
    {error && <p role="alert" className="rounded-lg border border-white/15 p-4 text-sm text-white/70">{error}</p>}
    <RecommendationOperations />
    {readiness && <section className="space-y-3 rounded-xl border border-white/10 p-5" aria-label="Tình trạng kho nhạc"><h2 className="text-lg font-semibold text-white">Tình trạng kho nhạc cho đề xuất</h2>
      {readiness.demoCatalog && <p className="text-sm text-amber-200/85">Đang phục vụ DEMO · {readiness.standardEligibleTracks ?? 0} bài đủ điều kiện quyền chuẩn.</p>}
      <p className="text-sm text-white/65">{readiness.eligibleTracks}/{readiness.catalogTracks} bài đủ điều kiện đề xuất · {readiness.publicPlaylists} playlist công khai</p>
      {readiness.eligibleTracks === 0 && <p className="text-sm text-amber-200/85">Kho nhạc cần hoàn thiện trạng thái nội dung và quyền phát trước khi tạo gợi ý cho người nghe.</p>}
      <div className="grid gap-2 text-xs text-white/45 sm:grid-cols-2">{Object.entries(readiness.issues).filter(([, count]) => count > 0).map(([code, count]) => <p key={code}>{issueLabels[code] || code}: {count}</p>)}</div>
      <p className="text-xs text-white/35">Một bài có thể thiếu nhiều điều kiện cùng lúc.</p><Link href="/dashboard/admin" className="inline-block text-xs text-purple-300 underline">Mở quản trị nội dung</Link>
    </section>}
    {loading ? <p className="flex items-center gap-2 text-sm text-white/50"><Loader2 size={16} className="animate-spin" />Đang tải...</p> : <>
      <section className="space-y-3" aria-label="Các đợt hiện có">{campaigns.map(campaign => <article key={campaign.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 p-4">
        <div><h2 className="font-semibold text-white">{campaign.name}</h2><p className="mt-1 text-xs text-white/45">{new Date(campaign.startsAt).toLocaleString("vi-VN")} – {new Date(campaign.endsAt).toLocaleString("vi-VN")} · {campaign.targets.length} nội dung</p><p className="mt-2 text-xs text-purple-300">{!campaign.active ? "Đang tạm dừng" : Date.parse(campaign.endsAt) <= clock ? "Đã kết thúc" : Date.parse(campaign.startsAt) > clock ? "Đã lên lịch" : "Đang diễn ra"}</p></div>
        <button disabled={busy} onClick={() => void toggle(campaign)} className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/75 disabled:opacity-50">{campaign.active ? "Tạm dừng" : "Bật lại"}</button>
      </article>)}{!campaigns.length && <p className="text-sm text-white/45">Chưa có đợt tuyển chọn nào.</p>}</section>
      <form onSubmit={event => void create(event)} className="space-y-5 rounded-xl border border-white/10 p-5">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-white"><CalendarDays size={20} />Tạo đợt tuyển chọn</h2>
        <label className="block space-y-2 text-sm text-white/65"><span>Tên chương trình</span><input required maxLength={150} value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white" placeholder="Ví dụ: Âm nhạc mùa lễ hội" /></label>
        <div className="grid gap-4 sm:grid-cols-3"><label className="space-y-2 text-sm text-white/65"><span>Bắt đầu (giờ trên thiết bị)</span><input required type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white [color-scheme:dark]" /></label>
          <label className="space-y-2 text-sm text-white/65"><span>Kết thúc</span><input required type="datetime-local" value={endsAt} min={startsAt} onChange={e => setEndsAt(e.target.value)} className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white [color-scheme:dark]" /></label>
          <label className="space-y-2 text-sm text-white/65"><span>Mức ưu tiên (0–100)</span><input required type="number" min={0} max={100} value={priority} onChange={e => setPriority(Number(e.target.value))} className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white" /></label></div>
        <div className="space-y-3"><label className="block text-sm text-white/65" htmlFor="campaign-content-search">Chọn nội dung · {selected.size} đã chọn</label><input id="campaign-content-search" value={query} onChange={e => setQuery(e.target.value)} className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white" placeholder="Tìm bài hát, nghệ sĩ hoặc playlist" />
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg bg-white/[0.025] p-2">{candidates.map(item => <label key={item.key} className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-white/5"><input type="checkbox" checked={selected.has(item.key)} onChange={e => setSelected(prior => { const next = new Set(prior); if (e.target.checked) next.add(item.key); else next.delete(item.key); return next; })} className="accent-purple-500" /><span className="min-w-0"><span className="block truncate text-sm text-white/85">{item.title}</span><span className="block truncate text-xs text-white/40">{item.subtitle}</span></span></label>)}</div>
        </div><button disabled={busy || !selected.size} className="inline-flex items-center gap-2 rounded-full bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-400 disabled:opacity-50"><Plus size={16} />{busy ? "Đang lưu..." : "Lên lịch tuyển chọn"}</button>
      </form>
    </>}
  </div>;
}
