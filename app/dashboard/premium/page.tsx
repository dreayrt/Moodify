"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Crown,
  Check,
  Sparkles,
  Download,
  Users,
  ShieldCheck,
  Zap,
  QrCode,
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
  fetchPackageQuotes,
  fetchMySubscription,
  subscribePackage,
  devTogglePremium,
  createCheckoutPayment,
  getPaymentStatus,
  type ServicePackage,
  type PackageQuote,
  type SubscriptionInfo,
  type CheckoutResponse,
  type PaymentStatusResponse,
} from "@/lib/api-client";

export default function PremiumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [packageQuotes, setPackageQuotes] = useState<PackageQuote[]>([]);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<"1month" | "3months" | "1year">("1month");

  // Payment modal state (SePay VietQR)
  const [selectedPkg, setSelectedPkg] = useState<ServicePackage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(null);
  const [pollingStatus, setPollingStatus] = useState<"IDLE" | "POLLING" | "SUCCESS" | "EXPIRED" | "ERROR">("IDLE");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(15 * 60);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successIsScheduled, setSuccessIsScheduled] = useState(false);

  const loadData = async () => {
    try {
      const [pkgs, sub] = await Promise.all([
        fetchServicePackages().catch(() => []),
        fetchMySubscription().catch(() => null),
      ]);
      const quotes = await fetchPackageQuotes().catch(() => []);
      setPackages(pkgs);
      setSubInfo(sub);
      setPackageQuotes(quotes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick dev toggle
  const handleDevToggle = async (enable: boolean, targetPkgId?: number) => {
    try {
      setIsProcessing(true);
      await devTogglePremium(enable, 30, targetPkgId);
      await loadData();
      window.dispatchEvent(new CustomEvent("moodify-subscription-updated"));
    } catch (err: any) {
      alert(err.message || "Lỗi khi đổi trạng thái");
    } finally {
      setIsProcessing(false);
    }
  };

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
      alert(err.message || "Không thể tạo đơn thanh toán SePay. Vui lòng thử lại!");
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
        } else if (res.status === "CANCELLED" || res.status === "EXPIRED" || res.status === "FAILED") {
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
      : date.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
  };

  async function handlePaymentSuccess(status: PaymentStatusResponse) {
    const isScheduled = status.isEffectiveNow === false
      || (status.isEffectiveNow === undefined
        && !["NEW", "UPGRADE"].includes(checkoutData?.action || ""));
    const startAt = status.startAt || checkoutData?.startAt;
    const expiresAt = status.expiresAt || checkoutData?.expiresAt;
    setPollingStatus("SUCCESS");
    setSuccessIsScheduled(isScheduled);
    setSuccessMessage(isScheduled
      ? `Thanh toán thành công. Gói sẽ bắt đầu vào ${formatPlanDate(startAt)}${expiresAt ? ` và có hiệu lực đến ${formatPlanDate(expiresAt)}` : ""}.`
      : `Thanh toán thành công. Gói đã có hiệu lực${expiresAt ? ` đến ${formatPlanDate(expiresAt)}` : ""}.`);
    await loadData();
    window.dispatchEvent(new CustomEvent("moodify-subscription-updated"));
    window.dispatchEvent(new Event("moodify-notifications-updated"));
  }

  const getActionLabel = (pkg: ServicePackage | undefined, fallback: string) => {
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
      } else if (res.status === "CANCELLED" || res.status === "EXPIRED" || res.status === "FAILED") {
        setPollingStatus("EXPIRED");
        window.dispatchEvent(new Event("moodify-notifications-updated"));
      } else {
        window.dispatchEvent(new Event("moodify-notifications-updated"));
        alert("Hệ thống chưa nhận được thanh toán. Vui lòng đảm bảo bạn đã chuyển đúng số tiền và nội dung!");
      }
    } catch (err: any) {
      alert("Hệ thống vẫn đang kiểm tra tự động. Vui lòng đợi trong giây lát!");
    }
  };

  // Find the package matching the selected tier and duration.
  const getPackageForTier = (type: "full" | "family") => {
    const tierId = type === "full" ? "INDIVIDUAL_FULL" : "FAMILY";
    const inTier = packages.filter((pkg) => (pkg.tier_id || pkg.tierId) === tierId);
    if (inTier.length > 0) {
      const wantedDuration = cycle === "1year" ? 365 : cycle === "3months" ? 90 : 30;
      return inTier.find((pkg) => pkg.duration_days === wantedDuration)
        || inTier.find((pkg) => Math.abs(pkg.duration_days - wantedDuration) < 20)
        || inTier[0];
    }

    if (type === "full") {
      if (cycle === "3months") {
        return packages.find((pkg) => pkg.name.includes("FULL") && pkg.duration_days === 90) || packages.find((pkg) => pkg.id === 4);
      }
      if (cycle === "1year") {
        return packages.find((pkg) => pkg.name.includes("FULL") && pkg.duration_days > 100) || packages.find((pkg) => pkg.id === 5);
      }
      return packages.find((pkg) => pkg.name.includes("FULL") && pkg.duration_days <= 31) || packages.find((pkg) => pkg.id === 3);
    }

    if (cycle === "1year") {
      return packages.find((pkg) => pkg.duration_days > 100 && (pkg.tier_id || pkg.tierId) === "FAMILY") || packages.find((pkg) => pkg.id === 7);
    }
    return packages.find((pkg) => pkg.duration_days <= 31 && (pkg.tier_id || pkg.tierId) === "FAMILY") || packages.find((pkg) => pkg.id === 6);
  };

  const fullPkg = getPackageForTier("full");
  const famPkg = getPackageForTier("family");

  if (searchParams.get("tab") === "manage") {
    return <SubscriptionManagement />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-10">
      {/* Top Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          <Crown className="w-4 h-4 text-amber-400" />
          <span>Moodify Premium VIP</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
          Âm Nhạc Không Giới Hạn, Cảm Xúc Thăng Hoa.
        </h1>
        <p className="text-white/60 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Lựa chọn gói dịch vụ phù hợp: VIP Cá nhân không giới hạn hoặc Chia sẻ trọn bộ gia đình với chi phí tiết kiệm nhất.
        </p>
      </div>

      {/* Account Status Card & Dev Quick Toggle */}
      <div className="p-5 rounded-2xl border border-white/10 bg-slate-950/70 backdrop-blur-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              subInfo?.isPremium
                ? "bg-amber-400/15 border-amber-400/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                : "bg-white/5 border-white/10 text-white/50"
            }`}
          >
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Trạng thái tài khoản:
              </p>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                  subInfo?.isPremium
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                    : "bg-white/10 text-white/70"
                }`}
              >
                {subInfo?.isPremium ? subInfo.tier : "FREE"}
              </span>
            </div>
            <p className="text-base font-bold text-white mt-0.5">
              {subInfo?.packageName || "Tài khoản Miễn phí"}
              {subInfo?.isPremium && subInfo.daysRemaining > 0 && (
                <span className="text-xs font-medium text-emerald-400 ml-2">
                  (Còn {subInfo.daysRemaining} ngày)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Dev Quick Tier Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 self-end md:self-auto">
          <div className="text-right hidden sm:block">
            <span className="text-[10.5px] text-white/40 block">Chế độ Test đồ án:</span>
            <span className="text-xs font-semibold text-purple-300">Chuyển gói tức thì (1-click)</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/[0.05] border border-white/10">
            <button
              onClick={() => handleDevToggle(false)}
              disabled={isProcessing}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !subInfo?.isPremium
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
              title="Chuyển về tài khoản miễn phí"
            >
              Miễn phí (Free)
            </button>
            <button
              onClick={() => handleDevToggle(true, 3)}
              disabled={isProcessing}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subInfo?.isPremium && subInfo?.tier !== "FAMILY"
                  ? "bg-purple-500/40 text-purple-200 border border-purple-400/40 shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
              title="Kích hoạt Gói VIP Cá Nhân (29K)"
            >
              VIP Cá Nhân (29K)
            </button>
            <button
              onClick={() => handleDevToggle(true, 6)}
              disabled={isProcessing}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subInfo?.isPremium && subInfo?.tier === "FAMILY"
                  ? "bg-amber-400/30 text-amber-300 border border-amber-400/40 shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
              title="Kích hoạt Gói Gia Đình (59K)"
            >
              Gia Đình (59K)
            </button>
          </div>
        </div>
      </div>

      {/* Cycle Selector */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
          <button
            onClick={() => setCycle("1month")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              cycle === "1month"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "text-white/60 hover:text-white"
            }`}
          >
            Hàng Tháng (30 ngày)
          </button>
          <button
            onClick={() => setCycle("3months")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              cycle === "3months"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "text-white/60 hover:text-white"
            }`}
          >
            <span>3 Tháng</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-400 text-black font-extrabold">
              -10%
            </span>
          </button>
          <button
            onClick={() => setCycle("1year")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              cycle === "1year"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "text-white/60 hover:text-white"
            }`}
          >
            <span>1 Năm</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-400 text-black font-extrabold">
              TẶNG 2 THÁNG
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid - 2 Columns (Centered & Balanced) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Card 1: Gói Cá Nhân FULL */}
        <div className="rounded-3xl border-2 border-purple-500/60 bg-gradient-to-br from-purple-950/40 via-slate-950/90 to-purple-900/20 backdrop-blur-2xl p-7 flex flex-col justify-between shadow-2xl relative group hover:border-purple-400 transition-all">
          <div className="absolute -top-0.5 right-6 px-3 py-1 rounded-b-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-black tracking-wider uppercase shadow-md">
            PHỔ BIẾN NHẤT • VIP CÁ NHÂN
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  Trọn Vẹn Đặc Quyền • 1 Người
                </span>
                <h3 className="text-2xl font-extrabold text-white mt-0.5">VIP Cá Nhân</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            {/* Price */}
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-white">
                  {(getDisplayedPrice(fullPkg) ?? (cycle === "1year" ? 279000 : cycle === "3months" ? 79000 : 29000)).toLocaleString("vi-VN")} đ
                </span>
                <span className="text-xs text-white/50 font-medium">
                  / {cycle === "1year" ? "năm" : cycle === "3months" ? "3 tháng" : "tháng"}
                </span>
              </div>
              <p className="text-[11.5px] text-purple-300 mt-1.5 font-medium">
                {cycle === "1year" ? "Tương đương ~23.250 đ/tháng (Tiết kiệm 69.000 đ)" : cycle === "3months" ? "Tương đương ~26.300 đ/tháng (Tiết kiệm 8.000 đ)" : "Chỉ 29.000 đ/tháng - Trọn vẹn đặc quyền không giới hạn"}
              </p>
              {getPackageQuote(fullPkg)?.discountApplied && (
                <p className="mt-1 text-[10px] font-semibold text-emerald-300">
                  <span className="mr-1 text-white/35 line-through">
                    {getPackageQuote(fullPkg)?.baseAmount.toLocaleString("vi-VN")} đ
                  </span>
                  Gia hạn cùng nhóm quyền lợi: giảm 20%
                </p>
              )}
              {getPackageQuote(fullPkg)?.actionDescription && (
                <p className="mt-1 text-[10px] leading-4 text-white/45">
                  {getPackageQuote(fullPkg)?.actionDescription}
                </p>
              )}
            </div>

            {/* Benefits */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <p className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                Đặc quyền cá nhân không giới hạn:
              </p>
              <ul className="space-y-2.5 text-xs text-white/80">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-white">100% Không quảng cáo vĩnh viễn</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Chuyển bài (Skip) <strong>hoàn toàn vô hạn</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Tải nhạc ngoại tuyến không giới hạn bài hát</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Chất lượng âm thanh <strong>Ultra HD 320 kbps Lossless</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Mở khóa Theme hào quang <strong>Obsidian Royal Gold</strong> & Huy hiệu VIP</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-300 shrink-0" />
                  <span>Dành riêng cho 1 tài khoản cá nhân</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => fullPkg && handleOpenCheckout(fullPkg)}
            className="mt-8 w-full py-3.5 px-4 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-500 shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{getActionLabel(fullPkg, "Nâng Cấp Cá Nhân FULL")}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: Gói Gia Đình */}
        <div className="rounded-3xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-500/10 via-slate-950/80 to-purple-950/40 backdrop-blur-2xl p-7 flex flex-col justify-between shadow-2xl relative group overflow-hidden">
          <div className="absolute -top-0.5 right-6 px-3 py-1 rounded-b-xl bg-gradient-to-r from-amber-400 to-amber-300 text-black text-[10px] font-black tracking-wider uppercase shadow-md">
            TIẾT KIỆM NHẤT • 6 NGƯỜI
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  Dành Cho 6 Tài Khoản Độc Lập
                </span>
                <h3 className="text-2xl font-extrabold text-white mt-0.5">Gói Gia Đình</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Price */}
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-white">
                  {(getDisplayedPrice(famPkg) ?? (cycle === "1year" ? 590000 : 59000)).toLocaleString("vi-VN")} đ
                </span>
                <span className="text-xs text-white/50 font-medium">
                  / {cycle === "1year" ? "năm" : "tháng"}
                </span>
              </div>
              <p className="text-[11.5px] text-amber-300 font-medium mt-1.5">
                {cycle === "1year" ? "Chỉ ~8.200 đ / người / tháng khi chia 6 người (Tặng 2 tháng)" : "Chỉ ~9.800 đ / người / tháng khi chia 6 người"}
              </p>
              {getPackageQuote(famPkg)?.discountApplied && (
                <p className="mt-1 text-[10px] font-semibold text-emerald-300">
                  <span className="mr-1 text-white/35 line-through">
                    {getPackageQuote(famPkg)?.baseAmount.toLocaleString("vi-VN")} đ
                  </span>
                  Gia hạn cùng nhóm quyền lợi: giảm 20%
                </p>
              )}
              {getPackageQuote(famPkg)?.actionDescription && (
                <p className="mt-1 text-[10px] leading-4 text-white/45">
                  {getPackageQuote(famPkg)?.actionDescription}
                </p>
              )}
            </div>

            {/* Benefits */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                Đặc quyền trọn bộ gia đình:
              </p>
              <ul className="space-y-2.5 text-xs text-white/80">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-white">Chia sẻ tối đa 6 tài khoản độc lập</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Kho nhạc, playlist & thư viện riêng tư từng thành viên</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Chặn 100% quảng cáo cho cả 6 thành viên</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Chuyển bài & tải offline không giới hạn cho mọi thành viên</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Chất lượng âm thanh <strong>Ultra HD 320 kbps Lossless</strong> cho tất cả</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Huy hiệu VIP Crown cho toàn bộ 6 thành viên</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => famPkg && handleOpenCheckout(famPkg)}
            className="mt-8 w-full py-3.5 px-4 rounded-xl font-bold text-xs text-black bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 hover:brightness-110 shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{getActionLabel(famPkg, "Nâng Cấp Gia Đình (6 Người)")}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Feature Comparison Matrix */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 backdrop-blur-2xl p-6 md:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/10 pb-5">
          <div>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">
              Bảng so sánh chi tiết
            </span>
            <h3 className="text-xl md:text-2xl font-black text-white mt-1">
              Đặc quyền & Phân cấp các gói dịch vụ Moodify
            </h3>
          </div>
          <p className="text-xs text-white/50 max-w-sm">
            Tất cả quyền lợi được hệ thống tự động nhận diện và áp dụng trực tiếp theo thời gian thực.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/50 uppercase text-[10.5px] font-bold tracking-wider">
                <th className="py-3 px-4 w-[37%]">Tính năng / Quyền lợi</th>
                <th className="py-3 px-4 w-[21%]">Miễn phí (FREE)</th>
                <th className="py-3 px-4 w-[21%] text-purple-300">VIP Cá Nhân (29K)</th>
                <th className="py-3 px-4 w-[21%] text-amber-300">Gia Đình (59K)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {/* Row 1: Giá cước */}
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Giá cước hàng tháng</td>
                <td className="py-3.5 px-4 font-medium text-white/60">0 đ</td>
                <td className="py-3.5 px-4 font-bold text-purple-300">29.000 đ</td>
                <td className="py-3.5 px-4 font-bold text-amber-300">59.000 đ <span className="text-[10px] block text-white/40 font-normal">(~9.8k/người)</span></td>
              </tr>

              {/* Row 2: Quảng cáo */}
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">
                  Chặn quảng cáo
                  <span className="block text-[11px] text-white/40 font-normal">Audio lồng nhạc nền & Banner đếm ngược</span>
                </td>
                <td className="py-3.5 px-4 text-red-300">Quảng cáo sau mỗi 3 bài</td>
                <td className="py-3.5 px-4 text-purple-200 font-bold">100% Không quảng cáo vĩnh viễn</td>
                <td className="py-3.5 px-4 text-amber-200 font-bold">100% Không quảng cáo (Cả 6 người)</td>
              </tr>

              {/* Row 3: Skip bài */}
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Chuyển bài hát (Skip)</td>
                <td className="py-3.5 px-4 text-white/60">Giới hạn 6 lượt / ngày</td>
                <td className="py-3.5 px-4 text-purple-200 font-bold">Không giới hạn (Vô hạn)</td>
                <td className="py-3.5 px-4 text-amber-200 font-bold">Không giới hạn (Cả 6 người)</td>
              </tr>

              {/* Row 4: Tải offline */}
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Tải nhạc ngoại tuyến (MP3)</td>
                <td className="py-3.5 px-4 text-white/40">Không hỗ trợ</td>
                <td className="py-3.5 px-4 text-purple-200 font-bold">Không giới hạn bài hát</td>
                <td className="py-3.5 px-4 text-amber-200 font-bold">Không giới hạn bài hát</td>
              </tr>

              {/* Row 5: Chất lượng âm thanh */}
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Chất lượng âm thanh tối đa</td>
                <td className="py-3.5 px-4 text-white/60">Chuẩn 128 kbps</td>
                <td className="py-3.5 px-4 text-purple-200 font-bold">Ultra HD 320 kbps Lossless</td>
                <td className="py-3.5 px-4 text-amber-200 font-bold">Ultra HD 320 kbps Lossless</td>
              </tr>

              {/* Row 6: Thiết bị / Tài khoản */}
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Số lượng thiết bị / tài khoản</td>
                <td className="py-3.5 px-4 text-white/60">1 thiết bị</td>
                <td className="py-3.5 px-4 text-white/60">1 thiết bị cá nhân</td>
                <td className="py-3.5 px-4 text-amber-300 font-bold">Tối đa 6 tài khoản độc lập</td>
              </tr>

              {/* Row 7: Chủ đề VIP */}
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">
                  Theme Hoàng Kim & Mascot VIP
                  <span className="block text-[11px] text-white/40 font-normal">Hào quang Obsidian Royal Gold & Tùy biến nút phát</span>
                </td>
                <td className="py-3.5 px-4 text-white/40">Khóa</td>
                <td className="py-3.5 px-4 text-purple-200 font-bold">Mở khóa trọn bộ đặc quyền VIP</td>
                <td className="py-3.5 px-4 text-amber-200 font-bold">Mở khóa trọn bộ cho cả 6 thành viên</td>
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
                    {pollingStatus === "SUCCESS" ? "Thanh toán đã hoàn tất" : "Thanh toán VietQR (SePay)"}
                  </h3>
                  <p className="text-[11px] text-white/50">
                    {pollingStatus === "SUCCESS"
                      ? successIsScheduled ? "Lịch áp dụng gói đã được xác nhận" : "Gói thành viên của bạn đã có hiệu lực"
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
                <p className="text-base font-bold text-white">Đang kết nối cổng thanh toán SePay...</p>
                <p className="text-xs text-white/50">Đang khởi tạo mã QR VietQR và thông tin chuyển khoản an toàn.</p>
              </div>
            ) : pollingStatus === "SUCCESS" ? (
              /* Khi thanh toán thành công */
              <div className={`${successStyles.successState} text-center`} role="status" aria-live="polite">
                <div className={successStyles.successVisual} aria-hidden="true">
                  <div className={`${successStyles.orbit} ${successStyles.orbitGold}`} />
                  <div className={`${successStyles.orbit} ${successStyles.orbitTeal}`} />
                  <span className={`${successStyles.particle} ${successStyles.particleOne}`} />
                  <span className={`${successStyles.particle} ${successStyles.particleTwo}`} />
                  <span className={`${successStyles.particle} ${successStyles.particleThree}`} />
                  <span className={`${successStyles.particle} ${successStyles.particleFour}`} />
                  <div className={successStyles.successCore}>
                    <Check className="w-8 h-8 text-emerald-300" strokeWidth={2.5} />
                  </div>
                </div>

                <div className={successStyles.activatedBadge}>
                  <span className={successStyles.statusDot} />
                  {successIsScheduled ? "GÓI ĐÃ ĐƯỢC XẾP LỊCH" : "QUYỀN LỢI VIP ĐÃ MỞ KHÓA"}
                </div>

                <div className="mt-4 space-y-2">
                  <h4 className="text-2xl font-bold tracking-tight text-white">
                    {successIsScheduled ? "Đã ghi nhận lịch gia hạn" : "Chào mừng đến với Moodify VIP"}
                  </h4>
                  <p className="mx-auto max-w-sm text-sm leading-6 text-white/60">
                    {successMessage || "Gói thành viên của bạn đã được kích hoạt."}
                  </p>
                </div>

                <div className={successStyles.packageSummary}>
                  <div className={successStyles.packageIcon} aria-hidden="true">
                    <Crown className="h-4 w-4 text-amber-300" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <span className={successStyles.packageLabel}>GÓI ĐĂNG KÝ</span>
                    <p className={successStyles.packageName}>
                      {selectedPkg?.name || checkoutData?.packageName || "Moodify VIP"}
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
                  <h4 className="text-lg font-bold text-white">Đơn hàng đã hết hạn</h4>
                  <p className="text-xs text-white/50">
                    Mã QR và đơn thanh toán có hiệu lực tối đa trong 15 phút để bảo đảm an toàn.
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
                    <span className="text-[11px] text-white/50 uppercase tracking-wider block">Gói đăng ký</span>
                    <span className="font-bold text-sm text-white">{checkoutData.packageName}</span>
                    {checkoutData.discountApplied && (
                      <span className="mt-1 block text-[10px] font-semibold text-emerald-300">
                        Ưu đãi cùng nhóm quyền lợi: giảm {checkoutData.discountPercent}% trên giá biến thể này
                      </span>
                    )}
                    <span className="mt-1 block max-w-[19rem] text-[10px] leading-4 text-white/50">
                      {checkoutData.actionDescription}
                    </span>
                    <span className="mt-1 block text-[10px] text-white/35">
                      Dự kiến: {formatPlanDate(checkoutData.startAt)} – {formatPlanDate(checkoutData.expiresAt)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-white/50 uppercase tracking-wider block">Tổng tiền</span>
                    <span className="font-black text-amber-300 text-lg">
                      {checkoutData.amount.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                </div>
                <div className="-mt-2 px-3.5 pb-1 text-xs space-y-1">
                  <div className="flex justify-between text-white/45">
                    <span>Giá gốc</span>
                    <span>{checkoutData.baseAmount.toLocaleString("vi-VN")} đ</span>
                  </div>
                  {checkoutData.discountApplied && (
                    <div className="flex justify-between text-emerald-300">
                      <span>Ưu đãi cùng tier</span>
                      <span>-{checkoutData.discountAmount.toLocaleString("vi-VN")} đ</span>
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
                    <div className="absolute -top-2.5 -right-2.5 px-2 py-0.5 rounded-full bg-emerald-500 text-[10px] font-black text-slate-950 uppercase shadow-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping"></span>
                      VietQR
                    </div>
                  </div>

                  {/* Countdown & Trạng thái Polling */}
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Hết hạn sau: <strong>{formatCountdown(countdownSeconds)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
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
                      <span className="font-bold text-white">{checkoutData.bankName}</span>
                    </div>

                    {/* Số tài khoản */}
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Số tài khoản:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">{checkoutData.bankAccount}</span>
                        <button
                          onClick={() => handleCopy(checkoutData.bankAccount, "account")}
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
                      <span className="font-semibold text-white uppercase">{checkoutData.accountName}</span>
                    </div>

                    {/* Số tiền */}
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Số tiền:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-300 text-sm">
                          {checkoutData.amount.toLocaleString("vi-VN")} đ
                        </span>
                        <button
                          onClick={() => handleCopy(String(checkoutData.amount), "amount")}
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
                        <span className="text-white/50 block">Nội dung CK:</span>
                        <span className="text-[10px] text-amber-400/80">(Bắt buộc chính xác)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-300 text-base bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/30">
                          {checkoutData.transferContent}
                        </span>
                        <button
                          onClick={() => handleCopy(checkoutData.transferContent, "content")}
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
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tôi đã chuyển tiền - Kiểm tra ngay</span>
                  </button>

                  <p className="text-[11px] text-center text-white/40">
                    💡 Hệ thống tự động kích hoạt gói VIP ngay khi nhận được biến động số dư.
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
