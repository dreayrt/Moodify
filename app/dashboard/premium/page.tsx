"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Crown,
  Check,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  RefreshCw,
  Loader2,
  X,
} from "lucide-react";
import successStyles from "./payment-success.module.css";
import SubscriptionManagement from "@/components/dashboard/subscription-management";
import {
  fetchServicePackages,
  fetchPublicSubscriptionTiers,
  fetchPackageQuotes,
  createCheckoutPayment,
  getPaymentStatus,
  FREE_ENTITLEMENTS,
  type ServicePackage,
  type PublicSubscriptionTier,
  type PackageEntitlements,
  type PackageQuote,
  type CheckoutResponse,
  type PaymentStatusResponse,
} from "@/lib/api-client";

function formatCycleLabel(days: number): string {
  if (days === 30) return "1 tháng";
  if (days === 90) return "3 tháng";
  if (days === 180) return "6 tháng";
  if (days === 365) return "1 năm";
  return `${days} ngày`;
}

function normalizeSentenceKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9à-ỹ\s]/gi, "").replace(/\s+/g, " ").trim();
}

function buildPackageBenefitBullets(pkg: ServicePackage): string[] {
  const ent = pkg.entitlements;
  const bullets: string[] = [];

  if (ent) {
    if (ent.adPolicy === "NO_ADS") {
      bullets.push("Không quảng cáo");
    } else if (ent.adPolicy === "DAILY_QUOTA") {
      bullets.push(`${ent.adFreeDailyLimit} bài hát/ngày không quảng cáo`);
    } else {
      bullets.push("Phát kèm quảng cáo");
    }

    if (ent.skipPolicy === "UNLIMITED") {
      bullets.push("Chuyển bài không giới hạn");
    } else {
      bullets.push(`${ent.skipDailyLimit} lượt chuyển bài mỗi ngày`);
    }

    if (ent.offlineAllowed) {
      bullets.push(
        ent.offlineMaxTracks >= 9999
          ? "Tải nghe ngoại tuyến không giới hạn bài hát"
          : `Tải nghe ngoại tuyến tối đa ${ent.offlineMaxTracks} bài hát`
      );
    }

    const devices = Math.max(1, ent.maxDevices || 1);
    bullets.push(
      devices > 1
        ? `Sử dụng đồng thời trên tối đa ${devices} thiết bị`
        : "Sử dụng trên 1 thiết bị"
    );

    if (ent.tier !== "FREE" && ent.vipBadge !== false) {
      bullets.push("Giao diện và huy hiệu thành viên VIP");
    }
  }

  const seen = new Set(bullets.map(normalizeSentenceKey));
  if (pkg.description) {
    const extraLines = pkg.description
      .split(/\n|;|•/)
      .map((line) => line.replace(/^[-•\s]+/, "").trim())
      .filter((line) => line.length > 0 && !/6 tài khoản độc lập|320\s*kbps|Lossless/i.test(line));
    for (const line of extraLines) {
      const key = normalizeSentenceKey(line);
      if (!seen.has(key)) {
        bullets.push(line);
        seen.add(key);
      }
    }
  }

  return bullets;
}

