"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, Download, Loader2, Music2, Plus, RefreshCw, Search, Server, X } from "lucide-react";
import {
  cancelKaraokeJob, createKaraokeJob, getKaraokeResource, karaokeAssetUrl, karaokeSourceBlob,
  listKaraokeJobs, listKaraokeResources, publishKaraokeVersion, retryKaraokeJob,
  type KaraokeResource, type KaraokeVersion, type ProcessingJob, type ResourceDetail, type ResourceList,
} from "@/lib/api/admin-karaoke-client";
import s from "./karaoke-resources-tab.module.css";

type Props = { onToast: (message: string, type?: "success" | "error" | "info" | "warning") => void };
const labels: Record<string, string> = { missing: "Chưa có tài nguyên", running: "Đang xử lý", review: "Chờ duyệt", ready: "Đã xuất bản", queued: "Đang chờ", preparing: "Chuẩn bị âm thanh", separating: "Tách nhạc", reference: "Tạo dữ liệu cao độ", validating: "Kiểm tra kết quả", completed: "Hoàn tất · Chờ duyệt", failed: "Thất bại", cancelled: "Đã hủy", interrupted: "Bị gián đoạn" };
const date = (value?: string) => value ? new Date(value).toLocaleString("vi-VN") : "—";
const bytes = (value?: number) => value == null ? "—" : `${(value / 1024 ** 2).toFixed(1)} MB`;
const duration = (value?: number) => value == null ? "—" : `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
const message = (e: unknown) => e instanceof Error ? e.message : "Có lỗi xảy ra. Vui lòng thử lại.";

export function KaraokeResourcesTab({ onToast }: Props) {
  const [view, setView] = useState<"library" | "active" | "history">("library");
  const [page, setPage] = useState(0), [query, setQuery] = useState(""), [search, setSearch] = useState(""), [filter, setFilter] = useState("all");
  const [data, setData] = useState<ResourceList>(), [jobs, setJobs] = useState<{ items: ProcessingJob[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<ResourceDetail>(), [selectedVersion, setSelectedVersion] = useState("");
  const [creating, setCreating] = useState(false), [choice, setChoice] = useState<KaraokeResource>(), [file, setFile] = useState<File>();
  const [createSearch, setCreateSearch] = useState(""), [choices, setChoices] = useState<KaraokeResource[]>([]), [choiceError, setChoiceError] = useState("");
  const [preview, setPreview] = useState<{ url: string; label: string }>(), [previewLoading, setPreviewLoading] = useState(false);
  const audio = useRef<HTMLAudioElement>(null), position = useRef(0), ownedUrl = useRef(""), detailRequest = useRef(0), previewRequest = useRef(0);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => { const t = setTimeout(() => { setSearch(query); setPage(0); }, 350); return () => clearTimeout(t); }, [query]);
  const load = useCallback(async () => {
    const [resources, tasks] = await Promise.all([
      listKaraokeResources(view === "library" ? page : 0, search, filter),
      view === "library" ? Promise.resolve(null) : listKaraokeJobs(page, view),
    ]);
    return { resources, tasks };
  }, [view, page, search, filter]);
  useEffect(() => {
    let disposed = false, inFlight = false;
    const refresh = async () => {
      if (inFlight) return; inFlight = true;
      try { const result = await load(); if (!disposed) { setData(result.resources); if (result.tasks) setJobs(result.tasks); setError(""); } }
      catch (e) { if (!disposed) setError(message(e)); }
      finally { inFlight = false; if (!disposed) setLoading(false); }
    };
    const initial = setTimeout(() => { setLoading(true); void refresh(); }, 0);
    const timer = setInterval(() => { setTick(Date.now()); void refresh(); }, 5000);
    return () => { disposed = true; clearTimeout(initial); clearInterval(timer); };
  }, [load]);
  useEffect(() => () => { if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current); }, []);
  useEffect(() => {
    if (!creating) return; let disposed = false;
    const timer = setTimeout(() => {
      void listKaraokeResources(0, createSearch).then(result => { if (!disposed) { setChoices(result.items); setChoiceError(""); } })
        .catch(e => { if (!disposed) setChoiceError(message(e)); });
    }, 300);
    return () => { disposed = true; clearTimeout(timer); };
  }, [creating, createSearch]);

  const refreshNow = async () => { try { const result = await load(); setData(result.resources); if (result.tasks) setJobs(result.tasks); setError(""); } catch (e) { setError(message(e)); } };
  const act = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true); try { await work(); onToast(success, "success"); await refreshNow(); return true; }
    catch (e) { onToast(message(e), "error"); return false; } finally { setBusy(false); }
  };
  const stopPreview = () => {
    previewRequest.current++; audio.current?.pause(); setPreview(undefined); setPreviewLoading(false); position.current = 0;
    if (ownedUrl.current) { URL.revokeObjectURL(ownedUrl.current); ownedUrl.current = ""; }
  };
  const openDetail = async (songId: string) => {
    stopPreview(); const requestId = ++detailRequest.current;
    try { const result = await getKaraokeResource(songId); if (requestId === detailRequest.current) { setDetail(result); setSelectedVersion(result.versions[0]?.assetVersion ?? ""); } }
    catch (e) { onToast(message(e), "error"); }
  };
  const listen = async (role: "source" | "instrumental" | "vocals", version?: KaraokeVersion) => {
    if (!detail) return;
    const requestId = ++previewRequest.current; position.current = audio.current?.currentTime ?? 0; audio.current?.pause(); setPreviewLoading(true);
    try {
      let url: string;
      if (role === "source") {
        const blob = await karaokeSourceBlob(detail.songId, version?.jobId);
        if (requestId !== previewRequest.current) return;
        const newUrl = URL.createObjectURL(blob); if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current); ownedUrl.current = newUrl; url = newUrl;
      } else url = version ? karaokeAssetUrl(version, role) : "";
      if (!url) throw new Error("Chưa có file để nghe.");
      if (requestId === previewRequest.current) setPreview({ url, label: role === "source" ? "Bản gốc" : role === "instrumental" ? "Nhạc nền" : "Vocal" });
    } catch (e) { onToast(message(e), "error"); }
    finally { if (requestId === previewRequest.current) setPreviewLoading(false); }
  };
  const download = async (version: KaraokeVersion, role: string) => {
    try {
      const response = await fetch(karaokeAssetUrl(version, role)); if (!response.ok) throw new Error("Không tải được file.");
      const url = URL.createObjectURL(await response.blob()); const a = document.createElement("a"); a.href = url; a.download = `${detail?.title ?? version.songId}-${role}.${role === "pitchReference" ? "json" : "wav"}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) { onToast(message(e), "error"); }
  };
  const newJob = (resource?: KaraokeResource) => { setChoice(resource); setFile(undefined); setCreateSearch(""); setCreating(true); };
  const version = detail?.versions.find(v => v.assetVersion === selectedVersion);
  const total = view === "library" ? data?.total ?? 0 : jobs.total;
  const elapsed = (j: ProcessingJob) => j.startedAt ? duration(Math.max(0, ((j.finishedAt ? new Date(j.finishedAt).getTime() : tick) - new Date(j.startedAt).getTime()) / 1000)) : "—";

  return <div className={s.page}>
    <div className={s.heading}><div><h1><Music2 size={23} />Quản lý tài nguyên karaoke</h1><p>Tách nhạc gốc thành nhạc nền và vocal, kiểm tra và xuất bản cho thư viện karaoke.</p></div><button className={s.primary} onClick={() => newJob()}><Plus size={16} />Tạo tác vụ tách nhạc</button></div>
    <div className={s.service}><Server size={16} /><strong>{data?.worker.online ? "Dịch vụ xử lý đang kết nối" : "Dịch vụ xử lý chưa kết nối"}</strong><span className={s.dot} data-online={data?.worker.online} /><span>{data?.worker.capacity?.reason || "CPU · Xử lý lần lượt từng bài"}</span></div>
    <div className={s.stats}>{["missing", "running", "review", "ready"].map(key => <button key={key} onClick={() => { setView("library"); setFilter(key); setPage(0); }}><span>{labels[key]}</span><strong>{data?.counts[key] ?? "—"}</strong><span>{key === "ready" ? "Sẵn sàng trong thư viện" : key === "review" ? "Nghe thử trước khi xuất bản" : key === "running" ? "Đang chờ hoặc đang chạy" : "Có thể tạo tác vụ mới"}</span></button>)}</div>
    <section className={s.panel}>
      <div className={s.tabs}>{[["library", "Thư viện tài nguyên"], ["active", "Hàng đợi xử lý"], ["history", "Lịch sử xử lý"]].map(([key, label]) => <button key={key} data-active={view === key} onClick={() => { setView(key as typeof view); setPage(0); }}>{label}</button>)}<button className={s.refresh} title="Làm mới" onClick={() => void refreshNow()}><RefreshCw size={15} /></button></div>
      {view === "library" && <div className={s.toolbar}><label><Search size={16} /><input placeholder="Tìm tên bài hát hoặc ca sĩ..." value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Lọc trạng thái" value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}><option value="all">Tất cả trạng thái</option>{["missing", "running", "review", "ready"].map(k => <option key={k} value={k}>{labels[k]}</option>)}</select></div>}
      {error && <div className={s.error} role="alert">{error}<button onClick={() => void refreshNow()}>Thử lại</button></div>}
      {loading ? <div className={s.empty}><Loader2 className={s.spin} />Đang tải dữ liệu...</div> : <div className={s.tableWrap}><table><thead><tr>{(view === "library" ? ["Bài hát / Ca sĩ", "Nhạc gốc", "Tài nguyên", "Trạng thái", "Thao tác"] : ["Bài hát / Người tạo", "Bước xử lý", "Thời gian", "Kết quả", "Thao tác"]).map(t => <th key={t}>{t}</th>)}</tr></thead><tbody>
        {view === "library" ? data?.items.map(row => <tr key={row.songId}>
          <td><div className={s.track}><div className={s.cover}><Music2 size={19} /></div><div><strong>{row.title || "Bài hát không tên"}</strong><small>{row.artist || "Chưa có ca sĩ"}</small></div></div></td>
          <td><span className={row.sourceAvailable ? s.available : s.muted}>{row.sourceAvailable ? "Có file nguồn" : "Thiếu file nguồn"}</span></td>
          <td><div className={s.chips}><span data-ready={!!row.published?.assets?.instrumental}>Nhạc nền</span><span data-ready={!!row.published?.assets?.vocals}>Vocal</span><span data-ready={row.published?.scoringReference?.status === "sufficient"}>Chấm điểm</span></div></td>
          <td><span className={s.badge} data-status={row.status}>{labels[row.status]}</span>{row.latestJob?.status === "failed" && <small className={s.failure}>Lần xử lý gần nhất thất bại</small>}</td>
          <td><div className={s.actions}><button onClick={() => void openDetail(row.songId)}>Chi tiết</button><button disabled={row.status === "running"} onClick={() => newJob(row)}>{row.published ? "Tách lại" : "Tách nhạc"}</button></div></td>
        </tr>) : jobs.items.map(j => <tr key={j.id}>
          <td><strong>{j.title}</strong><small>{j.createdBy} · {date(j.createdAt)}</small><small className={s.mono}>{j.id}</small></td>
          <td><span className={s.badge} data-status={j.status}>{j.status === "running" ? labels[j.stage] ?? j.stage : j.status === "completed" && j.publishedAt ? "Đã xuất bản" : labels[j.status] ?? j.status}</span>{j.status === "running" && <div className={s.working}><Loader2 size={12} className={s.spin} />{j.cancelRequested ? "Đang yêu cầu dừng..." : "Đang xử lý trên máy chủ"}</div>}</td>
          <td><span className={s.time}><Clock3 size={13} />{elapsed(j)}</span><small>{j.finishedAt ? date(j.finishedAt) : "Tác vụ tiếp tục khi đóng trang"}</small></td>
          <td>{j.error ? <span className={s.failure}>{j.error}</span> : j.status === "completed" ? "Có thể nghe thử và duyệt" : "—"}</td>
          <td><div className={s.actions}><button onClick={() => void openDetail(j.songId)}>Chi tiết</button>{["queued", "running"].includes(j.status) ? <button disabled={busy || j.cancelRequested} onClick={() => void act(() => cancelKaraokeJob(j.id), "Đã gửi yêu cầu hủy tác vụ.")}>Hủy</button> : ["failed", "cancelled", "interrupted"].includes(j.status) && <button disabled={busy} onClick={() => void act(() => retryKaraokeJob(j.id), "Đã tạo tác vụ thử lại.")}>Thử lại</button>}</div></td>
        </tr>)}
      </tbody></table>{total === 0 && <div className={s.empty}><Music2 size={30} /><strong>{view === "library" ? "Không tìm thấy bài hát" : "Chưa có tác vụ"}</strong><span>{view === "library" ? "Thử đổi từ khóa hoặc bộ lọc." : "Tạo tác vụ để bắt đầu chuẩn bị tài nguyên karaoke."}</span></div>}</div>}
      <div className={s.pagination}><span>{total} {view === "library" ? "bài hát" : "tác vụ"}</span><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</button><span>Trang {page + 1} / {Math.max(1, Math.ceil(total / 20))}</span><button disabled={(page + 1) * 20 >= total} onClick={() => setPage(p => p + 1)}>Sau</button></div>
    </section>
    <p className={s.note}>Xử lý bằng CPU có thể mất nhiều thời gian. Bạn có thể rời trang và quay lại theo dõi. Kết quả chỉ được sử dụng sau khi quản trị viên duyệt.</p>

    {creating && <div className={s.backdrop}><section className={`${s.dialog} ${s.create}`} role="dialog" aria-modal="true" aria-labelledby="create-karaoke-title"><div className={s.dialogHead}><h2 id="create-karaoke-title">Tạo tác vụ tách nhạc</h2><button disabled={busy} aria-label="Đóng" onClick={() => setCreating(false)}><X size={19} /></button></div>
      <div className={s.dialogBody}><label className={s.field}>Tìm bài hát<input value={createSearch} onChange={e => setCreateSearch(e.target.value)} placeholder="Nhập tên bài hát hoặc ca sĩ..." /></label>
      {choiceError && <p className={s.failure}>{choiceError}</p>}<div className={s.choices}>{choices.map(t => <button key={t.songId} data-selected={choice?.songId === t.songId} onClick={() => setChoice(t)}><span><strong>{t.title}</strong><small>{t.artist}</small></span><span>{choice?.songId === t.songId ? <CheckCircle2 size={17} /> : t.sourceAvailable ? "Có nguồn" : "Cần tải nguồn"}</span></button>)}</div>
      {choice && <p className={s.selected}>Đã chọn: <strong>{choice.title}</strong> · {choice.artist}</p>}
      <label className={s.field}>File nguồn thay thế (tùy chọn)<input type="file" accept=".mp3,.wav,.flac,.m4a,.ogg,.aac" onChange={e => setFile(e.target.files?.[0])} /><small>Dùng nguồn có sẵn nếu không chọn file. MP3, WAV, FLAC, M4A, OGG, AAC · tối đa 128 MiB · 30 phút.</small></label>
      <div className={s.info}><strong>Đầu ra: Nhạc nền + Vocal + Dữ liệu cao độ</strong><p>Mô hình Mel-Band RoFormer Karaoke · Xử lý CPU trên máy chủ. Kết quả sẽ chờ bạn nghe thử và duyệt.</p></div></div>
      <div className={s.dialogFoot}><button disabled={busy} onClick={() => setCreating(false)}>Đóng</button><button className={s.primary} disabled={busy || !choice || (!choice.sourceAvailable && !file) || (file?.size ?? 0) > 128 * 1024 ** 2 || choice?.status === "running"} onClick={async () => { if (choice && await act(() => createKaraokeJob(choice.songId, file), "Đã xếp hàng tác vụ tách nhạc.")) { setCreating(false); setView("active"); setPage(0); } }}>{busy ? <Loader2 size={16} className={s.spin} /> : <Plus size={16} />}Bắt đầu tách</button></div>
    </section></div>}

    {detail && <div className={s.backdrop}><section className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="karaoke-detail-title"><div className={s.dialogHead}><div><h2 id="karaoke-detail-title">{detail.title}</h2><small>{detail.artist}</small></div><button aria-label="Đóng chi tiết" disabled={busy} onClick={() => { detailRequest.current++; stopPreview(); setDetail(undefined); }}><X size={19} /></button></div>
      <div className={s.dialogBody}>{detail.versions.length === 0 ? <div className={s.empty}><Music2 size={28} /><strong>Bài hát chưa có tài nguyên karaoke</strong><span>Tạo tác vụ để chuẩn bị nhạc nền và vocal.</span></div> : <>
        <label className={s.field}>Phiên bản tài nguyên<select value={selectedVersion} onChange={e => { stopPreview(); setSelectedVersion(e.target.value); }}>{detail.versions.map(v => <option key={v.assetVersion} value={v.assetVersion}>{v.assetVersion} · {v.assetVersion === detail.publishedVersion ? "Đang sử dụng" : v.publishedAt || v.status === "ready" ? "Phiên bản trước" : "Chờ duyệt"} · {date(v.createdAt)}</option>)}</select></label>
        <div className={s.previewButtons}><button disabled={previewLoading} onClick={() => void listen("source", version)}>Nghe bản gốc</button><button disabled={!version?.assets?.instrumental || previewLoading} onClick={() => void listen("instrumental", version)}>Nghe nhạc nền</button><button disabled={!version?.assets?.vocals || previewLoading} onClick={() => void listen("vocals", version)}>Nghe vocal</button></div>
        {previewLoading && <p className={s.time}><Loader2 size={15} className={s.spin} />Đang tải âm thanh...</p>}{preview && <div className={s.player}><strong>{preview.label}</strong><audio key={preview.url} ref={audio} src={preview.url} controls onLoadedMetadata={() => { if (audio.current) { audio.current.currentTime = Math.min(position.current, Math.max(0, audio.current.duration - 0.1)); void audio.current.play().catch(() => {}); } }} onError={() => onToast("Không phát được file âm thanh.", "error")} /></div>}
        <div className={s.infoGrid}><div><small>Mô hình</small><strong>{version?.processing?.modelFilename ?? "Không có thông tin"}</strong></div><div><small>Thời lượng</small><strong>{duration(version?.source?.durationSeconds)}</strong></div><div><small>Thiết bị xử lý</small><strong>{version?.processing?.device?.toUpperCase() ?? "—"}</strong></div><div><small>Chấm điểm</small><strong>{version?.scoringReference?.status === "sufficient" ? "Dữ liệu tham chiếu đạt yêu cầu" : "Chưa đủ tin cậy — chỉ hỗ trợ hát"}</strong></div></div>
        {version?.scoringReference?.warnings?.map((w, i) => <p className={s.warning} key={i}>{w}</p>)}
        <div className={s.files}>{[["instrumental", "Nhạc nền"], ["vocals", "Vocal"], ["pitchReference", "Dữ liệu cao độ"]].map(([role, name]) => <div key={role}><span><strong>{name}</strong><small>{bytes(version?.assets?.[role]?.bytes)}</small></span><button disabled={!version?.assets?.[role]} onClick={() => version && void download(version, role)}><Download size={14} />Tải file</button></div>)}</div>
        <p className={s.note}>Người tạo: {version?.createdBy ?? "Quy trình chuẩn bị trước đây"} · {date(version?.createdAt)}{version?.publishedBy ? ` · Lần xuất bản gần nhất: ${version.publishedBy} · ${date(version.publishedAt)}` : ""}</p>
      </>}{!!detail.jobs?.length && <div className={s.files}><div><strong>Nhật ký xử lý gần đây</strong><button disabled={busy} onClick={() => void openDetail(detail.songId)}><RefreshCw size={13} />Cập nhật</button></div>{detail.jobs.map(j => <div key={j.id}><span><strong>{j.sourceName} · {j.status === "completed" && j.publishedAt ? "Đã xuất bản" : labels[j.status] ?? j.status}</strong><small>{j.createdBy} · {date(j.createdAt)}</small>{j.events?.map((event, index) => <small key={index}>{date(event.at)} · {labels[event.stage] ?? event.stage}</small>)}{j.error && <small className={s.failure}>{j.error}</small>}</span></div>)}</div>}</div>
      <div className={s.dialogFoot}><button disabled={busy} onClick={() => { stopPreview(); setDetail(undefined); newJob(data?.items.find(t => t.songId === detail.songId) ?? { songId: detail.songId, title: detail.title, artist: detail.artist, sourceAvailable: detail.sourceAvailable, status: "missing" }); }}>Tạo lần tách mới</button>{version && <button className={s.primary} disabled={busy || selectedVersion === detail.publishedVersion} onClick={async () => { if (await act(() => publishKaraokeVersion(detail.songId, selectedVersion), "Đã xuất bản phiên bản tài nguyên karaoke.")) { const result = await getKaraokeResource(detail.songId); setDetail(result); } }}><CheckCircle2 size={16} />{selectedVersion === detail.publishedVersion ? "Đang sử dụng" : version.publishedAt || version.status === "ready" ? "Khôi phục phiên bản này" : "Xuất bản cho karaoke"}</button>}</div>
    </section></div>}
  </div>;
}
