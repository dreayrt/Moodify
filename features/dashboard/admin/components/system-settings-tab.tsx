"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Download,
  FileCode,
  HardDrive,
  Key,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  Sliders,
  Sparkles,
} from "lucide-react";
import { SystemAuditLog } from "../types";
import { AdminPagination } from "./shared/admin-pagination";

type SystemSettingsTabProps = {
  auditLogs: SystemAuditLog[];
  onSaveSettings: (settings: { aiThreshold: number; maxDevices: number }) => void;
};

export function SystemSettingsTab({ auditLogs, onSaveSettings }: SystemSettingsTabProps) {
  const [aiThreshold, setAiThreshold] = useState(0.75);
  const [maxDevices, setMaxDevices] = useState(3);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchAudit, setSearchAudit] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Pagination State for Audit Vault
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setAuditPage(1);
  }, [searchAudit, categoryFilter, severityFilter]);

  const handleSave = () => {
    onSaveSettings({ aiThreshold, maxDevices });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `moodify_audit_vault_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchSev = severityFilter === "ALL" || log.severity === severityFilter;
    const matchCat = categoryFilter === "ALL" || log.category === categoryFilter;
    const matchSearch =
      log.action.toLowerCase().includes(searchAudit.toLowerCase()) ||
      log.target.toLowerCase().includes(searchAudit.toLowerCase()) ||
      log.details.toLowerCase().includes(searchAudit.toLowerCase()) ||
      log.operatorName.toLowerCase().includes(searchAudit.toLowerCase());

    return matchSev && matchCat && matchSearch;
  });

  const paginatedLogs = filteredLogs.slice(
    (auditPage - 1) * auditPageSize,
    auditPage * auditPageSize
  );

  return (
    <div className="space-y-7 anim-fade-up">
      {/* Studio Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-graphik text-[24px] font-bold text-white tracking-tight">
              Cấu Hình Hệ Thống & Hộp Đen Kiểm Toán
            </h2>
            <span className="rounded-md border border-[#ff7a2c]/30 bg-[#ff7a2c]/10 px-2 py-0.5 font-mono text-[11px] text-[#ffb488] font-semibold">
              Security Vault
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Tinh chỉnh tham số AI Cảm xúc, hạn mức thiết bị ngoại tuyến và giám sát nhật ký an ninh bất biến (Audit Trail).
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-xl bg-[#ff7a2c] px-5 py-2.5 text-xs font-bold text-black shadow-md shadow-[#ff7a2c]/20 hover:opacity-95 active:scale-95 transition"
        >
          {savedSuccess ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {savedSuccess ? "Đã Lưu Thành Công!" : "Lưu Tham Số"}
        </button>
      </div>

      {/* 2 Core Parameter Panels */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Panel 1: Emotion Engine Configuration */}
        <div className="rounded-xl border border-[#1e2330] bg-[#0c1017] p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-[#ff7a2c]/20 bg-[#ff7a2c]/10 text-[#ff7a2c]">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-graphik text-base font-bold text-white">Mô Hình AI Gợi Ý Cảm Xúc</h3>
              <p className="text-[11px] text-zinc-400 font-mono">Emotion-Driven Music Engine Parameters</p>
            </div>
          </div>

          <div className="mt-5 space-y-4 text-xs">
            <div>
              <div className="flex justify-between items-baseline">
                <label className="text-zinc-300 font-medium text-xs">Ngưỡng tin cậy tối thiểu (Confidence)</label>
                <span className="font-mono font-bold text-[#ff7a2c] text-sm">{(aiThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={aiThreshold}
                onChange={(e) => setAiThreshold(Number(e.target.value))}
                className="mt-2.5 w-full accent-[#ff7a2c] cursor-pointer"
              />
              <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">
                Chỉ phân phối gợi ý bài hát theo tâm trạng khi độ khớp từ <code>search_history.emotion_confidence</code> đạt ngưỡng này.
              </p>
            </div>

            <div className="border-t border-white/5 pt-4">
              <span className="text-[11px] font-mono text-zinc-400 block mb-2">Trạng thái Core Services</span>
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5 text-xs">
                <span className="flex items-center gap-2 text-zinc-300">
                  <Server className="h-4 w-4 text-emerald-400" /> Spring Boot Core API: <code>localhost:8088</code>
                </span>
                <span className="font-mono text-[10px] text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  ONLINE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Offline DRM & Platform Limits */}
        <div className="rounded-xl border border-[#1e2330] bg-[#0c1017] p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-[#00f2fe]/20 bg-[#00f2fe]/10 text-[#00f2fe]">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-graphik text-base font-bold text-white">Chính Sách DRM & Thiết Bị</h3>
              <p className="text-[11px] text-zinc-400 font-mono">Offline DRM & Device Concurrency Limits</p>
            </div>
          </div>

          <div className="mt-5 space-y-4 text-xs">
            <div>
              <div className="flex justify-between items-baseline">
                <label className="text-zinc-300 font-medium text-xs">Giới hạn thiết bị Offline cho gói Premium</label>
                <span className="font-mono font-bold text-[#00f2fe] text-sm">{maxDevices} thiết bị</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={maxDevices}
                onChange={(e) => setMaxDevices(Number(e.target.value))}
                className="mt-2.5 w-full accent-[#00f2fe] cursor-pointer"
              />
              <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">
                Ngăn chặn việc chia sẻ tài khoản nghe nhạc ngoại tuyến cho nhiều người dùng không hợp lệ.
              </p>
            </div>

            <div className="border-t border-white/5 pt-4">
              <span className="text-[11px] font-mono text-zinc-400 block mb-2">Cổng thanh toán kích hoạt</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-zinc-200 font-mono">VNPAY (QR / ATM)</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-zinc-200 font-mono">MOMO E-Wallet</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Vault (Immutable Security Logs) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-graphik text-lg font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#ff7a2c]" /> Hộp Đen Kiểm Toán (Audit Vault)
            </h3>
            <p className="text-xs text-zinc-400">
              Nhật ký bất biến ghi nhận mọi thao tác cấp cao của quản trị viên để phục vụ đối soát và an ninh.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportLogs}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-xs text-white hover:bg-white/10 transition self-start sm:self-auto"
          >
            <Download className="h-3.5 w-3.5 text-[#00f2fe]" /> Xuất File JSON
          </button>
        </div>

        {/* Audit Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1e2330] bg-[#0c1017] p-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchAudit}
              onChange={(e) => setSearchAudit(e.target.value)}
              placeholder="Tìm theo hành động, mục tiêu, chi tiết..."
              className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#ff7a2c]/60"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#121622] px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#ff7a2c]/60 cursor-pointer"
          >
            <option value="ALL" className="bg-[#0c1017]">Tất cả danh mục</option>
            <option value="IAM" className="bg-[#0c1017]">IAM & Users</option>
            <option value="CATALOG" className="bg-[#0c1017]">Catalog & Vibe</option>
            <option value="BILLING" className="bg-[#0c1017]">Billing & Gói cước</option>
            <option value="SECURITY" className="bg-[#0c1017]">Security & DRM</option>
            <option value="SYSTEM" className="bg-[#0c1017]">System Core</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#121622] px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#ff7a2c]/60 cursor-pointer"
          >
            <option value="ALL" className="bg-[#0c1017]">Tất cả mức độ</option>
            <option value="critical" className="bg-[#0c1017]">Critical (Khẩn cấp)</option>
            <option value="warning" className="bg-[#0c1017]">Warning (Cảnh báo)</option>
            <option value="info" className="bg-[#0c1017]">Info (Thông tin)</option>
          </select>
        </div>

        {/* Audit Table */}
        <div className="overflow-hidden rounded-xl border border-[#1e2330] bg-[#0c1017] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[0.02] font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="py-3.5 pl-5 pr-3">Thời Điểm</th>
                  <th className="py-3.5 px-3">Quản Trị Viên</th>
                  <th className="py-3.5 px-3">Hành Động</th>
                  <th className="py-3.5 px-3">Mục Tiêu</th>
                  <th className="py-3.5 px-3">Chi Tiết Sự Kiện</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Mức Độ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400 font-mono">
                      Không có bản ghi kiểm toán nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 pl-5 pr-3 font-mono text-[11px] text-zinc-400 shrink-0">
                        {log.timestamp}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-medium text-white">{log.operatorName}</span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] font-bold text-white">
                        <span className="bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-medium text-white/90">
                        {log.target}
                      </td>

                      <td className="py-3 px-3 text-zinc-300 truncate max-w-[280px]">
                        {log.details}
                      </td>

                      <td className="py-3 pl-3 pr-5 text-right font-mono text-[10px]">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold ${
                            log.severity === "critical"
                              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              : log.severity === "warning"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <AdminPagination
            currentPage={auditPage}
            totalItems={filteredLogs.length}
            pageSize={auditPageSize}
            onPageChange={setAuditPage}
            onPageSizeChange={setAuditPageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        </div>
      </div>
    </div>
  );
}