export default function PremiumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [tiers, setTiers] = useState<PublicSubscriptionTier[]>([]);
  const [packageQuotes, setPackageQuotes] = useState<PackageQuote[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<number | "all">("all");

  // Payment modal state (SePay VietQR)
  const [selectedPkg, setSelectedPkg] = useState<ServicePackage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(
    null,
  );
  const [pollingStatus, setPollingStatus] = useState<
    "IDLE" | "POLLING" | "SUCCESS" | "EXPIRED" | "ERROR"
  >("IDLE");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(15 * 60);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successIsScheduled, setSuccessIsScheduled] = useState(false);

  const loadData = async () => {
    setLoadingPackages(true);
    try {
      const [pkgs, publicTiers, quotes] = await Promise.all([
        fetchServicePackages().catch(() => []),
        fetchPublicSubscriptionTiers().catch(() => []),
        fetchPackageQuotes().catch(() => []),
      ]);
      setPackages(Array.isArray(pkgs) ? pkgs : []);
      setTiers(Array.isArray(publicTiers) ? publicTiers : []);
      setPackageQuotes(Array.isArray(quotes) ? quotes : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPackages(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCheckout = async (pkg: ServicePackage) => {
    setSelectedPkg(pkg);
    setIsModalOpen(true);
    setCheckoutData(null);
    setSuccessMessage(null);
    setSuccessIsScheduled(false);
    setPollingStatus("IDLE");
    setCountdownSeconds(15 * 60);
    setIsCheckingOut(true);

    try {
      const res = await createCheckoutPayment(pkg.id);
      setCheckoutData(res);
      setPollingStatus("POLLING");
      // Starting a new checkout may have cancelled an older pending order.
      window.dispatchEvent(new Event("moodify-notifications-updated"));
    } catch (err: any) {
      console.error("Lỗi tạo đơn thanh toán SePay:", err);
      alert(
        err.message || "Không thể tạo đơn thanh toán SePay. Vui lòng thử lại.",
      );
      setIsModalOpen(false);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Real-time polling kiểm tra thanh toán mỗi 3 giây
  useEffect(() => {
    if (!isModalOpen || !checkoutData || pollingStatus !== "POLLING") return;

    const intervalId = setInterval(async () => {
      try {
        const res = await getPaymentStatus(checkoutData.orderCode);
        if (res.status === "SUCCESS") {
          await handlePaymentSuccess(res);
        } else if (
          res.status === "CANCELLED" ||
          res.status === "EXPIRED" ||
          res.status === "FAILED"
        ) {
          setPollingStatus("EXPIRED");
          window.dispatchEvent(new Event("moodify-notifications-updated"));
        }
      } catch (e) {
        console.warn("Lỗi kiểm tra trạng thái thanh toán:", e);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isModalOpen, checkoutData, pollingStatus]);

  // Đếm ngược 15 phút
  useEffect(() => {
    if (!isModalOpen || pollingStatus !== "POLLING") return;
    // Keep polling at 00:00 until the backend finalizes the order and records
    // the expiry notification. The backend scheduler also expires abandoned QR orders.
    if (countdownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isModalOpen, pollingStatus, countdownSeconds]);

  const handleCopy = (text: string, field: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getPackageQuote = (pkg: ServicePackage | undefined) =>
    pkg ? packageQuotes.find((quote) => quote.id === pkg.id) : undefined;

  const formatPlanDate = (value?: string) => {
    if (!value) return "";
    const date = new Date(value.replace(" ", "T"));
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString("vi-VN", {
          dateStyle: "medium",
          timeStyle: "short",
        });
  };

  async function handlePaymentSuccess(status: PaymentStatusResponse) {
    const isScheduled =
      status.isEffectiveNow === false ||
      (status.isEffectiveNow === undefined &&
        !["NEW", "UPGRADE"].includes(checkoutData?.action || ""));
    const startAt = status.startAt || checkoutData?.startAt;
    const expiresAt = status.expiresAt || checkoutData?.expiresAt;
    setPollingStatus("SUCCESS");
    setSuccessIsScheduled(isScheduled);
    setSuccessMessage(
      isScheduled
        ? `Thanh toán thành công. Gói sẽ bắt đầu vào ${formatPlanDate(startAt)}${expiresAt ? ` và có hiệu lực đến ${formatPlanDate(expiresAt)}` : ""}.`
        : `Thanh toán thành công. Gói đã có hiệu lực${expiresAt ? ` đến ${formatPlanDate(expiresAt)}` : ""}.`,
    );
    await loadData();
    window.dispatchEvent(new CustomEvent("moodify-subscription-updated"));
    window.dispatchEvent(new Event("moodify-notifications-updated"));
  }

  const getActionLabel = (
    pkg: ServicePackage | undefined,
    fallback: string,
  ) => {
    const quote = getPackageQuote(pkg);
    if (!quote) return fallback;
    if (quote.isCurrentPackage) return "Gia hạn gói đang dùng";
    return quote.actionLabel;
  };

  const getDisplayedPrice = (pkg: ServicePackage | undefined) => {
    if (!pkg) return null;
    const quote = getPackageQuote(pkg);
    return quote?.amount ?? Number(pkg.price);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCheckoutData(null);
    setPollingStatus("IDLE");
    setSuccessMessage(null);
    setSuccessIsScheduled(false);
  };

  const handleManualCheck = async () => {
    if (!checkoutData) return;
    try {
      const res = await getPaymentStatus(checkoutData.orderCode);
      if (res.status === "SUCCESS") {
        await handlePaymentSuccess(res);
      } else if (
        res.status === "CANCELLED" ||
        res.status === "EXPIRED" ||
        res.status === "FAILED"
      ) {
        setPollingStatus("EXPIRED");
        window.dispatchEvent(new Event("moodify-notifications-updated"));
      } else {
        window.dispatchEvent(new Event("moodify-notifications-updated"));
        alert(
          "Hệ thống chưa nhận được thanh toán. Vui lòng đảm bảo bạn đã chuyển đúng số tiền và nội dung.",
        );
      }
    } catch (err: any) {
      alert("Hệ thống vẫn đang kiểm tra tự động. Vui lòng đợi trong giây lát.");
    }
  };

  // Distinct durations from active backend packages
  const availableDurations = Array.from(
    new Set(
      packages
        .map((pkg) => Number(pkg.durationDays ?? pkg.duration_days ?? 0))
        .filter((d) => Number.isFinite(d) && d > 0)
    )
  ).sort((a, b) => a - b);

  const effectiveCycle =
    selectedCycle !== "all" && !availableDurations.includes(selectedCycle)
      ? "all"
      : selectedCycle;

  const visiblePackages = [...packages]
    .filter((pkg) => {
      if (effectiveCycle === "all") return true;
      return Number(pkg.durationDays ?? pkg.duration_days) === effectiveCycle;
    })
    .sort((a, b) => {
      const orderDiff = (a.display_order ?? 0) - (b.display_order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return Number(a.price) - Number(b.price);
    });

  // Dynamic comparison matrix columns: FREE + active paid tiers
  const freeTier: PublicSubscriptionTier = tiers.find((t) => t.id === "FREE") ?? {
    id: "FREE",
    name: "Tài khoản Miễn phí",
    description: "Tài khoản mặc định",
    adPolicy: FREE_ENTITLEMENTS.adPolicy,
    adFreeDailyLimit: FREE_ENTITLEMENTS.adFreeDailyLimit,
    skipPolicy: FREE_ENTITLEMENTS.skipPolicy,
    skipDailyLimit: FREE_ENTITLEMENTS.skipDailyLimit,
    offlineAllowed: FREE_ENTITLEMENTS.offlineAllowed,
    offlineMaxTracks: FREE_ENTITLEMENTS.offlineMaxTracks,
    maxDevices: FREE_ENTITLEMENTS.maxDevices,
    vipBadge: false,
    entitlements: FREE_ENTITLEMENTS,
  };

  const paidComparisonColumns = (() => {
    const activeTierMap = new Map<
      string,
      { tierId: string; name: string; entitlements: PackageEntitlements; minPrice: number; minPriceDuration: number }
    >();
    for (const pkg of packages) {
      const tierId = pkg.tierId || pkg.tier_id || "";
      if (!tierId || tierId === "FREE") continue;
      const tierFromList = tiers.find((t) => t.id === tierId);
      const ent: PackageEntitlements = pkg.entitlements ?? tierFromList?.entitlements ?? {
        tier: tierId,
        adPolicy: tierFromList?.adPolicy ?? "NO_ADS",
        adFreeDailyLimit: tierFromList?.adFreeDailyLimit ?? 0,
        adIntervalAfterLimit: 0,
        skipPolicy: tierFromList?.skipPolicy ?? "UNLIMITED",
        skipDailyLimit: tierFromList?.skipDailyLimit ?? 0,
        offlineAllowed: tierFromList?.offlineAllowed ?? false,
        offlineMaxTracks: tierFromList?.offlineMaxTracks ?? 0,
        maxDevices: tierFromList?.maxDevices ?? 1,
        vipBadge: true,
      };
      const price = Number(pkg.price) || 0;
      const days = Number(pkg.durationDays ?? pkg.duration_days ?? 30);
      const existing = activeTierMap.get(tierId);
      if (!existing) {
        activeTierMap.set(tierId, {
          tierId,
          name: tierFromList?.name || pkg.tierName || pkg.tier_name || tierId,
          entitlements: ent,
          minPrice: price,
          minPriceDuration: days,
        });
      } else if (price < existing.minPrice) {
        existing.minPrice = price;
        existing.minPriceDuration = days;
      }
    }
    const tierOrder = tiers.map((t) => t.id);
    return Array.from(activeTierMap.values()).sort((a, b) => {
      const ia = tierOrder.indexOf(a.tierId);
      const ib = tierOrder.indexOf(b.tierId);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.minPrice - b.minPrice;
    });
  })();

  if (searchParams.get("tab") === "manage") {
    return <SubscriptionManagement />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-8">
      {/* Top Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold">
          <Crown className="w-4 h-4 text-amber-400" />
          <span>Gói thành viên Moodify</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
          Lựa chọn gói phù hợp với bạn
        </h1>
        <p className="text-white/60 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Danh sách gói, giá bán và quyền lợi bên dưới được cập nhật trực tiếp từ hệ thống.
        </p>
      </div>

      {/* Dynamic Cycle Selector */}
      {availableDurations.length > 1 && (
        <div className="flex justify-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setSelectedCycle("all")}
              className={`min-h-10 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                effectiveCycle === "all"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Tất cả ({packages.length})
            </button>
            {availableDurations.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setSelectedCycle(days)}
                className={`min-h-10 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer tabular-nums ${
                  effectiveCycle === days
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {formatCycleLabel(days)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Pricing Cards Grid */}
      {loadingPackages ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/60">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          <span>Đang tải danh sách gói dịch vụ...</span>
        </div>
      ) : visiblePackages.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center space-y-2 max-w-2xl mx-auto">
          <p className="text-base font-semibold text-white">Hiện chưa có gói dịch vụ nào đang mở bán</p>
          <p className="text-xs text-white/50">Vui lòng quay lại sau hoặc liên hệ quản trị viên.</p>
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 gap-6 mx-auto ${
            visiblePackages.length === 1
              ? "max-w-md"
              : visiblePackages.length === 2
              ? "md:grid-cols-2 max-w-5xl"
              : "md:grid-cols-2 lg:grid-cols-3 max-w-6xl"
          }`}
        >
          {visiblePackages.map((pkg) => {
            const quote = getPackageQuote(pkg);
            const displayedPrice = getDisplayedPrice(pkg) ?? Number(pkg.price);
            const durationDays = Number(pkg.durationDays ?? pkg.duration_days ?? 30);
            const tierName = pkg.tierName || pkg.tier_name || "Gói thành viên";
            const tierId = pkg.tierId || pkg.tier_id || "";
            const isHighlighted = tierId === "FAMILY" || (pkg.entitlements?.maxDevices ?? 1) > 1;
            const monthlyEquivalent =
              durationDays >= 60 ? Math.round(displayedPrice / (durationDays / 30)) : null;
            const benefits = buildPackageBenefitBullets(pkg);

            return (
              <div
                key={pkg.id}
                className={`rounded-3xl border p-7 flex flex-col justify-between shadow-2xl relative transition-all backdrop-blur-2xl ${
                  isHighlighted
                    ? "border-amber-400/50 bg-gradient-to-br from-amber-500/10 via-slate-950/85 to-purple-950/35 hover:border-amber-300"
                    : "border-purple-500/45 bg-gradient-to-br from-purple-950/35 via-slate-950/90 to-slate-900/50 hover:border-purple-400"
                }`}
              >
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`text-[11px] font-semibold block ${
                          isHighlighted ? "text-amber-300" : "text-purple-300"
                        }`}
                      >
                        {tierName}
                      </span>
                      <h3 className="text-xl md:text-2xl font-bold text-white mt-0.5">
                        {pkg.name}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/75 tabular-nums">
                      {formatCycleLabel(durationDays)}
                    </span>
                  </div>

                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl md:text-4xl font-extrabold text-white tabular-nums">
                        {displayedPrice.toLocaleString("vi-VN")} đ
                      </span>
                      <span className="text-xs text-white/50 font-medium">
                        / {formatCycleLabel(durationDays)}
                      </span>
                    </div>

                    {monthlyEquivalent !== null && (
                      <p
                        className={`text-xs mt-1.5 font-medium tabular-nums ${
                          isHighlighted ? "text-amber-300" : "text-purple-300"
                        }`}
                      >
                        Tương đương ~{monthlyEquivalent.toLocaleString("vi-VN")} đ/tháng
                      </p>
                    )}

                    {quote?.discountApplied && (
                      <p className="mt-1 text-xs font-semibold text-emerald-300 tabular-nums">
                        <span className="mr-1.5 text-white/35 line-through">
                          {quote.baseAmount.toLocaleString("vi-VN")} đ
                        </span>
                        Ưu đãi gia hạn cùng hạng gói: giảm {quote.discountPercent}%
                      </p>
                    )}

                    {quote?.actionDescription && (
                      <p className="mt-1.5 text-[11px] leading-4 text-white/55">
                        {quote.actionDescription}
                      </p>
                    )}
                  </div>

                  {/* Benefits from live entitlements */}
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <p
                      className={`text-xs font-semibold ${
                        isHighlighted ? "text-amber-300" : "text-purple-300"
                      }`}
                    >
                      Quyền lợi áp dụng:
                    </p>
                    <ul className="space-y-2.5 text-xs text-white/85">
                      {benefits.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isHighlighted ? "text-amber-400" : "text-emerald-400"
                            }`}
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenCheckout(pkg)}
                  className={`mt-8 w-full py-3.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isHighlighted
                      ? "text-black bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 hover:brightness-110 shadow-xl shadow-amber-500/20"
                      : "text-white bg-purple-600 hover:bg-purple-500 shadow-xl shadow-purple-600/25"
                  }`}
                >
                  <span>{getActionLabel(pkg, `Đăng ký ${pkg.name}`)}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Feature Comparison Matrix */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 backdrop-blur-2xl p-6 md:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/10 pb-5">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-white">
              So sánh quyền lợi các hạng gói
            </h3>
            <p className="text-xs text-white/50 mt-1">
              Mọi quyền lợi hiển thị theo cấu hình hiện hành của hệ thống.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/60 text-xs font-semibold">
                <th className="py-3 px-4 min-w-[180px]">Quyền lợi</th>
                <th className="py-3 px-4 min-w-[150px]">{freeTier.name}</th>
                {paidComparisonColumns.map((col) => (
                  <th key={col.tierId} className="py-3 px-4 min-w-[170px] text-amber-300">
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80 tabular-nums">
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Giá từ</td>
                <td className="py-3.5 px-4 text-white/60">0 đ</td>
                {paidComparisonColumns.map((col) => (
                  <td key={col.tierId} className="py-3.5 px-4 font-bold text-white">
                    {col.minPrice.toLocaleString("vi-VN")} đ{" "}
                    <span className="font-normal text-white/50">/ {formatCycleLabel(col.minPriceDuration)}</span>
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Quảng cáo</td>
                <td className="py-3.5 px-4 text-white/65">
                  {freeTier.adPolicy === "NO_ADS"
                    ? "Không quảng cáo"
                    : freeTier.adPolicy === "DAILY_QUOTA"
                    ? `${freeTier.adFreeDailyLimit} bài/ngày không QC`
                    : "Có quảng cáo"}
                </td>
                {paidComparisonColumns.map((col) => (
                  <td key={col.tierId} className="py-3.5 px-4 text-emerald-300 font-medium">
                    {col.entitlements.adPolicy === "NO_ADS"
                      ? "Không quảng cáo"
                      : col.entitlements.adPolicy === "DAILY_QUOTA"
                      ? `${col.entitlements.adFreeDailyLimit} bài/ngày không QC`
                      : "Có quảng cáo"}
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Chuyển bài</td>
                <td className="py-3.5 px-4 text-white/65">
                  {freeTier.skipPolicy === "UNLIMITED"
                    ? "Không giới hạn"
                    : `${freeTier.skipDailyLimit} lượt/ngày`}
                </td>
                {paidComparisonColumns.map((col) => (
                  <td key={col.tierId} className="py-3.5 px-4 text-sky-300 font-medium">
                    {col.entitlements.skipPolicy === "UNLIMITED"
                      ? "Không giới hạn"
                      : `${col.entitlements.skipDailyLimit} lượt/ngày`}
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Tải nhạc ngoại tuyến</td>
                <td className="py-3.5 px-4 text-white/50">
                  {freeTier.offlineAllowed
                    ? freeTier.offlineMaxTracks >= 9999
                      ? "Không giới hạn"
                      : `Tối đa ${freeTier.offlineMaxTracks} bài`
                    : "Không hỗ trợ"}
                </td>
                {paidComparisonColumns.map((col) => (
                  <td key={col.tierId} className="py-3.5 px-4 text-white">
                    {col.entitlements.offlineAllowed
                      ? col.entitlements.offlineMaxTracks >= 9999
                        ? "Không giới hạn"
                        : `Tối đa ${col.entitlements.offlineMaxTracks} bài`
                      : "Không hỗ trợ"}
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Số thiết bị đồng thời</td>
                <td className="py-3.5 px-4 text-white/65">{Math.max(1, freeTier.maxDevices)} thiết bị</td>
                {paidComparisonColumns.map((col) => (
                  <td key={col.tierId} className="py-3.5 px-4 text-white font-semibold">
                    {Math.max(1, col.entitlements.maxDevices)} thiết bị
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Giao diện &amp; huy hiệu VIP</td>
                <td className="py-3.5 px-4 text-white/45">Không</td>
                {paidComparisonColumns.map((col) => (
                  <td key={col.tierId} className="py-3.5 px-4 text-amber-300 font-medium">
                    Có (Huy hiệu &amp; Chủ đề VIP)
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SePay VietQR Checkout Modal */}
      {isModalOpen && selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-950 p-6 md:p-7 shadow-2xl space-y-5 text-white relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Crown className="w-5 h-5 text-slate-950 font-bold" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {pollingStatus === "SUCCESS"
                      ? "Thanh toán đã hoàn tất"
                      : "Thanh toán VietQR (SePay)"}
                  </h3>
                  <p className="text-[11px] text-white/50">
                    {pollingStatus === "SUCCESS"
                      ? successIsScheduled
                        ? "Lịch áp dụng gói đã được xác nhận"
                        : "Gói thành viên của bạn đã có hiệu lực"
                      : "SePay xác nhận thanh toán; gói được áp dụng theo chính sách hiển thị bên dưới"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-white/50 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Khi đang khởi tạo đơn checkout */}
            {isCheckingOut ? (
              <div className="text-center py-12 space-y-4">
                <Loader2 className="w-12 h-12 text-amber-400 mx-auto animate-spin" />
                <p className="text-base font-bold text-white">
                  Đang kết nối cổng thanh toán SePay...
                </p>
                <p className="text-xs text-white/50">
                  Đang khởi tạo mã QR VietQR và thông tin chuyển khoản an toàn.
                </p>
              </div>
            ) : pollingStatus === "SUCCESS" ? (
              /* Khi thanh toán thành công */
              <div
                className={`${successStyles.successState} text-center`}
                role="status"
                aria-live="polite"
              >
                <div className={successStyles.successVisual} aria-hidden="true">
                  <div
                    className={`${successStyles.orbit} ${successStyles.orbitGold}`}
                  />
                  <div
                    className={`${successStyles.orbit} ${successStyles.orbitTeal}`}
                  />
                  <span
                    className={`${successStyles.particle} ${successStyles.particleOne}`}
                  />
                  <span
                    className={`${successStyles.particle} ${successStyles.particleTwo}`}
                  />
                  <span
                    className={`${successStyles.particle} ${successStyles.particleThree}`}
                  />
                  <span
                    className={`${successStyles.particle} ${successStyles.particleFour}`}
                  />
                  <div className={successStyles.successCore}>
                    <Check
                      className="w-8 h-8 text-emerald-300"
                      strokeWidth={2.5}
                    />
                  </div>
                </div>

                <div className={successStyles.activatedBadge}>
                  <span className={successStyles.statusDot} />
                  {successIsScheduled
                    ? "GÓI ĐÃ ĐƯỢC XẾP LỊCH"
                    : "QUYỀN LỢI VIP ĐÃ MỞ KHÓA"}
                </div>

                <div className="mt-4 space-y-2">
                  <h4 className="text-2xl font-bold tracking-tight text-white">
                    {successIsScheduled
                      ? "Đã ghi nhận lịch gia hạn"
                      : "Chào mừng đến với Moodify VIP"}
                  </h4>
                  <p className="mx-auto max-w-sm text-sm leading-6 text-white/60">
                    {successMessage ||
                      "Gói thành viên của bạn đã được kích hoạt."}
                  </p>
                </div>

                <div className={successStyles.packageSummary}>
                  <div className={successStyles.packageIcon} aria-hidden="true">
                    <Crown className="h-4 w-4 text-amber-300" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <span className={successStyles.packageLabel}>
                      GÓI ĐĂNG KÝ
                    </span>
                    <p className={successStyles.packageName}>
                      {selectedPkg?.name ||
                        checkoutData?.packageName ||
                        "Moodify VIP"}
                    </p>
                  </div>
                  <span className={successStyles.activeMark}>
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {successIsScheduled ? "Đã xếp lịch" : "Đã áp dụng"}
                  </span>
                </div>

                <button
                  onClick={handleCloseModal}
                  className={`${successStyles.successButton} mt-5 w-full rounded-2xl px-5 py-3.5 text-sm font-semibold text-slate-950 cursor-pointer`}
                >
                  <span>Tiếp tục khám phá</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : pollingStatus === "EXPIRED" ? (
              /* Khi hết hạn 15 phút */
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border border-red-400 flex items-center justify-center">
                  <AlertCircle className="w-9 h-9 text-red-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-white">
                    Đơn hàng đã hết hạn
                  </h4>
                  <p className="text-xs text-white/50">
                    Mã QR và đơn thanh toán có hiệu lực tối đa trong 15 phút để
                    bảo đảm an toàn.
                  </p>
                </div>
                <button
                  onClick={() => selectedPkg && handleOpenCheckout(selectedPkg)}
                  className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm text-white bg-slate-800 hover:bg-slate-700 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Tạo lại mã thanh toán mới</span>
                </button>
              </div>
            ) : checkoutData ? (
              /* Giao diện quét QR và chuyển khoản */
              <>
                {/* Thông tin gói */}
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-white/50 uppercase tracking-wider block">
                      Gói đăng ký
                    </span>
                    <span className="font-bold text-sm text-white">
                      {checkoutData.packageName}
                    </span>
                    {checkoutData.discountApplied && (
                      <span className="mt-1 block text-[10px] font-semibold text-emerald-300">
                        Ưu đãi cùng nhóm quyền lợi: giảm{" "}
                        {checkoutData.discountPercent}% trên giá biến thể này
                      </span>
                    )}
                    <span className="mt-1 block max-w-[19rem] text-[10px] leading-4 text-white/50">
                      {checkoutData.actionDescription}
                    </span>
                    <span className="mt-1 block text-[10px] text-white/35">
                      Dự kiến: {formatPlanDate(checkoutData.startAt)} –{" "}
                      {formatPlanDate(checkoutData.expiresAt)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-white/50 uppercase tracking-wider block">
                      Tổng tiền
                    </span>
                    <span className="font-black text-amber-300 text-lg">
                      {checkoutData.amount.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                </div>
                <div className="-mt-2 px-3.5 pb-1 text-xs space-y-1">
                  <div className="flex justify-between text-white/45">
                    <span>Giá gốc</span>
                    <span>
                      {checkoutData.baseAmount.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                  {checkoutData.discountApplied && (
                    <div className="flex justify-between text-emerald-300">
                      <span>Ưu đãi cùng hạng gói</span>
                      <span>
                        -{checkoutData.discountAmount.toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                  )}
                </div>

                {/* Khung Mã QR VietQR SePay */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-3">
                  <div className="relative inline-block mx-auto bg-white p-2.5 rounded-2xl shadow-2xl">
                    <img
                      src={checkoutData.qrUrl}
                      alt="VietQR SePay"
                      className="w-48 h-48 md:w-52 md:h-52 object-contain rounded-xl"
                    />
                    <div className="absolute -top-2.5 -right-2.5 px-2 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950 uppercase shadow-md">
                      VietQR
                    </div>
                  </div>

                  {/* Countdown & Trạng thái Polling */}
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        Hết hạn sau:{" "}
                        <strong className="tabular-nums">{formatCountdown(countdownSeconds)}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>Đang chờ thanh toán</span>
                    </div>
                  </div>
                </div>

                {/* Bảng Chuyển Khoản Thủ Công */}
                <div className="space-y-2 text-xs">
                  <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider px-1">
                    Hoặc chuyển khoản thủ công qua App:
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                    {/* Ngân hàng */}
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Ngân hàng:</span>
                      <span className="font-bold text-white">
                        {checkoutData.bankName}
                      </span>
                    </div>

                    {/* Số tài khoản */}
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Số tài khoản:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">
                          {checkoutData.bankAccount}
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(checkoutData.bankAccount, "account")
                          }
                          className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                          title="Sao chép số tài khoản"
                        >
                          {copiedField === "account" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Tên chủ tài khoản */}
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Chủ tài khoản:</span>
                      <span className="font-semibold text-white uppercase">
                        {checkoutData.accountName}
                      </span>
                    </div>

                    {/* Số tiền */}
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Số tiền:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-300 text-sm">
                          {checkoutData.amount.toLocaleString("vi-VN")} đ
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(String(checkoutData.amount), "amount")
                          }
                          className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                          title="Sao chép số tiền"
                        >
                          {copiedField === "amount" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Nội dung chuyển khoản */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-white/50 block">
                          Nội dung CK:
                        </span>
                        <span className="text-[10px] text-amber-400/80">
                          (Bắt buộc chính xác)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-300 text-base bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/30">
                          {checkoutData.transferContent}
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(checkoutData.transferContent, "content")
                          }
                          className="p-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition-colors cursor-pointer shadow-md"
                          title="Sao chép nội dung"
                        >
                          {copiedField === "content" ? (
                            <Check className="w-4 h-4 text-emerald-950" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-950" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleManualCheck}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-slate-800 hover:bg-slate-700 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Tôi đã chuyển tiền - Kiểm tra ngay</span>
                  </button>

                  <p className="text-[11px] text-center text-white/40">
                    Hệ thống tự động kích hoạt gói VIP ngay khi nhận được biến
                    động số dư.
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
