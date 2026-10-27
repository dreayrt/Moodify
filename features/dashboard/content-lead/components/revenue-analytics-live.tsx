"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleDollarSign, Search, X } from "lucide-react";
import { getContentLeadRevenue, type ContentLeadRevenueResponse } from "@/lib/auth/auth-client";

type Period = "today" | "week" | "month" | "year";
const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
const periods: Array<{ key: Period; label: string }> = [
  { key: "today", label: "Hôm nay" }, { key: "week", label: "1 tuần" },
  { key: "month", label: "1 tháng" }, { key: "year", label: "1 năm" },
];

export function RevenueAnalyticsDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; tracks?: unknown[] }) {
  const [period, setPeriod] = useState<Period>("month");
  const [result, setResult] = useState<{ period: Period; report: ContentLeadRevenueResponse | null; error: string } | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"revenue" | "plays">("revenue");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getContentLeadRevenue(period).then((data) => { if (!cancelled) setResult({ period, report: data, error: "" }); })
      .catch((cause) => { if (!cancelled) setResult({ period, report: null, error: cause instanceof Error ? cause.message : "Không thể tải báo cáo doanh thu." }); });
    return () => { cancelled = true; };
  }, [isOpen, period]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEscape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onEscape); };
  }, [isOpen, onClose]);

  const report = result?.period === period ? result.report : null;
  const error = result?.period === period ? result.error : "";
  const loading = isOpen && result?.period !== period;
  const rows = useMemo(() => (report?.tracks ?? [])
    .filter((row) => row.title.toLocaleLowerCase("vi-VN").includes(search.toLocaleLowerCase("vi-VN")))
    .sort((a, b) => sort === "plays" ? b.qualifiedPlays - a.qualifiedPlays : b.contentLeadVnd - a.contentLeadVnd),
    [report, search, sort]);
  const trend = report?.trend ?? [];
  const max = Math.max(1, ...trend.map((point) => point.contentLeadVnd));
  const path = trend.map((point, index) => `${index === 0 ? "M" : "L"} ${trend.length === 1 ? 50 : index * 100 / (trend.length - 1)} ${100 - point.contentLeadVnd * 90 / max}`).join(" ");

  return <div className={`fixed inset-0 z-50 ${isOpen ? "visible" : "invisible pointer-events-none"}`}>
    <button aria-label="Đóng báo cáo" className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
    <section className="absolute inset-y-0 left-0 flex w-[80vw] max-w-[1420px] flex-col border-r border-white/10 bg-[#0d0e14] text-white shadow-[30px_0_90px_rgba(0,0,0,0.85)]">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3"><span className="rounded-2xl bg-[#ff7a2c]/10 p-2.5 text-[#ff9e58]"><CircleDollarSign size={23}/></span><h2 className="text-xl font-bold">Báo cáo doanh thu</h2></div>
        <button onClick={onClose} className="rounded-xl border border-white/10 p-2 text-white/70 hover:text-white" aria-label="Đóng"><X size={18}/></button>
      </header>
      <div className="space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">{periods.map((item) => <button key={item.key} onClick={() => setPeriod(item.key)} className={`rounded-xl px-4 py-2 text-xs font-semibold ${period === item.key ? "bg-[#ff7a2c] text-white" : "text-white/50 hover:text-white"}`}>{item.label}</button>)}</div><p className="text-xs text-white/40">{report ? `${report.fromDate} – ${report.toDate}` : ""}</p></div>
        {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">{error}</p>}
        {loading && <p className="text-sm text-white/50">Đang tải dữ liệu doanh thu...</p>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
          ["Lượt nghe hợp lệ", new Intl.NumberFormat("vi-VN").format(report?.qualifiedPlays ?? 0)],
          ["Doanh thu gộp", money(report?.grossVnd ?? 0)],
          ["Content Lead (75%)", money(report?.contentLeadVnd ?? 0)],
          ["Moodify (25%)", money(report?.platformVnd ?? 0)],
        ].map(([label, value]) => <div key={label} className="rounded-[24px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5"><p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">{label}</p><p className="mt-4 text-2xl font-bold text-[#ffb488]">{value}</p></div>)}</div>
        <p className="text-xs text-white/45">Mỗi lượt nghe hợp lệ: 1.000 ₫ gộp = 750 ₫ Content Lead + 250 ₫ Moodify.</p>
        <div className="rounded-[26px] border border-white/10 bg-black/30 p-6"><h3 className="font-semibold">Xu hướng thu nhập Content Lead</h3><p className="mt-1 text-xs text-white/40">Theo ngày trong kỳ đã chọn</p><div className="mt-5 h-44">{trend.length ? <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible"><path d={path} fill="none" stroke="#ff7a2c" strokeWidth="1.2" vectorEffect="non-scaling-stroke" /></svg> : <p className="py-14 text-center text-sm text-white/40">Chưa có doanh thu trong kỳ này.</p>}</div></div>
        <div className="rounded-[26px] border border-white/10 bg-black/30 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Chi tiết theo bài hát</h3><p className="text-xs text-white/40">Hoàn vốn dùng phần Content Lead lũy kế</p></div><div className="flex gap-2"><label className="flex items-center gap-2 rounded-xl border border-white/10 px-3"><Search size={14} className="text-white/40"/><input aria-label="Tìm bài hát" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm bài hát" className="w-32 bg-transparent py-2 text-xs outline-none"/></label><select aria-label="Sắp xếp" value={sort} onChange={(event) => setSort(event.target.value as "revenue" | "plays")} className="rounded-xl border border-white/10 bg-[#171821] px-3 text-xs"><option value="revenue">Doanh thu</option><option value="plays">Lượt nghe</option></select></div></div>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[880px] text-left text-xs"><thead className="border-b border-white/10 uppercase tracking-wider text-white/40"><tr><th className="pb-3">Bài hát</th><th>Lượt nghe</th><th>Gộp kỳ này</th><th>Lead kỳ này</th><th>Moodify kỳ này</th><th>Giá quyền</th><th>Hoàn vốn lũy kế</th></tr></thead><tbody className="divide-y divide-white/5">{rows.map((row) => <tr key={row.id}><td className="max-w-48 truncate py-4 font-semibold">{row.title}<span className="block text-[11px] font-normal text-white/40">{row.genre}</span></td><td>{row.qualifiedPlays.toLocaleString("vi-VN")}</td><td>{money(row.grossVnd)}</td><td className="text-[#ffb488]">{money(row.contentLeadVnd)}</td><td>{money(row.platformVnd)}</td><td>{row.acquisitionCostVnd === null ? "Chưa xác định" : money(row.acquisitionCostVnd)}</td><td>{row.recoupBalanceVnd === null ? "Thiếu giá quyền" : row.recoupBalanceVnd >= 0 ? `Đã hoàn vốn · +${money(row.recoupBalanceVnd)}` : `Còn thiếu ${money(-row.recoupBalanceVnd)}`}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="py-8 text-center text-sm text-white/40">Không có bài hát phù hợp.</p>}</div></div>
        <p className="text-xs text-white/35">Doanh thu phát sinh theo chính sách Moodify; chưa phải xác nhận đã thanh toán. Chênh lệch hoàn vốn chưa trừ các chi phí khác.</p>
      </div>
    </section>
  </div>;
}
