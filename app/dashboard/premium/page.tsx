"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Check,
  Sparkles,
  Download,
  Volume2,
  Users,
  ShieldCheck,
  Zap,
  QrCode,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  fetchServicePackages,
  fetchMySubscription,
  subscribePackage,
  devTogglePremium,
  type ServicePackage,
  type SubscriptionInfo,
} from "@/lib/api-client";

export default function PremiumPage() {
  const router = useRouter();

  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<"1month" | "3months" | "1year">("1month");

  // Payment modal state
  const [selectedPkg, setSelectedPkg] = useState<ServicePackage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [pkgs, sub] = await Promise.all([
        fetchServicePackages().catch(() => []),
        fetchMySubscription().catch(() => null),
      ]);
      setPackages(pkgs);
      setSubInfo(sub);
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
  const handleDevToggle = async (enable: boolean) => {
    try {
      setIsProcessing(true);
      await devTogglePremium(enable, 30);
      await loadData();
      window.dispatchEvent(new CustomEvent("moodify-subscription-updated"));
    } catch (err: any) {
      alert(err.message || "Lỗi khi đổi trạng thái");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenCheckout = (pkg: ServicePackage) => {
    setSelectedPkg(pkg);
    setIsModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPkg) return;
    try {
      setIsProcessing(true);
      const res = await subscribePackage(selectedPkg.id, "QR_TRANSFER");
      setSuccessMessage(res.message || "Kích hoạt thành công gói VIP!");
      await loadData();
      window.dispatchEvent(new CustomEvent("moodify-subscription-updated"));
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      alert(err.message || "Thanh toán thất bại");
    } finally {
      setIsProcessing(false);
    }
  };

  // Find packages based on selected duration
  const getPackageForTier = (type: "individual" | "family") => {
    if (type === "individual") {
      if (cycle === "1month") return packages.find((p) => p.id === 1) || packages[0];
      if (cycle === "3months") return packages.find((p) => p.id === 2) || packages[1];
      return packages.find((p) => p.id === 3) || packages[2];
    } else {
      if (cycle === "1year") return packages.find((p) => p.id === 5) || packages[4];
      return packages.find((p) => p.id === 4) || packages[3];
    }
  };

  const indPkg = getPackageForTier("individual");
  const famPkg = getPackageForTier("family");

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-10">
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
          Tận hưởng 100% không quảng cáo, tải bài hát về máy, phát theo thứ tự tùy thích và mở khóa nền hào quang hoàng gia sang trọng.
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

        {/* Dev Toggle Button */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="text-right hidden sm:block">
            <span className="text-[10.5px] text-white/40 block">Chế độ Test đồ án:</span>
            <span className="text-xs font-semibold text-purple-300">Bật/Tắt VIP 1-click</span>
          </div>
          {subInfo?.isPremium ? (
            <button
              onClick={() => handleDevToggle(false)}
              disabled={isProcessing}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-300 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 transition-all cursor-pointer"
            >
              Tắt VIP (Về Free)
            </button>
          ) : (
            <button
              onClick={() => handleDevToggle(true)}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-300 to-amber-400 hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Bật VIP Test Ngay</span>
            </button>
          )}
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
              -12%
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

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* Card 1: Cá Nhân */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 backdrop-blur-2xl p-6 md:p-8 flex flex-col justify-between shadow-2xl relative group hover:border-purple-400/40 transition-all">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                  Dành Cho 1 Người
                </span>
                <h3 className="text-2xl font-extrabold text-white mt-1">Gói Cá Nhân</h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            {/* Price */}
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-white">
                  {indPkg ? (indPkg.price).toLocaleString("vi-VN") : "49.000"} đ
                </span>
                <span className="text-sm text-white/50 font-medium">
                  / {cycle === "1year" ? "năm" : cycle === "3months" ? "3 tháng" : "tháng"}
                </span>
              </div>
              <p className="text-xs text-emerald-400 mt-1 font-medium">
                {cycle === "1year"
                  ? "Tương đương ~39.000 đ/tháng (Rẻ hơn Spotify 34%)"
                  : cycle === "3months"
                  ? "Tương đương ~43.000 đ/tháng"
                  : "Rẻ hơn Spotify 17% (59.000 đ)"}
              </p>
            </div>

            {/* Benefits */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <p className="text-xs font-bold text-white/50 uppercase tracking-wider">
                Đặc quyền gói cá nhân:
              </p>
              <ul className="space-y-2.5 text-xs text-white/80">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Chặn 100% quảng cáo ngắt quãng</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Tải bài hát ngoại tuyến về máy không giới hạn</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Phát theo thứ tự tùy thích (Bỏ giới hạn 6 skip/giờ)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Mở khóa Theme hào quang Obsidian Royal Gold</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Huy hiệu VIP vàng óng cạnh Avatar & Linh vật</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => indPkg && handleOpenCheckout(indPkg)}
            className="mt-8 w-full py-3.5 px-5 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-500 shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Nâng Cấp Cá Nhân</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 2: Gia Đình (Best Value) */}
        <div className="rounded-3xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-500/10 via-slate-950/80 to-purple-950/40 backdrop-blur-2xl p-6 md:p-8 flex flex-col justify-between shadow-2xl relative group overflow-hidden">
          {/* Top highlight ribbon */}
          <div className="absolute -top-0.5 right-6 px-3 py-1 rounded-b-xl bg-gradient-to-r from-amber-400 to-amber-300 text-black text-[10px] font-black tracking-wider uppercase shadow-md">
            TIẾT KIỆM NHẤT • 6 NGƯỜI
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Dành Cho 6 Tài Khoản
                </span>
                <h3 className="text-2xl font-extrabold text-white mt-1">Gói Gia Đình</h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Price */}
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-white">
                  {famPkg ? (famPkg.price).toLocaleString("vi-VN") : "79.000"} đ
                </span>
                <span className="text-sm text-white/50 font-medium">
                  / {cycle === "1year" ? "năm" : "tháng"}
                </span>
              </div>
              <p className="text-xs text-amber-300 font-medium mt-1">
                Chỉ ~13.100 đ / người / tháng khi chia sẻ 6 thành viên
              </p>
            </div>

            {/* Benefits */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Đặc quyền trọn bộ gia đình:
              </p>
              <ul className="space-y-2.5 text-xs text-white/80">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-white">
                    Chia sẻ tối đa 6 tài khoản độc lập
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Mỗi người có kho nhạc, bài hát yêu thích riêng tư 100%</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Chặn 100% quảng cáo cho cả 6 thành viên</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Tải nhạc offline và nghe tùy thích không giới hạn</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Huy hiệu VIP & Theme hoàng gia cho toàn bộ thành viên</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => famPkg && handleOpenCheckout(famPkg)}
            className="mt-8 w-full py-3.5 px-5 rounded-2xl font-bold text-sm text-black bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 hover:brightness-110 shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Nâng Cấp Gia Đình (6 Tài Khoản)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      {isModalOpen && selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-950 p-6 md:p-7 shadow-2xl space-y-5 text-white relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold">Xác nhận Đăng ký Gói</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/50 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {successMessage ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto animate-bounce" />
                <p className="text-base font-bold text-white">{successMessage}</p>
                <p className="text-xs text-white/50">
                  Tài khoản của bạn đã được nâng cấp thành công. Đang tải lại...
                </p>
              </div>
            ) : (
              <>
                {/* Package details */}
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Tên gói:</span>
                    <span className="font-bold text-white">{selectedPkg.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Thời hạn:</span>
                    <span className="font-medium text-emerald-400">
                      {selectedPkg.duration_days} ngày
                    </span>
                  </div>
                  <div className="flex justify-between text-base pt-2 border-t border-white/10">
                    <span className="font-bold text-white">Tổng thanh toán:</span>
                    <span className="font-black text-amber-300 text-lg">
                      {selectedPkg.price.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                </div>

                {/* Simulated QR Code for Demo */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-2.5">
                  <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl flex items-center justify-center shadow-md">
                    {/* Simulated QR block */}
                    <div className="w-full h-full border-2 border-dashed border-slate-900 rounded-lg flex flex-col items-center justify-center text-slate-800 text-[10px] font-bold text-center">
                      <QrCode className="w-12 h-12 text-slate-900 mb-1" />
                      <span>MOODIFY PAY</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/50">
                    Mô phỏng thanh toán trực tuyến qua QR chuyển khoản ngân hàng.
                  </p>
                </div>

                {/* Confirm Sandbox Button */}
                <button
                  onClick={handleConfirmPayment}
                  disabled={isProcessing}
                  className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm text-black bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 hover:brightness-110 shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>Đang kích hoạt...</span>
                  ) : (
                    <>
                      <span>Thanh Toán & Kích Hoạt Ngay</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
