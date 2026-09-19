"use client";

import { useState } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  History,
} from "lucide-react";
import { ModerationHistoryItem } from "../types";
import { ModeratorAuditDetailModal } from "./moderator-audit-detail-modal";
import { ModeratorTrackCover } from "./moderator-track-cover";

type ModeratorHistoryTabProps = {
  history: ModerationHistoryItem[];
};

export function ModeratorHistoryTab({ history }: ModeratorHistoryTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "approved" | "rejected" | "needs_revision"
  >("all");
  const [selectedAuditItem, setSelectedAuditItem] =
    useState<ModerationHistoryItem | null>(null);

  const filteredHistory = history.filter((item) => {
    const matchSearch =
      item.trackTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reviewerName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (statusFilter !== "all" && item.decision !== statusFilter) {
      return false;
    }

    return true;
  });

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[24px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên bài hát, nghệ sĩ hoặc kiểm duyệt viên..."
            className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2 pl-10 pr-4 text-[13px] text-white placeholder-white/30 focus:border-[#ff7a2c] focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[12px]">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-full px-3.5 py-1.5 font-medium transition ${
              statusFilter === "all"
                ? "bg-white text-black font-semibold shadow"
                : "bg-white/[0.04] text-white/60 hover:text-white"
            }`}
          >
            Tất cả ({history.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("approved")}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition ${
              statusFilter === "approved"
                ? "bg-emerald-500 text-white font-semibold shadow"
                : "bg-white/[0.04] text-emerald-400/80 hover:text-emerald-300"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Đã duyệt
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("rejected")}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition ${
              statusFilter === "rejected"
                ? "bg-red-500 text-white font-semibold shadow"
                : "bg-white/[0.04] text-red-400/80 hover:text-red-300"
            }`}
          >
            <XCircle className="h-3.5 w-3.5" />
            Đã từ chối
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("needs_revision")}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition ${
              statusFilter === "needs_revision"
                ? "bg-[#ff7a2c] text-white font-semibold shadow"
                : "bg-white/[0.04] text-[#ffb488] hover:text-white"
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Yêu cầu sửa
          </button>
        </div>
      </div>

      {/* History Audit Table */}
      <div className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03] shadow-[0_20px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-white/8 bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="py-4 pl-6 pr-4">Bài hát & Nghệ sĩ</th>
                <th className="px-4 py-4">Thể loại</th>
                <th className="px-4 py-4">Quyết định</th>
                <th className="px-4 py-4">Thời gian nghe</th>
                <th className="px-4 py-4">Thời điểm thẩm định</th>
                <th className="px-4 py-4">Ghi chú / Phản hồi</th>
                <th className="py-4 pl-4 pr-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6 text-white/80">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-white/40">
                    <History className="mx-auto h-8 w-8 text-white/20 mb-2" />
                    Chưa có nhật ký kiểm duyệt nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-white/[0.03]"
                  >
                    {/* Track info */}
                    <td className="py-3.5 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        <ModeratorTrackCover
                          coverUrl={item.coverUrl}
                          title={item.trackTitle}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">
                            {item.trackTitle}
                          </p>
                          <p className="truncate text-[12px] text-white/50">
                            {item.artistName}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Genre */}
                    <td className="px-4 py-3.5 text-white/60">{item.genre}</td>

                    {/* Decision */}
                    <td className="px-4 py-3.5">
                      {item.decision === "approved" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Đã duyệt
                        </span>
                      )}
                      {item.decision === "rejected" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-400">
                          <XCircle className="h-3 w-3" />
                          Đã từ chối
                        </span>
                      )}
                      {item.decision === "needs_revision" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400">
                          <AlertCircle className="h-3 w-3" />
                          Yêu cầu sửa
                        </span>
                      )}
                    </td>

                    {/* Review Duration */}
                    <td className="px-4 py-3.5 font-mono text-white/60">
                      {formatSecs(item.reviewDurationSec)}
                    </td>

                    {/* Reviewed At */}
                    <td className="px-4 py-3.5 text-[12px] text-white/50">
                      {item.reviewedAt}
                    </td>

                    {/* Note / Rejection snippet */}
                    <td className="px-4 py-3.5 max-w-xs truncate text-[12px] text-white/60">
                      {item.rejectionReason || item.internalNote || "—"}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 pl-4 pr-6 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedAuditItem(item)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5 text-[#ff8b4d]" />
                        <span>Xem lại</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal audit detail */}
      <ModeratorAuditDetailModal
        isOpen={!!selectedAuditItem}
        onClose={() => setSelectedAuditItem(null)}
        item={selectedAuditItem}
      />
    </div>
  );
}
