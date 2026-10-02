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
  const getPackageForTier = (type: "basic" | "full" | "family") => {
    if (type === "basic") {
      if (cycle === "1year") {
        return packages.find((p) => (p.name.includes("Tiết Kiệm") || p.name.includes("Cơ Bản")) && p.duration_days > 100) || packages.find((p) => p.id === 2);
      }
      return packages.find((p) => (p.name.includes("Tiết Kiệm") || p.name.includes("Cơ Bản"))) || packages.find((p) => p.id === 1);
    } else if (type === "full") {
      if (cycle === "3months") {
        return packages.find((p) => p.name.includes("FULL") && p.duration_days === 90) || packages.find((p) => p.id === 4);
      }
      if (cycle === "1year") {
        return packages.find((p) => p.name.includes("FULL") && p.duration_days > 100) || packages.find((p) => p.id === 5);
      }
      return packages.find((p) => p.name.includes("FULL")) || packages.find((p) => p.id === 3);
    } else {
      if (cycle === "1year") {
        return packages.find((p) => p.name.includes("Gia Đình") && p.duration_days > 100) || packages.find((p) => p.id === 7 || p.id === 5);
      }
      return packages.find((p) => p.name.includes("Gia Đình")) || packages.find((p) => p.id === 6 || p.id === 4);
    }
  };

  const basicPkg = getPackageForTier("basic");
  const fullPkg = getPackageForTier("full");
  const famPkg = getPackageForTier("family");

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
          Lựa chọn gói dịch vụ phù hợp với nhu cầu: Tiết kiệm chi phí, Cá nhân không giới hạn hoặc Chia sẻ trọn bộ gia đình.
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
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !subInfo?.isPremium
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
              title="Chuyển về tài khoản miễn phí"
            >
              Miễn phí (Free)
            </button>
            <button
              onClick={() => handleDevToggle(true, 1)}
              disabled={isProcessing}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subInfo?.isPremium && subInfo?.tier === "INDIVIDUAL_BASIC"
                  ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
              title="Chuyển sang Gói VIP Tiết Kiệm (29K)"
            >
              Tiết Kiệm (29K)
            </button>
            <button
              onClick={() => handleDevToggle(true, 3)}
              disabled={isProcessing}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subInfo?.isPremium && subInfo?.tier === "INDIVIDUAL_FULL"
                  ? "bg-purple-500/40 text-purple-200 border border-purple-400/40 shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
              title="Chuyển sang Gói Cá Nhân FULL (49K)"
            >
              Cá Nhân FULL (49K)
            </button>
            <button
              onClick={() => handleDevToggle(true, 6)}
              disabled={isProcessing}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subInfo?.isPremium && subInfo?.tier === "FAMILY"
                  ? "bg-amber-400/30 text-amber-300 border border-amber-400/40 shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
              title="Chuyển sang Gói Gia Đình (79K)"
            >
              Gia Đình (79K)
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

      {/* Pricing Cards Grid - 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Gói VIP Tiết Kiệm */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 backdrop-blur-2xl p-6 flex flex-col justify-between shadow-2xl relative group hover:border-slate-400/40 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Giá Mềm Nhất • 1 Người
                </span>
                <h3 className="text-xl font-extrabold text-white mt-0.5">VIP Tiết Kiệm</h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300">
                <Volume2 className="w-4 h-4" />
              </div>
            </div>

            {/* Price */}
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-white">
                  {basicPkg ? (basicPkg.price).toLocaleString("vi-VN") : "29.000"} đ
                </span>
                <span className="text-xs text-white/50 font-medium">
                  / {cycle === "1year" ? "năm" : "tháng"}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-400 mt-1 font-medium">
                Nghe nhạc cá nhân tiết kiệm chi phí
              </p>
            </div>

            {/* Benefits */}
            <div className="pt-3.5 border-t border-white/10 space-y-2.5">
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                Đặc quyền gói tiết kiệm:
              </p>
              <ul className="space-y-2 text-xs text-white/80">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span><strong>15 bài đầu tiên / ngày</strong> hoàn toàn không quảng cáo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Quảng cáo rất nhẹ nếu nghe vượt 15 bài/ngày</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Chuyển bài thoải mái <strong>30 lượt / ngày</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Tải tối đa 50 bài hát offline</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Dành riêng cho 1 thiết bị cá nhân</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => basicPkg && handleOpenCheckout(basicPkg)}
            className="mt-6 w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-slate-800 hover:bg-slate-700 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Chọn Gói Tiết Kiệm</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: Gói Cá Nhân FULL (Dưới gói Fam, Phổ Biến Nhất) */}
        <div className="rounded-3xl border-2 border-purple-500/60 bg-gradient-to-br from-purple-950/40 via-slate-950/90 to-purple-900/20 backdrop-blur-2xl p-6 flex flex-col justify-between shadow-2xl relative group hover:border-purple-400 transition-all">
          <div className="absolute -top-0.5 right-6 px-3 py-1 rounded-b-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-black tracking-wider uppercase shadow-md">
            PHỔ BIẾN NHẤT • CÁ NHÂN FULL
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  Trọn Vẹn Đặc Quyền • 1 Người
                </span>
                <h3 className="text-xl font-extrabold text-white mt-0.5">Cá Nhân FULL</h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>

            {/* Price */}
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-white">
                  {fullPkg ? (fullPkg.price).toLocaleString("vi-VN") : "49.000"} đ
                </span>
                <span className="text-xs text-white/50 font-medium">
                  / {cycle === "1year" ? "năm" : cycle === "3months" ? "3 tháng" : "tháng"}
                </span>
              </div>
              <p className="text-[11.5px] text-purple-300 mt-1 font-medium">
                {cycle === "1year" ? "Tương đương ~39.000 đ/tháng" : "Trọn vẹn đặc quyền như Gói Fam"}
              </p>
            </div>

            {/* Benefits */}
            <div className="pt-3.5 border-t border-white/10 space-y-2.5">
              <p className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                Đặc quyền cá nhân không giới hạn:
              </p>
              <ul className="space-y-2 text-xs text-white/80">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-white">100% Không quảng cáo vĩnh viễn</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Chuyển bài (Skip) <strong>hoàn toàn vô hạn</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Tải nhạc ngoại tuyến không giới hạn bài</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Mở khóa Theme hào quang Obsidian Royal Gold</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                  <span>Dành riêng cho 1 thiết bị cá nhân</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => fullPkg && handleOpenCheckout(fullPkg)}
            className="mt-6 w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-500 shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Nâng Cấp Cá Nhân FULL</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Gói Gia Đình (Best Value Cho Nhóm) */}
        <div className="rounded-3xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-500/10 via-slate-950/80 to-purple-950/40 backdrop-blur-2xl p-6 flex flex-col justify-between shadow-2xl relative group overflow-hidden">
          <div className="absolute -top-0.5 right-6 px-3 py-1 rounded-b-xl bg-gradient-to-r from-amber-400 to-amber-300 text-black text-[10px] font-black tracking-wider uppercase shadow-md">
            TIẾT KIỆM NHẤT • 6 NGƯỜI
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  Dành Cho 6 Tài Khoản
                </span>
                <h3 className="text-xl font-extrabold text-white mt-0.5">Gói Gia Đình</h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <Users className="w-4 h-4" />
              </div>
            </div>

            {/* Price */}
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-white">
                  {famPkg ? (famPkg.price).toLocaleString("vi-VN") : "79.000"} đ
                </span>
                <span className="text-xs text-white/50 font-medium">
                  / {cycle === "1year" ? "năm" : "tháng"}
                </span>
              </div>
              <p className="text-[11.5px] text-amber-300 font-medium mt-1">
                Chỉ ~13.100 đ / người / tháng khi chia 6 người
              </p>
            </div>

            {/* Benefits */}
            <div className="pt-3.5 border-t border-white/10 space-y-2.5">
              <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                Đặc quyền trọn bộ gia đình:
              </p>
              <ul className="space-y-2 text-xs text-white/80">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-semibold text-white">Chia sẻ tối đa 6 tài khoản/thiết bị</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Kho nhạc & thư viện riêng tư từng thành viên</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Chặn 100% quảng cáo cho cả 6 thành viên</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Chuyển bài & tải offline không giới hạn</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Huy hiệu VIP Crown cho toàn bộ thành viên</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => famPkg && handleOpenCheckout(famPkg)}
            className="mt-6 w-full py-3 px-4 rounded-xl font-bold text-xs text-black bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 hover:brightness-110 shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Nâng Cấp Gia Đình (6 Người)</span>
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
              Đặc quyền & Phân cấp 4 gói dịch vụ Moodify
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
                <th className="py-3 px-4 w-[28%]">Tính năng / Quyền lợi</th>
                <th className="py-3 px-4 w-[18%]">Miễn phí (FREE)</th>
                <th className="py-3 px-4 w-[18%] text-emerald-400">Tiết Kiệm (29K)</th>
                <th className="py-3 px-4 w-[18%] text-purple-300">Cá Nhân FULL (49K)</th>
                <th className="py-3 px-4 w-[18%] text-amber-300">Gia Đình (79K)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {/* Row 1: Giá cước */}
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Giá cước hàng tháng</td>
                <td className="py-3.5 px-4 font-medium text-white/60">0 đ</td>
                <td className="py-3.5 px-4 font-bold text-emerald-400">29.000 đ</td>
                <td className="py-3.5 px-4 font-bold text-purple-300">49.000 đ</td>
                <td className="py-3.5 px-4 font-bold text-amber-300">79.000 đ <span className="text-[10px] block text-white/40 font-normal">(~13k/người)</span></td>
              </tr>

              {/* Row 2: Quảng cáo */}
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">
                  Chặn quảng cáo
                  <span className="block text-[11px] text-white/40 font-normal">Audio lồng nhạc nền & Banner đếm ngược</span>
                </td>
                <td className="py-3.5 px-4 text-red-300">Quảng cáo sau mỗi 3 bài</td>
                <td className="py-3.5 px-4 text-emerald-300">
                  <strong>15 bài đầu/ngày 0 quảng cáo</strong>
                  <span className="block text-[10.5px] text-white/40 font-normal">Sau 15 bài: rất thưa (7 bài/lần)</span>
                </td>
                <td className="py-3.5 px-4 text-purple-200 font-bold">100% Không quảng cáo vĩnh viễn</td>
                <td className="py-3.5 px-4 text-amber-200 font-bold">100% Không quảng cáo (Cả 6 người)</td>
              </tr>

              {/* Row 3: Skip bài */}
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Chuyển bài hát (Skip)</td>
                <td className="py-3.5 px-4 text-white/60">Giới hạn 6 lượt / ngày</td>
                <td className="py-3.5 px-4 text-emerald-300 font-semibold">30 lượt / ngày</td>
                <td className="py-3.5 px-4 text-purple-200 font-bold">Không giới hạn (Vô hạn)</td>
                <td className="py-3.5 px-4 text-amber-200 font-bold">Không giới hạn (Cả 6 người)</td>
              </tr>

              {/* Row 4: Tải offline */}
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Tải nhạc ngoại tuyến (MP3)</td>
                <td className="py-3.5 px-4 text-white/40">Không hỗ trợ</td>
                <td className="py-3.5 px-4 text-emerald-300">Tối đa 50 bài</td>
                <td className="py-3.5 px-4 text-purple-200 font-bold">Không giới hạn bài hát</td>
                <td className="py-3.5 px-4 text-amber-200 font-bold">Không giới hạn bài hát</td>
              </tr>

              {/* Row 5: Chất lượng âm thanh */}
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Chất lượng âm thanh tối đa</td>
                <td className="py-3.5 px-4 text-white/60">Chuẩn 128 kbps</td>
                <td className="py-3.5 px-4 text-emerald-300">Chất lượng cao 192-256 kbps</td>
                <td className="py-3.5 px-4 text-purple-200 font-bold">Ultra HD 320 kbps Lossless</td>
                <td className="py-3.5 px-4 text-amber-200 font-bold">Ultra HD 320 kbps Lossless</td>
              </tr>

              {/* Row 6: Thiết bị / Tài khoản */}
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">Số lượng thiết bị / tài khoản</td>
                <td className="py-3.5 px-4 text-white/60">1 thiết bị</td>
                <td className="py-3.5 px-4 text-white/60">1 thiết bị</td>
                <td className="py-3.5 px-4 text-white/60">1 thiết bị</td>
                <td className="py-3.5 px-4 text-amber-300 font-bold">Tối đa 6 tài khoản độc lập</td>
              </tr>

              {/* Row 7: Chủ đề VIP */}
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white">
                  Theme Hoàng Kim & Mascot VIP
                  <span className="block text-[11px] text-white/40 font-normal">Hào quang Obsidian Royal Gold & Tùy biến nút phát</span>
                </td>
                <td className="py-3.5 px-4 text-white/40">Khóa</td>
                <td className="py-3.5 px-4 text-emerald-300">Theme VIP Cơ Bản</td>
                <td className="py-3.5 px-4 text-purple-200 font-bold">Mở khóa trọn bộ đặc quyền VIP</td>
                <td className="py-3.5 px-4 text-amber-200 font-bold">Mở khóa trọn bộ cho cả 6 thành viên</td>
              </tr>
            </tbody>
          </table>
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
