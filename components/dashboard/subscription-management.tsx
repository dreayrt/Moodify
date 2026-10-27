"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  Clock3,
  CreditCard,
  Crown,
  FileText,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  cancelMyManagedSubscription,
  fetchMySubscriptionManagement,
  type ManagedSubscription,
  type SubscriptionManagementPayment,
} from "@/lib/api-client";

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return `${Number.isFinite(amount) ? amount.toLocaleString("vi-VN") : "0"} đ`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Chưa có thông tin";
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
}

function subscriptionState(subscription: ManagedSubscription) {
  if (subscription.isCurrent) return { label: "Đang sử dụng", tone: "emerald" as const };
  if (subscription.isScheduled) return { label: "Chờ áp dụng", tone: "purple" as const };
  switch (subscription.status) {
    case "PENDING": return { label: "Chờ thanh toán", tone: "amber" as const };
    case "ACTIVE": return { label: "Đã hết hạn", tone: "muted" as const };
    case "EXPIRED": return { label: "Đã hết hạn", tone: "muted" as const };
    case "CANCELLED": return { label: "Đã hủy", tone: "muted" as const };
    case "SUSPENDED": return { label: "Đã tạm ngưng", tone: "red" as const };
    default: return { label: "Chưa áp dụng", tone: "muted" as const };
  }
}

function paymentState(status: SubscriptionManagementPayment["status"]) {
  switch (status) {
    case "SUCCESS": return "Thành công";
    case "PENDING": return "Đang chờ";
    case "FAILED": return "Thất bại";
    case "CANCELLED": return "Đã hủy";
    case "REFUNDED": return "Đã hoàn tiền";
    default: return status;
  }
}

const statusClasses = {
  emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  purple: "border-purple-400/25 bg-purple-400/10 text-purple-200",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  red: "border-rose-400/25 bg-rose-400/10 text-rose-200",
  muted: "border-white/10 bg-white/[0.04] text-white/55",
};

