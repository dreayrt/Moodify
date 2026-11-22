"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  Loader2,
  Megaphone,
  Send,
  Users,
  XCircle,
} from "lucide-react";

import {
  broadcastAdminNotification,
  fetchAdminNotificationHistory,
} from "@/lib/api/admin-client";
import { NotificationBroadcast, NotificationType } from "../types";

const NOTIFICATION_TYPES: { value: NotificationType; label: string; color: string }[] = [
  { value: "SYSTEM", label: "Hệ thống", color: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  { value: "ANNOUNCEMENT", label: "Thông báo", color: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  { value: "PROMO", label: "Khuyến mãi", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { value: "BILLING", label: "Thanh toán", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { value: "MODERATION", label: "Kiểm duyệt", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
];

const TARGET_ROLES = [
  { value: "ALL", label: "Tất cả người dùng" },
  { value: "USER", label: "Người nghe" },
  { value: "CONTENT_LEAD", label: "Quản lý nội dung" },
  { value: "MODERATOR", label: "Kiểm duyệt viên" },
  { value: "ADMIN", label: "Quản trị viên" },
];

const TARGET_ROLE_LABELS: Record<string, string> = Object.fromEntries(
  TARGET_ROLES.map((r) => [r.value, r.label])
);

type ToastFn = (message: string, type?: "success" | "error" | "info" | "warning") => void;

export function NotificationsTab({ onToast }: { onToast: ToastFn }) {
  const [history, setHistory] = useState<NotificationBroadcast[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; text: string } | null>(null);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("ANNOUNCEMENT");
  const [targetRole, setTargetRole] = useState("ALL");
  const [linkUrl, setLinkUrl] = useState("");

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setHistoryError(null);
    try {
      const data = await fetchAdminNotificationHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Không thể tải lịch sử thông báo từ máy chủ.";
      console.warn("Failed to load notification history:", err);
      setHistoryError(msg);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setSendResult({ ok: false, text: "Vui lòng nhập tiêu đề và nội dung thông báo." });
      return;
    }
    const trimmedLink = linkUrl.trim();
    if (
      trimmedLink &&
      !trimmedLink.startsWith("/") &&
      !/^https?:\/\//i.test(trimmedLink)
    ) {
      setSendResult({
        ok: false,
        text: "Đường dẫn liên kết phải bắt đầu bằng '/', 'http://' hoặc 'https://'.",
      });
      return;
    }
    setIsSending(true);
    setSendResult(null);
    try {
      const res = await broadcastAdminNotification({
        title: title.trim(),
        message: message.trim(),
        type,
        targetRole,
        linkUrl: trimmedLink || undefined,
      });
      setSendResult({ ok: true, text: res.message });
      onToast(res.message, "success");
      setTitle("");
      setMessage("");
      setLinkUrl("");
      void loadHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSendResult({ ok: false, text: msg });
      onToast(`Lỗi khi gửi thông báo: ${msg}`, "error");
    } finally {
      setIsSending(false);
    }
  };

  const typeMeta = (t: string) =>
    NOTIFICATION_TYPES.find((n) => n.value === t) ?? NOTIFICATION_TYPES[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-graphik text-[22px] font-semibold text-white flex items-center gap-2.5">
          <BellRing className="h-5 w-5 text-[#ff5500]" />
          Thông báo
        </h1>
        <p className="mt-1 text-[13px] text-zinc-400">
          Gửi thông báo tới toàn bộ người dùng hoặc theo từng nhóm vai trò.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
        {/* Broadcast History */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#ff5500]" />
              Lịch sử gửi thông báo
            </h2>
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="text-xs font-medium text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg border border-white/[0.08] hover:border-[#ff5500]/50 transition cursor-pointer"
            >
              Làm mới
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-14 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-[13px]">Đang tải lịch sử...</span>
            </div>
          ) : historyError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-center">
              <XCircle className="h-7 w-7 mx-auto mb-2 text-rose-400" />
              <p className="text-[13px] font-medium text-rose-200">{historyError}</p>
              <button
                type="button"
                onClick={() => void loadHistory()}
                className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25 transition cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-14 text-zinc-500">
              <Bell className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-[13px]">Chưa có thông báo nào được gửi.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[560px] overflow-y-auto moodify-scroll pr-1">
              {history.map((item) => {
                const meta = typeMeta(item.type);
                const roleLabel = TARGET_ROLE_LABELS[item.targetRole] || item.targetRole;
                return (
                  <div key={item.id} className="rounded-xl border border-white/[0.08] bg-[#0e1017] p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <span className={`font-semibold px-2 py-0.5 rounded border ${meta.color}`}>
                            {meta.label}
                          </span>
                          <span className="text-zinc-400">
                            {roleLabel}
                          </span>
                        </div>
                        <p className="mt-2 text-[13px] font-semibold text-white truncate">{item.title}</p>
                        <p className="mt-0.5 text-[12px] text-zinc-400 line-clamp-2 leading-relaxed">{item.message}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#ff5500] justify-end tabular-nums">
                          <Users className="h-3 w-3" />
                          {item.recipients}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-1 font-mono tabular-nums">
                          {item.lastSentAt ? new Date(item.lastSentAt).toLocaleString("vi-VN") : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Compose Form */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 xl:sticky xl:top-20">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Send className="h-4 w-4 text-[#ff5500]" />
            Soạn thông báo mới
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tiêu đề *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Bảo trì hệ thống đêm nay"
                maxLength={200}
                className="w-full rounded-xl border border-white/[0.08] bg-[#0e1017] px-3.5 py-2.5 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#ff5500]/60 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nội dung *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nội dung thông báo gửi tới người dùng..."
                rows={5}
                maxLength={1000}
                className="w-full rounded-xl border border-white/[0.08] bg-[#0e1017] px-3.5 py-2.5 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#ff5500]/60 transition resize-none"
              />
              <div className="text-right text-[11px] font-mono text-zinc-600 mt-1 tabular-nums">{message.length}/1000</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Loại thông báo</label>
              <div className="flex flex-wrap gap-1.5">
                {NOTIFICATION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
                      type === t.value
                        ? "bg-[#ff5500] text-white border-[#ff5500]"
                        : "bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white hover:border-zinc-600"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Người nhận</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#0e1017] px-3.5 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#ff5500]/60 transition cursor-pointer"
              >
                {TARGET_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Liên kết đính kèm (tùy chọn)</label>
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="/dashboard/premium"
                className="w-full rounded-xl border border-white/[0.08] bg-[#0e1017] px-3.5 py-2.5 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#ff5500]/60 transition"
              />
            </div>

            {sendResult && (
              <div
                className={`flex items-center gap-2 rounded-xl border p-3 text-[12px] ${
                  sendResult.ok
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                }`}
              >
                {sendResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                <span>{sendResult.text}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isSending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#ff5500] px-4 py-3 text-[13px] font-bold text-white shadow-md shadow-[#ff5500]/25 hover:brightness-110 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSending ? "Đang gửi..." : "Gửi thông báo ngay"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