export default function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState<ManagedSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<ManagedSubscription | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    try {
      setSubscriptions(await fetchMySubscriptionManagement());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách gói dịch vụ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchMySubscriptionManagement()
      .then((items) => {
        if (!cancelled) setSubscriptions(items);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách gói dịch vụ.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const summary = useMemo(() => ({
    current: subscriptions.filter((item) => item.isCurrent).length,
    scheduled: subscriptions.filter((item) => item.isScheduled).length,
    history: subscriptions.filter((item) => !item.isCurrent && !item.isScheduled).length,
  }), [subscriptions]);

  const handleCancel = async () => {
    if (!confirming) return;
    setCancellingId(confirming.id);
    setCancelError(null);
    try {
      await cancelMyManagedSubscription(confirming.id);
      setConfirming(null);
      await loadSubscriptions();
      window.dispatchEvent(new CustomEvent("moodify-subscription-updated"));
      window.dispatchEvent(new Event("moodify-notifications-updated"));
    } catch (cancelFailure) {
      setCancelError(cancelFailure instanceof Error ? cancelFailure.message : "Không thể hủy gói dịch vụ.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10 animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col gap-5 border-b border-white/[0.08] pb-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200">
            <Crown className="h-3.5 w-3.5" /> Moodify Membership
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Quản lý gói dịch vụ</h1>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Theo dõi thời hạn, lịch áp dụng và biên nhận thanh toán của các gói trên tài khoản.
          </p>
        </div>
        <div className="inline-flex self-start rounded-xl border border-white/10 bg-[#0d0b14]/80 p-1 md:self-auto">
          <span className="rounded-lg bg-amber-300/15 px-4 py-2 text-xs font-semibold text-amber-100 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.15)]">
            Gói của tôi
          </span>
          <Link
            href="/dashboard/premium"
            className="rounded-lg px-4 py-2 text-xs font-semibold text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            Khám phá gói
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Đang sử dụng", value: summary.current, icon: ShieldCheck, tone: "text-emerald-200 bg-emerald-300/10" },
          { label: "Chờ áp dụng", value: summary.scheduled, icon: CalendarClock, tone: "text-purple-200 bg-purple-300/10" },
          { label: "Gói trong lịch sử", value: summary.history, icon: Clock3, tone: "text-amber-100 bg-amber-300/10" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0b0b14]/80 p-4 transition-colors duration-300 hover:border-white/15">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
              <item.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-2xl font-bold text-white">{item.value}</span>
              <span className="text-xs text-white/45">{item.label}</span>
            </span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3" aria-label="Đang tải gói dịch vụ">
          {[0, 1, 2].map((key) => <div key={key} className="h-36 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.025]" />)}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-6 text-center">
          <CircleAlert className="mx-auto h-7 w-7 text-rose-200" />
          <p className="mt-3 text-sm text-white/75">{error}</p>
          <button onClick={() => { setError(null); setLoading(true); void loadSubscriptions(); }} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
            <RefreshCw className="h-3.5 w-3.5" /> Thử tải lại
          </button>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-[#0b0b14]/80 px-6 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] text-amber-200">
            <PackageCheck className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-white">Bạn chưa có gói dịch vụ nào</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">Khi đăng ký gói, trạng thái và biên nhận thanh toán sẽ được lưu tại đây.</p>
          <Link href="/dashboard/premium" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-200 px-5 py-3 text-sm font-bold text-[#17120a] shadow-lg shadow-amber-400/10 transition hover:-translate-y-0.5 hover:shadow-amber-300/20">
            Xem các gói dịch vụ <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((subscription) => {
            const state = subscriptionState(subscription);
            const expanded = expandedId === subscription.id;
            const newestPayment = subscription.payments[0];
            return (
              <article key={subscription.id} className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[linear-gradient(120deg,rgba(17,16,29,.96),rgba(8,10,18,.96))] shadow-[0_12px_36px_rgba(0,0,0,.18)] transition-all duration-300 hover:border-amber-200/20 hover:shadow-[0_16px_42px_rgba(0,0,0,.3)]">
                <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] text-amber-200 transition-transform duration-300 hover:scale-105">
                      <Crown className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-bold text-white md:text-lg">{subscription.packageName}</h2>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClasses[state.tone]}`}>{state.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-white/45">{subscription.tierName || subscription.tierId || "Moodify"} · {subscription.durationDays} ngày</p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-white/55">
                        <span><span className="text-white/35">Bắt đầu:</span> {formatDate(subscription.startAt)}</span>
                        <span><span className="text-white/35">Kết thúc:</span> {formatDate(subscription.endAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                    <span className="mr-1 text-sm font-bold text-amber-100">{formatMoney(newestPayment?.amount ?? subscription.catalogPrice)}</span>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : subscription.id)}
                      aria-expanded={expanded}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2.5 text-xs font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                    >
                      <FileText className="h-3.5 w-3.5" /> Chi tiết
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                    </button>
                    {subscription.canCancel && (
                      <button
                        type="button"
                        onClick={() => { setCancelError(null); setConfirming(subscription); }}
                        className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3.5 py-2.5 text-xs font-semibold text-rose-100/80 transition hover:border-rose-300/35 hover:bg-rose-300/10 hover:text-rose-100"
                      >
                        Hủy gói
                      </button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="animate-in slide-in-from-top-1 border-t border-white/[0.07] bg-black/15 px-5 py-5 md:px-6">
                    <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
                      <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Quyền lợi gói</h3>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/70">{subscription.packageDescription || "Không có mô tả cho gói này."}</p>
                        <div className="mt-4 flex items-center gap-2 text-xs text-white/45">
                          <RefreshCw className="h-3.5 w-3.5" />
                          {subscription.autoRenew ? "Tự động gia hạn" : "Không tự động gia hạn"}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Biên nhận thanh toán</h3>
                        {subscription.payments.length === 0 ? (
                          <p className="mt-3 text-sm text-white/45">Chưa có giao dịch thanh toán gắn với gói này.</p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {subscription.payments.map((payment) => (
                              <div key={payment.id} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/85"><CreditCard className="h-4 w-4 text-amber-200" /> Giao dịch #{payment.id}</span>
                                  <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${payment.status === "SUCCESS" ? statusClasses.emerald : payment.status === "PENDING" ? statusClasses.amber : statusClasses.muted}`}>{paymentState(payment.status)}</span>
                                </div>
                                <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
                                  <div><dt className="text-white/35">Số tiền</dt><dd className="mt-0.5 font-semibold text-amber-100">{formatMoney(payment.amount)}</dd></div>
                                  <div><dt className="text-white/35">Phương thức</dt><dd className="mt-0.5 text-white/75">{payment.paymentMethod || "—"} {payment.provider ? `· ${payment.provider}` : ""}</dd></div>
                                  <div><dt className="text-white/35">Mã đơn hàng</dt><dd className="mt-0.5 break-all font-mono text-white/75">{payment.orderCode || "—"}</dd></div>
                                  <div><dt className="text-white/35">Mã tham chiếu cổng thanh toán</dt><dd className="mt-0.5 break-all font-mono text-white/75">{payment.providerReference || "—"}</dd></div>
                                  <div className="sm:col-span-2"><dt className="text-white/35">Thời điểm thanh toán</dt><dd className="mt-0.5 text-white/75">{formatDate(payment.paidAt)}</dd></div>
                                </dl>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="mt-3 text-[11px] leading-5 text-white/35">Thông tin trên là biên nhận giao dịch của Moodify; hệ thống hiện chưa phát hành hóa đơn thuế.</p>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !cancellingId) setConfirming(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="cancel-subscription-title" className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0c0c16] p-6 shadow-[0_28px_100px_rgba(0,0,0,.65)] animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-300/[0.08] text-rose-100"><CircleAlert className="h-5 w-5" /></span>
              <button type="button" disabled={Boolean(cancellingId)} onClick={() => setConfirming(null)} aria-label="Đóng" className="rounded-lg p-2 text-white/45 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"><X className="h-4 w-4" /></button>
            </div>
            <h2 id="cancel-subscription-title" className="mt-4 text-xl font-bold text-white">Xác nhận hủy gói?</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">{confirming.cancelKind === "PENDING_ORDER"
              ? `Đơn thanh toán cho ${confirming.packageName} sẽ bị hủy và mã QR không còn hiệu lực. Nếu bạn đã chuyển tiền nhưng giao dịch chưa được xác nhận, vui lòng liên hệ hỗ trợ.`
              : `Lịch áp dụng ${confirming.packageName} sẽ bị hủy. Giao dịch đã thanh toán vẫn được giữ trong lịch sử và không tự động hoàn tiền.`}</p>
            {cancelError && <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs text-rose-100">{cancelError}</p>}
            <div className="mt-6 flex gap-2">
              <button type="button" disabled={Boolean(cancellingId)} onClick={() => setConfirming(null)} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/[0.06] disabled:opacity-50">Quay lại</button>
              <button type="button" disabled={Boolean(cancellingId)} onClick={() => void handleCancel()} className="flex-1 rounded-xl bg-rose-300 px-4 py-3 text-sm font-bold text-[#210b0e] transition hover:bg-rose-200 disabled:cursor-wait disabled:opacity-60">
                {cancellingId ? <span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" /> Đang hủy</span> : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
