"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Edit2,
  Layers,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  Settings2,
  Sliders,
  Trash2,
  Users,
  X,
  XCircle,
  Crown,
} from "lucide-react";
import {
  PaymentTransaction,
  ServicePackage,
  PackageEntitlements,
  SubscriptionTier,
  AdminUserSubscription,
  AdminRevenueStats,
} from "../types";
import { AdminPagination } from "./shared/admin-pagination";
import { ModalPortal } from "./shared/modal-portal";
import { fetchAdminSubscriptionTiers, updateAdminSubscriptionTier } from "@/lib/api/admin-client";
import { InteractiveAreaChart } from "@/components/dashboard/charts/interactive-area-chart";
import { InteractiveDonutChart } from "@/components/dashboard/charts/interactive-donut-chart";

type MonetizationTabProps = {
  packages: ServicePackage[];
  transactions: PaymentTransaction[];
  onTogglePackageStatus: (packageId: number) => void;
  onUpdatePackagePrice: (packageId: number, newPrice: number) => void;
  onCreatePackage?: (data: Partial<ServicePackage>) => void;
  onUpdatePackageDetails?: (packageId: number, data: Partial<ServicePackage>) => void;
  onDeletePackage?: (packageId: number) => void;
  onRefundTransaction?: (transactionId: number) => void;
  subscriptions?: AdminUserSubscription[];
  onCancelSubscription?: (subscriptionId: number) => void;
  revenueStats?: AdminRevenueStats | null;
  revenueDays?: 7 | 30 | 90;
  onRevenueDaysChange?: (days: 7 | 30 | 90) => void;
  loadingRevenueStats?: boolean;
  onToast?: (message: string, type?: "success" | "error" | "info" | "warning") => void;
};

export function getEffectiveEntitlements(pkg: ServicePackage): PackageEntitlements {
  if (pkg.entitlements && pkg.entitlements.adPolicy) {
    return {
      tier: (pkg.tierId as PackageEntitlements["tier"]) || pkg.entitlements.tier,
      ...pkg.entitlements,
    };
  }

  if (pkg.featuresJson) {
    try {
      const parsed = JSON.parse(pkg.featuresJson);
      if (parsed && typeof parsed === "object" && parsed.adPolicy && parsed.skipPolicy) {
        return {
          tier: (pkg.tierId as PackageEntitlements["tier"]) || parsed.tier,
          adPolicy: parsed.adPolicy || "FULL_ADS",
          adFreeDailyLimit: parsed.adFreeDailyLimit ?? 0,
          adIntervalAfterLimit: parsed.adIntervalAfterLimit ?? 0,
          skipPolicy: parsed.skipPolicy || "LIMITED",
          skipDailyLimit: parsed.skipDailyLimit ?? 0,
          offlineAllowed: parsed.offlineAllowed ?? false,
          offlineMaxTracks: parsed.offlineMaxTracks ?? 0,
          maxDevices: parsed.maxDevices ?? 1,
          syncedLyrics: parsed.syncedLyrics ?? false,
          vipBadge: parsed.vipBadge ?? false,
          familySharing: parsed.familySharing ?? false,
          familyMembers: parsed.familyMembers ?? 1,
        };
      }
    } catch (_) {}
  }

  throw new Error("Gói dịch vụ chưa có cấu hình quyền lợi từ máy chủ.");
}

export function generateBulletPointsFromEntitlements(ent: PackageEntitlements): string[] {
  const bullets: string[] = [];

  if (ent.adPolicy === "NO_ADS") {
    bullets.push("100% Không quảng cáo vô hạn 24/7");
  } else if (ent.adPolicy === "DAILY_QUOTA") {
    bullets.push(`${ent.adFreeDailyLimit} bài hát/ngày không quảng cáo (sau đó 1 QC/${ent.adIntervalAfterLimit} bài)`);
  } else {
    bullets.push("Phát kèm quảng cáo tài trợ thông thường");
  }

  if (ent.skipPolicy === "UNLIMITED") {
    bullets.push("Chuyển bài không giới hạn (Unlimited Skips)");
  } else {
    bullets.push(`${ent.skipDailyLimit} lượt chuyển bài mỗi ngày`);
  }

  if (ent.offlineAllowed) {
    const trackStr = ent.offlineMaxTracks >= 9999 ? "không giới hạn bài hát" : `${ent.offlineMaxTracks} bài hát`;
    bullets.push(`Tải offline ${trackStr} trên ${ent.maxDevices} thiết bị`);
  }

  if (ent.syncedLyrics) {
    bullets.push("Lời bài hát Karaoke đồng bộ thời gian thực");
  }

  if (ent.familySharing) {
    bullets.push(`Chia sẻ gói cho ${ent.familyMembers || 6} thành viên gia đình`);
  }

  if (ent.vipBadge) {
    bullets.push("Huy hiệu VIP vương miện vàng trên hồ sơ");
  }

  return bullets;
}

const POPULAR_BENEFITS = [
  "Nghe nhạc không quảng cáo ngắt quãng",
  "Tải offline lưu trữ trên máy",
  "Chuyển bài không giới hạn (Unlimited Skips)",
  "Lời bài hát Karaoke đồng bộ thời gian thực",
  "Huy hiệu VIP vương miện trên hồ sơ",
  "Chia sẻ nhiều thiết bị đồng thời",
];

function buildEntitlementsFromTier(
  tierId: string,
  tiers: SubscriptionTier[],
  fallback?: PackageEntitlements
): PackageEntitlements {
  const matched = tiers.find((t) => t.id === tierId);
  if (matched) {
    return {
      tier: matched.id as PackageEntitlements["tier"],
      adPolicy: matched.adPolicy,
      adFreeDailyLimit: matched.adFreeDailyLimit ?? 0,
      adIntervalAfterLimit: 7,
      skipPolicy: matched.skipPolicy,
      skipDailyLimit: matched.skipDailyLimit ?? 0,
      offlineAllowed: Boolean(matched.offlineAllowed),
      offlineMaxTracks: matched.offlineMaxTracks ?? 0,
      maxDevices: matched.maxDevices ?? 1,
      syncedLyrics: Boolean(matched.syncedLyrics),
      vipBadge: Boolean(matched.vipBadge),
      familySharing: Boolean(matched.familySharing),
      familyMembers: matched.familyMembers ?? 1,
    };
  }
  if (tierId === "INDIVIDUAL_FULL") {
    return {
      tier: "INDIVIDUAL_FULL",
      adPolicy: "NO_ADS",
      adFreeDailyLimit: 0,
      adIntervalAfterLimit: 0,
      skipPolicy: "UNLIMITED",
      skipDailyLimit: 0,
      offlineAllowed: true,
      offlineMaxTracks: 9999,
      maxDevices: 2,
      syncedLyrics: true,
      vipBadge: true,
      familySharing: false,
      familyMembers: 1,
    };
  }
  if (tierId === "FAMILY") {
    return {
      tier: "FAMILY",
      adPolicy: "NO_ADS",
      adFreeDailyLimit: 0,
      adIntervalAfterLimit: 0,
      skipPolicy: "UNLIMITED",
      skipDailyLimit: 0,
      offlineAllowed: true,
      offlineMaxTracks: 9999,
      maxDevices: 6,
      syncedLyrics: true,
      vipBadge: true,
      familySharing: true,
      familyMembers: 6,
    };
  }
  return (
    fallback ?? {
      tier: (tierId || "INDIVIDUAL_BASIC") as PackageEntitlements["tier"],
      adPolicy: "DAILY_QUOTA",
      adFreeDailyLimit: 15,
      adIntervalAfterLimit: 7,
      skipPolicy: "LIMITED",
      skipDailyLimit: 30,
      offlineAllowed: true,
      offlineMaxTracks: 50,
      maxDevices: 1,
      syncedLyrics: true,
      vipBadge: true,
      familySharing: false,
      familyMembers: 1,
    }
  );
}

function TierInheritedPreview({
  tierId,
  entitlements,
  onSyncToBullets,
  onNavigateToTiers,
}: {
  tierId: string;
  entitlements: PackageEntitlements;
  onSyncToBullets: () => void;
  onNavigateToTiers: () => void;
}) {
  return (
    <div className="border-t border-white/10 pt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-white flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#ff5500]" />
            Quyền Lợi Kế Thừa Từ Tầng ({tierId})
          </h4>
          <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
            Quyền hạn thực thi do tầng dịch vụ quyết định. Sửa tại{" "}
            <button
              type="button"
              onClick={onNavigateToTiers}
              className="text-[#ff5500] underline hover:brightness-110 cursor-pointer"
            >
              Tầng Quyền Lợi
            </button>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={onSyncToBullets}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ff5500]/40 bg-[#ff5500]/10 text-[#ff5500] hover:bg-[#ff5500]/20 text-xs font-mono font-semibold transition active:scale-[0.98] cursor-pointer"
          title="Tự động đồng bộ các quyền này thành danh sách gạch đầu dòng giới thiệu cho người dùng"
        >
          <RefreshCcw className="w-3 h-3" /> Đồng bộ gạch đầu dòng
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 rounded-xl border border-[#222432] bg-[#12131a] p-3 text-[11px] font-mono">
        <div>
          <span className="text-zinc-500 block">Quảng cáo</span>
          <strong className="text-amber-300">
            {entitlements.adPolicy === "NO_ADS"
              ? "Không quảng cáo"
              : entitlements.adPolicy === "DAILY_QUOTA"
              ? `${entitlements.adFreeDailyLimit} bài/ngày ko QC`
              : "Quảng cáo tiêu chuẩn"}
          </strong>
        </div>
        <div>
          <span className="text-zinc-500 block">Chuyển bài</span>
          <strong className="text-sky-300">
            {entitlements.skipPolicy === "UNLIMITED"
              ? "Không giới hạn"
              : `${entitlements.skipDailyLimit} lượt/ngày`}
          </strong>
        </div>
        <div>
          <span className="text-zinc-500 block">Offline &amp; Thiết bị</span>
          <strong className="text-emerald-300">
            {entitlements.offlineAllowed
              ? `${entitlements.offlineMaxTracks >= 9999 ? "Vô hạn" : entitlements.offlineMaxTracks + " bài"} · ${entitlements.maxDevices} máy`
              : `Không offline · ${entitlements.maxDevices} máy`}
          </strong>
        </div>
        <div>
          <span className="text-zinc-500 block">Lyrics đồng bộ</span>
          <strong className={entitlements.syncedLyrics ? "text-white" : "text-zinc-500"}>
            {entitlements.syncedLyrics ? "Có hỗ trợ" : "Không"}
          </strong>
        </div>
        <div>
          <span className="text-zinc-500 block">Huy hiệu VIP</span>
          <strong className={entitlements.vipBadge ? "text-yellow-300" : "text-zinc-500"}>
            {entitlements.vipBadge ? "Bật" : "Tắt"}
          </strong>
        </div>
        <div>
          <span className="text-zinc-500 block">Chia sẻ gia đình</span>
          <strong className={entitlements.familySharing ? "text-amber-300" : "text-zinc-400"}>
            {entitlements.familySharing ? `${entitlements.familyMembers || 6} thành viên` : "Cá nhân"}
          </strong>
        </div>
      </div>
    </div>
  );
}

export function MonetizationTab({
  packages,
  transactions,
  onTogglePackageStatus,
  onUpdatePackagePrice,
  onCreatePackage,
  onUpdatePackageDetails,
  onDeletePackage,
  subscriptions = [],
  onCancelSubscription,
  revenueStats,
  revenueDays = 30,
  onRevenueDaysChange,
  loadingRevenueStats = false,
  onToast,
}: MonetizationTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"packages" | "transactions" | "tiers" | "subscriptions">("packages");
  const [revenueBreakdownMode, setRevenueBreakdownMode] = useState<"package" | "daily" | "provider">("package");
  const [onlyNonZeroDaily, setOnlyNonZeroDaily] = useState(false);
  const [transactionSearch, setTransactionSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [subSearch, setSubSearch] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState("ALL");
  const [subPage, setSubPage] = useState(1);
  const [subPageSize, setSubPageSize] = useState(10);
  const [selectedSubForCancel, setSelectedSubForCancel] = useState<AdminUserSubscription | null>(null);

  // Normalized Subscription Tiers
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [editingTier, setEditingTier] = useState<SubscriptionTier | null>(null);
  const [tierSaving, setTierSaving] = useState(false);
  const [tierError, setTierError] = useState("");
  const [packageError, setPackageError] = useState("");
  const [tiersLoading, setTiersLoading] = useState(true);

  useEffect(() => {
    fetchAdminSubscriptionTiers()
      .then((data) => {
        if (Array.isArray(data)) setTiers(data);
      })
      .catch((err) => setTierError(err instanceof Error ? err.message : "Không tải được tầng quyền lợi"))
      .finally(() => setTiersLoading(false));
  }, []);

  // Modals state
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form states for full package editor / creator
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    durationDays: 30,
    displayOrder: 1,
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
    tierId: "INDIVIDUAL_BASIC",
    description: "",
    featureItems: [] as string[],
    entitlements: {
      adPolicy: "DAILY_QUOTA",
      adFreeDailyLimit: 15,
      adIntervalAfterLimit: 7,
      skipPolicy: "LIMITED",
      skipDailyLimit: 30,
      offlineAllowed: true,
      offlineMaxTracks: 50,
      maxDevices: 1,
      syncedLyrics: true,
      vipBadge: true,
      familySharing: false,
      familyMembers: 1,
    } as PackageEntitlements,
  });

  const [newFeatureInput, setNewFeatureInput] = useState("");
  const [selectedTxForRefund, setSelectedTxForRefund] = useState<PaymentTransaction | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<ServicePackage | null>(null);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val || 0);
  };

  const formatCompactVND = (val: number) => {
    if (!val) return "0";
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1)}M`;
    if (val >= 1_000) return `${Math.round(val / 1_000)}K`;
    return val.toLocaleString("vi-VN");
  };

  const clientTotalRevenue = transactions
    .filter((t) => t.status === "SUCCESS")
    .reduce((sum, t) => sum + t.amount, 0);
  const clientSuccessCount = transactions.filter((t) => t.status === "SUCCESS").length;
  const clientPendingCount = transactions.filter((t) => t.status === "PENDING").length;
  const clientFailedCount = transactions.filter((t) => t.status === "FAILED" || t.status === "CANCELLED").length;

  const totalRevenue = revenueStats ? revenueStats.totalRevenue : clientTotalRevenue;
  const periodRevenue = revenueStats ? revenueStats.periodRevenue : clientTotalRevenue;
  const growthPercent = revenueStats ? revenueStats.growthPercent : 0;
  const totalTxCount = revenueStats ? revenueStats.totalTransactions : transactions.length;
  const successCount = revenueStats ? revenueStats.successCount : clientSuccessCount;
  const pendingCount = revenueStats ? revenueStats.pendingCount : clientPendingCount;
  const failedCount = revenueStats ? revenueStats.failedCount : clientFailedCount;
  const successRate = totalTxCount > 0 ? Math.round((successCount / totalTxCount) * 100) : 0;
  const avgOrderValue = revenueStats
    ? revenueStats.avgOrderValue
    : clientSuccessCount > 0
    ? Math.round(clientTotalRevenue / clientSuccessCount)
    : 0;
  const activeSubsCount = revenueStats
    ? revenueStats.activeSubscriptionsCount
    : subscriptions.filter((s) => s.status === "ACTIVE").length;
  const paidUsersCount = revenueStats ? revenueStats.paidUsersCount : 0;
  const activePackagesCount = packages.filter((p) => p.status === "ACTIVE").length;

  const revenueChartData = React.useMemo(() => {
    if (revenueStats?.dailySeries && revenueStats.dailySeries.length > 0) {
      return revenueStats.dailySeries.map((pt) => ({
        label: pt.date,
        date: pt.isoDate,
        streams: Number(pt.revenue) || 0,
      }));
    }

    const today = new Date();
    const fallbackPoints: { label: string; date: string; streams: number }[] = [];
    const byDate = new Map<string, number>();
    transactions
      .filter((t) => t.status === "SUCCESS")
      .forEach((tx) => {
        const raw = tx.paidAt || tx.createdAt;
        if (!raw) return;
        const datePart = raw.split(" ")[0];
        let dayKey = "";
        if (datePart.includes("/")) {
          const p = datePart.split("/");
          dayKey = `${p[0]}/${p[1]}`;
        } else if (datePart.includes("-")) {
          const p = datePart.split("-");
          dayKey = `${p[2]}/${p[1]}`;
        }
        if (dayKey) {
          byDate.set(dayKey, (byDate.get(dayKey) || 0) + (tx.amount || 0));
        }
      });

    for (let i = revenueDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const label = `${dd}/${mm}`;
      fallbackPoints.push({
        label,
        date: d.toISOString().slice(0, 10),
        streams: byDate.get(label) || 0,
      });
    }
    return fallbackPoints;
  }, [revenueStats?.dailySeries, transactions, revenueDays]);

  const packageRevenueDonutData = React.useMemo(() => {
    const colors = ["#ff5500", "#10b981", "#38bdf8", "#a855f7", "#f59e0b", "#f43f5e"];
    if (revenueStats?.byPackage && revenueStats.byPackage.length > 0) {
      const withRevenue = revenueStats.byPackage.filter((p) => p.revenue > 0);
      const source = withRevenue.length > 0 ? withRevenue : revenueStats.byPackage;
      return source.map((item, idx) => ({
        id: `pkg-${item.packageId}`,
        label: item.packageName,
        value: item.revenue,
        color: colors[idx % colors.length],
      }));
    }

    const pkgRevenue: Record<string, number> = {};
    transactions
      .filter((t) => t.status === "SUCCESS")
      .forEach((t) => {
        const name = t.packageName || "Khác";
        pkgRevenue[name] = (pkgRevenue[name] || 0) + t.amount;
      });

    const entries = Object.entries(pkgRevenue);
    if (entries.length > 0) {
      return entries.map(([name, amount], idx) => ({
        id: `pkg-${idx}`,
        label: name,
        value: amount,
        color: colors[idx % colors.length],
      }));
    }

    return packages.map((p, idx) => ({
      id: `pkg-${p.id}`,
      label: p.name,
      value: 0,
      color: colors[idx % colors.length],
    }));
  }, [revenueStats?.byPackage, transactions, packages]);

  const dailyRows = React.useMemo(() => {
    const base = revenueStats?.dailySeries ? [...revenueStats.dailySeries].reverse() : [];
    if (!onlyNonZeroDaily) return base;
    return base.filter(
      (d) =>
        d.revenue > 0 ||
        d.successCount > 0 ||
        d.pendingCount > 0 ||
        d.failedCount > 0 ||
        d.refundedCount > 0
    );
  }, [revenueStats?.dailySeries, onlyNonZeroDaily]);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.userName.toLowerCase().includes(transactionSearch.toLowerCase()) ||
      tx.userEmail.toLowerCase().includes(transactionSearch.toLowerCase()) ||
      tx.providerTransactionId.toLowerCase().includes(transactionSearch.toLowerCase()) ||
      tx.packageName.toLowerCase().includes(transactionSearch.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || tx.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Transactions Pagination State
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(10);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setTxPage(1);
  }, [transactionSearch, statusFilter]);

  const paginatedTransactions = filteredTransactions.slice(
    (txPage - 1) * txPageSize,
    txPage * txPageSize
  );

  const filteredSubscriptions = (subscriptions || []).filter((sub) => {
    const matchesSearch =
      (sub.userName || "").toLowerCase().includes(subSearch.toLowerCase()) ||
      (sub.userEmail || "").toLowerCase().includes(subSearch.toLowerCase()) ||
      sub.packageName.toLowerCase().includes(subSearch.toLowerCase());
    const matchesStatus = subStatusFilter === "ALL" || sub.status === subStatusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    setSubPage(1);
  }, [subSearch, subStatusFilter]);

  const paginatedSubscriptions = filteredSubscriptions.slice(
    (subPage - 1) * subPageSize,
    subPage * subPageSize
  );

  const parseDescriptionToFeatures = (desc: string): string[] => {
    if (!desc) return [];
    // Split by newlines or semicolons or bullet points
    return desc
      .split(/\n|;|•|-/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const handleOpenEdit = (pkg: ServicePackage) => {
    const features = parseDescriptionToFeatures(pkg.description);
    let ents: PackageEntitlements;
    try { ents = getEffectiveEntitlements(pkg); setPackageError(""); }
    catch (error) { setPackageError(error instanceof Error ? error.message : "Không đọc được cấu hình quyền lợi"); return; }
    const tierId = pkg.tierId || ents.tier || "INDIVIDUAL_BASIC";
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      price: pkg.price,
      durationDays: pkg.durationDays,
      displayOrder: pkg.displayOrder,
      status: pkg.status,
      tierId: tierId,
      description: pkg.description,
      featureItems: features,
      entitlements: { ...ents, tier: tierId as PackageEntitlements["tier"] },
    });
    setNewFeatureInput("");
  };

  const handleOpenCreate = () => {
    setIsCreateModalOpen(true);
    const defaultEnts: PackageEntitlements = {
      adPolicy: "DAILY_QUOTA",
      adFreeDailyLimit: 15,
      adIntervalAfterLimit: 7,
      skipPolicy: "LIMITED",
      skipDailyLimit: 30,
      offlineAllowed: true,
      offlineMaxTracks: 50,
      maxDevices: 1,
      syncedLyrics: true,
      vipBadge: true,
      familySharing: false,
      familyMembers: 1,
    };
    setFormData({
      name: "Moodify VIP Mới",
      price: 59000,
      durationDays: 30,
      displayOrder: packages.length + 1,
      status: "ACTIVE",
      tierId: "INDIVIDUAL_BASIC",
      description: "Gói dịch vụ âm nhạc nâng cao",
      featureItems: generateBulletPointsFromEntitlements(defaultEnts),
      entitlements: defaultEnts,
    });
    setNewFeatureInput("");
  };

  const handleAddFeatureItem = (customItem?: string) => {
    const itemToAdd = (customItem ?? newFeatureInput).trim();
    if (!itemToAdd) return;
    if (formData.featureItems.includes(itemToAdd)) return;
    setFormData((prev) => ({
      ...prev,
      featureItems: [...prev.featureItems, itemToAdd],
    }));
    if (!customItem) {
      setNewFeatureInput("");
    }
  };

  const handleRemoveFeatureItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      featureItems: prev.featureItems.filter((_, i) => i !== index),
    }));
  };

  const serializeFeatureItems = (items: string[]) =>
    items.length > 0 ? items.map((item) => `• ${item}`).join("\n") : "";

  const handleSaveEditPackage = () => {
    if (!editingPackage) return;
    const cleanName = formData.name.trim();
    if (!cleanName) {
      onToast?.("Vui lòng nhập tên gói cước.", "warning");
      return;
    }
    if (!Number.isFinite(formData.price) || formData.price < 0) {
      onToast?.("Đơn giá gói cước không hợp lệ.", "warning");
      return;
    }
    if (!Number.isFinite(formData.durationDays) || formData.durationDays < 1) {
      onToast?.("Chu kỳ gói cước phải tối thiểu 1 ngày.", "warning");
      return;
    }

    const finalDesc = serializeFeatureItems(formData.featureItems);
    const featuresJsonStr = JSON.stringify(formData.entitlements);

    if (onUpdatePackageDetails) {
      onUpdatePackageDetails(editingPackage.id, {
        name: cleanName,
        price: formData.price,
        durationDays: formData.durationDays,
        displayOrder: formData.displayOrder,
        status: formData.status,
        tierId: formData.tierId,
        description: finalDesc,
        featuresJson: featuresJsonStr,
      });
    } else {
      onUpdatePackagePrice(editingPackage.id, formData.price);
    }
    setEditingPackage(null);
  };

  const handleSaveCreatePackage = () => {
    const cleanName = formData.name.trim();
    if (!cleanName) {
      onToast?.("Vui lòng nhập tên gói cước mới.", "warning");
      return;
    }
    if (!Number.isFinite(formData.price) || formData.price < 0) {
      onToast?.("Đơn giá gói cước không hợp lệ.", "warning");
      return;
    }
    if (!Number.isFinite(formData.durationDays) || formData.durationDays < 1) {
      onToast?.("Chu kỳ gói cước phải tối thiểu 1 ngày.", "warning");
      return;
    }

    const finalDesc = serializeFeatureItems(formData.featureItems);
    const featuresJsonStr = JSON.stringify(formData.entitlements);

    if (onCreatePackage) {
      onCreatePackage({
        name: cleanName,
        price: formData.price,
        durationDays: formData.durationDays,
        displayOrder: formData.displayOrder,
        status: formData.status,
        tierId: formData.tierId,
        description: finalDesc,
        featuresJson: featuresJsonStr,
      });
    }
    setIsCreateModalOpen(false);
  };

  const handleDeletePackage = (pkg: ServicePackage) => {
    setPackageToDelete(pkg);
  };

  return (
    <div className="space-y-6 anim-fade-in">
      {packageError && <p role="alert" className="text-sm text-rose-300">{packageError}</p>}
      {/* Studio Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-graphik text-2xl font-bold text-white tracking-tight">
              Gói Dịch Vụ &amp; Doanh Thu
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Quản lý các gói thuê bao, quyền lợi và lịch sử giao dịch thanh toán.
          </p>
        </div>

        {/* Action Button & Subtab Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          {activeSubTab === "packages" && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 rounded-full bg-[#ff5500] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#ff5500]/25 hover:bg-[#ff6a1a] active:scale-[0.98] transition cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Thêm Gói Mới
            </button>
          )}

          {/* Subtab Toggle Buttons */}
          <div className="flex items-center rounded-xl border border-[#222432] bg-[#12131a] p-1">
            <button
              type="button"
              onClick={() => setActiveSubTab("packages")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeSubTab === "packages"
                  ? "bg-[#ff5500] text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" /> Gói Dịch Vụ ({packages.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("tiers")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeSubTab === "tiers"
                  ? "bg-[#ff5500] text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> Tầng Quyền Lợi ({tiers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("transactions")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeSubTab === "transactions"
                  ? "bg-[#ff5500] text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Receipt className="h-3.5 w-3.5" /> Lịch Sử Giao Dịch ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("subscriptions")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeSubTab === "subscriptions"
                  ? "bg-[#ff5500] text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Thuê Bao Người Dùng ({subscriptions.length})
            </button>
          </div>
        </div>
      </div>

      {/* ================= EXECUTIVE REVENUE & MONETIZATION DECK ================= */}
      <div className="space-y-5">
        {/* 4 Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 shadow-xl relative overflow-hidden group hover:border-[#ff5500]/40 transition">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
              <span>Tổng Doanh Thu</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-display text-2xl font-bold text-white tracking-tight">
              {formatVND(totalRevenue)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 font-mono flex items-center justify-between gap-2">
              <span>Kỳ {revenueDays} ngày: {formatVND(periodRevenue)}</span>
              {growthPercent !== 0 && (
                <span className={growthPercent > 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {growthPercent > 0 ? `+${growthPercent}%` : `${growthPercent}%`}
                </span>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 shadow-xl relative overflow-hidden group hover:border-[#ff5500]/40 transition">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
              <span>Giao Dịch Thanh Toán</span>
              <Receipt className="w-4 h-4 text-sky-400" />
            </div>
            <div className="font-display text-2xl font-bold text-white tracking-tight">
              {totalTxCount} GD
            </div>
            <p className="text-[11px] text-sky-400 mt-1 font-mono">
              {successCount} thành công ({successRate}%) · {pendingCount} chờ · {failedCount} lỗi/hủy
            </p>
          </div>

          <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 shadow-xl relative overflow-hidden group hover:border-[#ff5500]/40 transition">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
              <span>Thuê Bao Hoạt Động</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="font-display text-2xl font-bold text-white tracking-tight">
              {activeSubsCount} người
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 font-mono">
              {paidUsersCount} khách trả phí · TB/đơn: {formatVND(avgOrderValue)}
            </p>
          </div>

          <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 shadow-xl relative overflow-hidden group hover:border-[#ff5500]/40 transition">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
              <span>Gói Hoạt Động</span>
              <CreditCard className="w-4 h-4 text-purple-400" />
            </div>
            <div className="font-display text-2xl font-bold text-white tracking-tight">
              {activePackagesCount} / {packages.length} gói
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 font-mono">
              {loadingRevenueStats ? "Đang cập nhật thống kê..." : `Kỳ thống kê: ${revenueDays} ngày`}
            </p>
          </div>
        </div>

        {/* 2 Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7">
            <InteractiveAreaChart
              title="Doanh Thu Theo Thời Gian"
              subtitle={`Biểu đồ biến động doanh thu thanh toán thành công trong ${revenueDays} ngày qua.`}
              data={revenueChartData}
              metricLabel="Doanh thu (VND)"
              accentColor="#ff5500"
              activeRange={revenueDays === 7 ? "7D" : revenueDays === 90 ? "90D" : "30D"}
              onRangeChange={(rng) => onRevenueDaysChange?.(rng === "7D" ? 7 : rng === "90D" ? 90 : 30)}
              formatValue={formatVND}
              formatAxisValue={formatCompactVND}
              height={230}
            />
          </div>
          <div className="lg:col-span-5">
            <InteractiveDonutChart
              title="Doanh Thu Theo Gói Cước"
              subtitle="Tỷ lệ doanh thu của từng gói dịch vụ."
              data={packageRevenueDonutData}
              centerLabel="Doanh Thu"
              size={180}
              strokeWidth={22}
              formatValue={formatVND}
              formatCenterValue={(v) => (v === 0 ? "0 ₫" : formatCompactVND(v) + " ₫")}
            />
          </div>
        </div>

        {/* Working Revenue Summary Breakdown Table */}
        <div className="rounded-2xl border border-[#222432] bg-[#12131a] shadow-xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
            <div>
              <h3 className="font-graphik text-sm font-bold text-white">
                Bảng Thống Kê Doanh Thu Chi Tiết
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Phân tích doanh thu theo gói dịch vụ, theo từng ngày trong kỳ {revenueDays} ngày và theo cổng thanh toán.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {revenueBreakdownMode === "daily" && (
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#222432] bg-[#171822] px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyNonZeroDaily}
                    onChange={(e) => setOnlyNonZeroDaily(e.target.checked)}
                    className="accent-[#ff5500]"
                  />
                  <span>Chỉ ngày có GD</span>
                </label>
              )}

              <div className="flex items-center rounded-xl border border-[#222432] bg-[#171822] p-1 text-[11px] font-mono">
                {(
                  [
                    { id: "package", label: "Theo Gói" },
                    { id: "daily", label: "Theo Ngày" },
                    { id: "provider", label: "Theo Cổng TT" },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setRevenueBreakdownMode(mode.id)}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer font-semibold ${
                      revenueBreakdownMode === mode.id
                        ? "bg-[#ff5500] text-white shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {revenueBreakdownMode === "package" && (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 bg-white/[0.02] font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-5 py-3">Gói Dịch Vụ</th>
                    <th className="px-4 py-3">Tầng (Tier)</th>
                    <th className="px-4 py-3">Giá Niêm Yết</th>
                    <th className="px-4 py-3">Thuê Bao Đang Dùng</th>
                    <th className="px-4 py-3">Đơn Thành Công / Tổng</th>
                    <th className="px-4 py-3">Doanh Thu</th>
                    <th className="px-5 py-3 min-w-[140px]">Tỷ Trọng (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(!revenueStats?.byPackage || revenueStats.byPackage.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center font-mono text-zinc-500">
                        Chưa có dữ liệu doanh thu theo gói dịch vụ.
                      </td>
                    </tr>
                  ) : (
                    revenueStats.byPackage.map((row) => (
                      <tr key={row.packageId} className="hover:bg-white/[0.02] transition">
                        <td className="px-5 py-3 font-semibold text-white">
                          {row.packageName}
                          <span
                            className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              row.packageStatus === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-zinc-700/40 text-zinc-400"
                            }`}
                          >
                            {row.packageStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-amber-300">{row.tierId}</td>
                        <td className="px-4 py-3 font-mono text-zinc-300">{formatVND(row.packagePrice)}</td>
                        <td className="px-4 py-3 font-mono text-sky-300 font-bold">{row.activeSubscriptions}</td>
                        <td className="px-4 py-3 font-mono text-zinc-300">
                          <span className="text-emerald-400 font-bold">{row.successCount}</span> / {row.totalCount}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-white">{formatVND(row.revenue)}</td>
                        <td className="px-5 py-3 font-mono">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#ff5500]"
                                style={{ width: `${Math.min(100, row.sharePercent)}%` }}
                              />
                            </div>
                            <span className="w-11 text-right text-zinc-300">{row.sharePercent}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="border-t border-white/10 bg-[#171822]/70 font-mono text-xs">
                  <tr>
                    <td colSpan={3} className="px-5 py-3 font-bold text-zinc-300">TỔNG CỘNG</td>
                    <td className="px-4 py-3 font-bold text-sky-300">{activeSubsCount}</td>
                    <td className="px-4 py-3 font-bold text-zinc-200">{successCount} / {totalTxCount}</td>
                    <td className="px-4 py-3 font-bold text-emerald-400">{formatVND(totalRevenue)}</td>
                    <td className="px-5 py-3 font-bold text-zinc-300">{totalRevenue > 0 ? "100%" : "0%"}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {revenueBreakdownMode === "daily" && (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 bg-[#171822] sticky top-0 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-5 py-3">Ngày</th>
                      <th className="px-4 py-3">Thành Công</th>
                      <th className="px-4 py-3">Đang Chờ</th>
                      <th className="px-4 py-3">Thất Bại / Hủy</th>
                      <th className="px-4 py-3">Hoàn Tiền</th>
                      <th className="px-5 py-3 text-right">Doanh Thu Ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {dailyRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500">
                          Không có giao dịch phát sinh trong khoảng thời gian đã chọn.
                        </td>
                      </tr>
                    ) : (
                      dailyRows.map((d) => (
                        <tr key={d.isoDate} className="hover:bg-white/[0.02] transition">
                          <td className="px-5 py-2.5 text-white font-semibold">
                            {d.date} <span className="text-zinc-500 text-[10px]">({d.isoDate})</span>
                          </td>
                          <td className="px-4 py-2.5 text-emerald-400 font-bold">{d.successCount}</td>
                          <td className="px-4 py-2.5 text-amber-300">{d.pendingCount}</td>
                          <td className="px-4 py-2.5 text-rose-400">{d.failedCount}</td>
                          <td className="px-4 py-2.5 text-zinc-400">{d.refundedCount}</td>
                          <td className="px-5 py-2.5 text-right font-bold text-white">{formatVND(d.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {revenueBreakdownMode === "provider" && (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 bg-white/[0.02] font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-5 py-3">Cổng Thanh Toán</th>
                    <th className="px-4 py-3">Phương Thức</th>
                    <th className="px-4 py-3">Đơn Thành Công / Tổng</th>
                    <th className="px-4 py-3">Doanh Thu</th>
                    <th className="px-5 py-3 min-w-[140px]">Tỷ Trọng (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {(!revenueStats?.byProvider || revenueStats.byProvider.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500">
                        Chưa có dữ liệu giao dịch theo cổng thanh toán.
                      </td>
                    </tr>
                  ) : (
                    revenueStats.byProvider.map((row, idx) => (
                      <tr key={`${row.provider}-${row.paymentMethod}-${idx}`} className="hover:bg-white/[0.02] transition">
                        <td className="px-5 py-3 text-white font-bold">{row.provider}</td>
                        <td className="px-4 py-3 text-zinc-300">{row.paymentMethod}</td>
                        <td className="px-4 py-3">
                          <span className="text-emerald-400 font-bold">{row.successCount}</span> / {row.totalCount}
                        </td>
                        <td className="px-4 py-3 text-white font-bold">{formatVND(row.revenue)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-400"
                                style={{ width: `${Math.min(100, row.sharePercent)}%` }}
                              />
                            </div>
                            <span className="w-11 text-right text-zinc-300">{row.sharePercent}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* SUBTAB 1: PACKAGES GRID */}
      {activeSubTab === "packages" && (
        <div className="space-y-6 anim-fade-up">

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {packages.map((pkg) => {
              const isActive = pkg.status === "ACTIVE";
              const features = parseDescriptionToFeatures(pkg.description);

              return (
                <div
                  key={pkg.id}
                  className={`flex flex-col justify-between rounded-xl border bg-[#12131a] p-4 sm:p-5 shadow-lg transition-all hover:border-[#ff5500]/50 ${
                    isActive ? "border-[#222432]" : "border-rose-500/20 opacity-70"
                  }`}
                >
                  {/* Top info */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-mono text-zinc-300 font-semibold">
                        {pkg.durationDays === 30 ? "30 Ngày" : pkg.durationDays === 365 ? "1 Năm" : `${pkg.durationDays} Ngày`}
                      </span>

                      <button
                        type="button"
                        onClick={() => onTogglePackageStatus(pkg.id)}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono transition cursor-pointer hover:bg-white/5"
                        title={isActive ? "Tạm ngưng cung cấp" : "Kích hoạt gói"}
                      >
                        <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-rose-400"}`} />
                        <span className={isActive ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                          {isActive ? "Hoạt động" : "Tạm dừng"}
                        </span>
                      </button>
                    </div>

                    <h3 className="mt-3 font-graphik text-base sm:text-lg font-bold text-white tracking-tight line-clamp-2 min-h-[2.75rem]" title={pkg.name}>
                      {pkg.name}
                    </h3>

                    {/* Price Tag */}
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="font-display text-2xl font-bold text-[#ff5500] tracking-tight">
                        {formatVND(pkg.price)}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        / {pkg.durationDays === 30 ? "tháng" : pkg.durationDays === 365 ? "năm" : `${pkg.durationDays} ngày`}
                      </span>
                    </div>

                    {/* Active subscribers count badge */}
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-400">
                      <Users className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="font-mono text-emerald-400 font-bold">{pkg.subscribersCount ?? 0}</span>
                      <span>thuê bao đang kích hoạt</span>
                    </div>

                    {/* Features list */}
                    <div className="mt-3 border-t border-[#222432] pt-3 space-y-1.5">
                      <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                        Quyền lợi chính
                      </p>
                      {features.length > 0 ? (
                        features.slice(0, 3).map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                            <Check className="h-3.5 w-3.5 shrink-0 text-[#ff5500] mt-0.5" />
                            <span className="line-clamp-2 leading-relaxed">{feat}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-zinc-500 italic py-1">Chưa có quyền lợi chi tiết.</p>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 pt-3 border-t border-[#222432] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(pkg)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[#222432] bg-[#171822] px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 hover:border-[#ff5500]/40 transition"
                    >
                      <Settings2 className="h-3.5 w-3.5 text-[#ff5500]" /> Chỉnh Sửa Chi Tiết
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePackage(pkg)}
                      title="Xóa hoặc vô hiệu hóa gói cước này"
                      className="p-2 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: TRANSACTIONS LEDGER */}
      {activeSubTab === "transactions" && (
        <div className="space-y-4 anim-fade-up">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-[#0b0e16] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={transactionSearch}
                onChange={(e) => {
                  setTransactionSearch(e.target.value);
                  setTxPage(1);
                }}
                placeholder="Tìm mã giao dịch, họ tên, email, tên gói..."
                className="w-full rounded-xl border border-[#222432] bg-[#12131a] pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#ff5500] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-zinc-400">Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setTxPage(1);
                }}
                className="rounded-xl border border-[#222432] bg-[#12131a] px-3 py-2 text-xs font-mono text-white focus:border-[#ff5500] focus:outline-none"
              >
                <option value="ALL">Tất cả ({transactions.length})</option>
                <option value="SUCCESS">Thành công (SUCCESS)</option>
                <option value="PENDING">Đang chờ (PENDING)</option>
                <option value="FAILED">Thất bại (FAILED)</option>
                <option value="CANCELLED">Đã hủy (CANCELLED)</option>
                <option value="REFUNDED">Đã hoàn tiền (REFUNDED)</option>
              </select>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 font-mono text-xs text-emerald-300 font-semibold">
                Tổng thu: {formatVND(totalRevenue)}
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c1017] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-white/80">
                <thead className="border-b border-white/10 bg-white/[0.02] font-mono text-xs text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Mã GD</th>
                    <th className="px-5 py-3.5">Khách Hàng</th>
                    <th className="px-5 py-3.5">Gói Cước</th>
                    <th className="px-5 py-3.5">Số Tiền</th>
                    <th className="px-5 py-3.5">Cổng TT</th>
                    <th className="px-5 py-3.5">Thời Gian</th>
                    <th className="px-5 py-3.5">Trạng Thái</th>
                    <th className="px-5 py-3.5 text-right">Phương Thức</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-400 font-mono text-xs">
                        Không tìm thấy giao dịch nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => {
                      const isSuccess = tx.status === "SUCCESS";
                      const isRefunded = tx.status === "REFUNDED";
                      const isFailedOrCancelled = tx.status === "FAILED" || tx.status === "CANCELLED";

                      return (
                        <tr key={tx.id} className="transition hover:bg-white/[0.02]">
                          <td className="px-5 py-4 font-mono text-xs text-zinc-400">
                            {tx.providerTransactionId}
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-white">{tx.userName}</div>
                            <div className="font-mono text-xs text-zinc-400">{tx.userEmail}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-medium text-white">{tx.packageName}</span>
                          </td>
                          <td className="px-5 py-4 font-mono text-sm font-bold text-emerald-400">
                            {formatVND(tx.amount)}
                          </td>
                          <td className="px-5 py-4 font-mono text-xs">
                            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-zinc-300">
                              {tx.provider}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-zinc-400">
                            {tx.paidAt || "Chưa thanh toán"}
                          </td>
                          <td className="px-5 py-4">
                            {isSuccess && (
                              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" /> Thành công
                              </span>
                            )}
                            {isRefunded && (
                              <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-rose-300">
                                <RefreshCcw className="h-3 w-3" /> Đã hoàn tiền
                              </span>
                            )}
                            {isFailedOrCancelled && (
                              <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-rose-300">
                                <XCircle className="h-3 w-3" /> {tx.status === "FAILED" ? "Thất bại" : "Đã hủy"}
                              </span>
                            )}
                            {!isSuccess && !isRefunded && !isFailedOrCancelled && (
                              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber-300">
                                <Clock className="h-3 w-3" /> Đang chờ
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-xs text-zinc-300">
                            {tx.paymentMethod || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <AdminPagination
              currentPage={txPage}
              totalItems={filteredTransactions.length}
              pageSize={txPageSize}
              onPageChange={setTxPage}
              onPageSizeChange={setTxPageSize}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        </div>
      )}

      {/* SUBTAB 3: SUBSCRIPTION TIERS */}
      {activeSubTab === "tiers" && (
        <div className="space-y-6 anim-fade-up">
          <div className="rounded-2xl border border-white/10 bg-[#12131a] p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="font-graphik text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#ff5500]" />
                  Tầng Quyền Lợi Thuê Bao
                </h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Cấu hình các mức quyền lợi áp dụng cho tài khoản người dùng và các gói dịch vụ.
                </p>
              </div>
            </div>

            {/* Grid of Tiers */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {tiersLoading && <p role="status" className="text-sm text-zinc-400">Đang tải tầng quyền lợi…</p>}
              {tierError && <p role="alert" className="text-sm text-rose-300">{tierError}</p>}
              {!tiersLoading && !tierError && tiers.length === 0 && <p className="text-sm text-zinc-400">Chưa có tầng quyền lợi trong hệ thống.</p>}
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#222432] bg-[#171822] p-5 shadow-lg hover:border-[#ff5500]/40 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                        {tier.id}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {packages.filter((p) => p.tierId === tier.id).length} gói cước
                      </span>
                    </div>

                    <div>
                      <h4 className="font-graphik text-lg font-bold text-white tracking-tight">
                        {tier.name}
                      </h4>
                      <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                        {tier.description || "Chưa có mô tả chi tiết"}
                      </p>
                    </div>

                    {/* Matrix Specs */}
                    <div className="space-y-2 pt-2 border-t border-white/5 text-xs font-mono">
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Quảng cáo:</span>
                        <span className={tier.adPolicy === "NO_ADS" ? "text-emerald-400 font-semibold" : tier.adPolicy === "DAILY_QUOTA" ? "text-amber-300 font-semibold" : "text-zinc-400"}>
                          {tier.adPolicy === "NO_ADS" ? "Không quảng cáo" : tier.adPolicy === "DAILY_QUOTA" ? `${tier.adFreeDailyLimit} bài/ngày ko QC` : "Quảng cáo tiêu chuẩn"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Chuyển bài:</span>
                        <span className={tier.skipPolicy === "UNLIMITED" ? "text-sky-300 font-semibold" : "text-zinc-400"}>
                          {tier.skipPolicy === "UNLIMITED" ? "Không giới hạn" : `${tier.skipDailyLimit} lần/ngày`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Tải offline:</span>
                        <span className={tier.offlineAllowed ? "text-teal-300" : "text-zinc-500"}>
                          {tier.offlineAllowed ? `${tier.offlineMaxTracks >= 9999 ? "Không giới hạn" : `${tier.offlineMaxTracks} bài`}` : "Không hỗ trợ"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Số thiết bị:</span>
                        <span className="text-white font-bold">{tier.maxDevices} máy</span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Gói gia đình:</span>
                        <span className={tier.familySharing ? "text-yellow-400 font-bold" : "text-zinc-500"}>
                          {tier.familySharing ? `${tier.familyMembers || 6} thành viên` : "Cá nhân"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Lyrics đồng bộ:</span>
                        <span className={tier.syncedLyrics ? "text-white font-semibold" : "text-zinc-500"}>
                          {tier.syncedLyrics ? "Có hỗ trợ" : "Không"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Huy hiệu VIP:</span>
                        <span className={tier.vipBadge ? "text-yellow-300 font-semibold" : "text-zinc-500"}>
                          {tier.vipBadge ? "Bật" : "Tắt"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingTier(tier)}
                    className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#222432]/50 hover:bg-[#ff5500]/15 hover:border-[#ff5500]/50 py-2 text-xs font-mono font-semibold text-white transition active:scale-[0.98] cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#ff5500]" /> Cấu Hình Quyền Lợi Tầng
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: USER SUBSCRIPTIONS */}
      {activeSubTab === "subscriptions" && (
        <div className="space-y-4 anim-fade-up">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-[#0b0e16] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Tìm theo người dùng, email, gói cước..."
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#12141c] pl-10 pr-4 py-2 text-xs text-white placeholder-white/30 focus:border-[#ff5500] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 font-mono">Trạng thái:</span>
              <select
                value={subStatusFilter}
                onChange={(e) => setSubStatusFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#12141c] px-3 py-2 text-xs font-mono text-white focus:border-[#ff5500] focus:outline-none"
              >
                <option value="ALL">Tất cả ({subscriptions?.length || 0})</option>
                <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
                <option value="EXPIRED">Đã hết hạn (EXPIRED)</option>
                <option value="CANCELLED">Đã hủy (CANCELLED)</option>
              </select>
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#12131a] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-zinc-400 font-mono uppercase tracking-wider">
                    <th className="px-5 py-3.5">Mã #</th>
                    <th className="px-5 py-3.5">Người Dùng</th>
                    <th className="px-5 py-3.5">Gói Đăng Ký</th>
                    <th className="px-5 py-3.5">Tầng Quyền Lợi</th>
                    <th className="px-5 py-3.5">Thời Hạn</th>
                    <th className="px-5 py-3.5">Tự Động Gia Hạn</th>
                    <th className="px-5 py-3.5">Trạng Thái</th>
                    <th className="px-5 py-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredSubscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-400 font-mono">
                        Không tìm thấy bản ghi thuê bao nào.
                      </td>
                    </tr>
                  ) : (
                    paginatedSubscriptions.map((sub) => {
                      const isActive = sub.status === "ACTIVE";
                      const isCancelled = sub.status === "CANCELLED";
                      const isExpired = sub.status === "EXPIRED";

                      return (
                        <tr key={sub.id} className="hover:bg-white/[0.02] transition">
                          <td className="px-5 py-4 font-mono text-zinc-400">#{sub.id}</td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-white">{sub.userName || "Người dùng #" + sub.userId}</div>
                            <div className="text-[11px] font-mono text-zinc-400">{sub.userEmail || "Chưa có email"}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-semibold text-white">{sub.packageName}</span>
                            <div className="text-[11px] font-mono text-emerald-400">{formatVND(sub.price)}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-mono text-amber-300">
                              <Crown className="h-3 w-3" /> {sub.tierName}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-mono text-zinc-300 text-[11px]">
                            <div>Từ: {sub.startAt || "N/A"}</div>
                            <div>Đến: {sub.endAt || "N/A"}</div>
                          </td>
                          <td className="px-5 py-4 font-mono text-zinc-300">
                            {sub.autoRenew ? (
                              <span className="text-emerald-400 font-bold">BẬT</span>
                            ) : (
                              <span className="text-zinc-500">TẮT</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {isActive && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" /> Đang dùng
                              </span>
                            )}
                            {isCancelled && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-rose-300">
                                <XCircle className="h-3 w-3" /> Đã hủy
                              </span>
                            )}
                            {isExpired && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-zinc-500/30 bg-zinc-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-400">
                                <Clock className="h-3 w-3" /> Hết hạn
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {isActive && (
                              <button
                                type="button"
                                onClick={() => setSelectedSubForCancel(sub)}
                                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                              >
                                Hủy Gói
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <AdminPagination
              currentPage={subPage}
              totalItems={filteredSubscriptions.length}
              pageSize={subPageSize}
              onPageChange={setSubPage}
              onPageSizeChange={setSubPageSize}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        </div>
      )}

      {/* MODAL: EDIT SUBSCRIPTION TIER */}
      {editingTier && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0e111a] p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-graphik text-xl font-bold text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-[#ff5500]" />
                    Chỉnh Sửa Bậc Quyền Lợi: {editingTier.id}
                  </h3>
                  <p className="font-mono text-xs text-zinc-400 mt-1">
                    Cập nhật trực tiếp vào bảng <code className="text-amber-300">subscription_tiers</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Tên Tầng</label>
                    <input
                      type="text"
                      value={editingTier.name}
                      onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-white outline-none focus:border-[#ff5500]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Mô Tả Tóm Tắt</label>
                    <input
                      type="text"
                      value={editingTier.description || ""}
                      onChange={(e) => setEditingTier({ ...editingTier, description: e.target.value })}
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-white outline-none focus:border-[#ff5500]"
                    />
                  </div>
                </div>

                {/* Ad Policy */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Chính Sách Quảng Cáo</label>
                    <select
                      value={editingTier.adPolicy}
                      onChange={(e) => setEditingTier({ ...editingTier, adPolicy: e.target.value as SubscriptionTier["adPolicy"] })}
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-white outline-none focus:border-[#ff5500]"
                    >
                      <option value="NO_ADS">NO_ADS (100% Không QC)</option>
                      <option value="DAILY_QUOTA">DAILY_QUOTA (Hạn ngạch bài/ngày)</option>
                      <option value="FULL_ADS">FULL_ADS (Quảng cáo tiêu chuẩn)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Số bài/ngày không QC</label>
                    <input
                      type="number"
                      value={editingTier.adFreeDailyLimit}
                      onChange={(e) => setEditingTier({ ...editingTier, adFreeDailyLimit: Number(e.target.value) })}
                      disabled={editingTier.adPolicy !== "DAILY_QUOTA"}
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-white outline-none focus:border-[#ff5500] disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Skip & Quality */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Chính Sách Chuyển Bài (Skip)</label>
                    <select
                      value={editingTier.skipPolicy}
                      onChange={(e) => setEditingTier({ ...editingTier, skipPolicy: e.target.value as SubscriptionTier["skipPolicy"] })}
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-white outline-none focus:border-[#ff5500]"
                    >
                      <option value="UNLIMITED">UNLIMITED (Vô hạn skip)</option>
                      <option value="LIMITED">LIMITED (Giới hạn lượt/ngày)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Số lượt skip/ngày</label>
                    <input
                      type="number"
                      value={editingTier.skipDailyLimit}
                      onChange={(e) => setEditingTier({ ...editingTier, skipDailyLimit: Number(e.target.value) })}
                      disabled={editingTier.skipPolicy !== "LIMITED"}
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-white outline-none focus:border-[#ff5500] disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Devices */}
                <div>
                  <label className="block text-zinc-400 mb-1">Số Thiết Bị Tối Đa</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editingTier.maxDevices}
                    onChange={(e) => setEditingTier({ ...editingTier, maxDevices: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-white outline-none focus:border-[#ff5500]"
                  />
                </div>

                {/* Offline Downloads */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-white cursor-pointer mt-3">
                    <input
                      type="checkbox"
                      checked={editingTier.offlineAllowed}
                      onChange={(e) => setEditingTier({ ...editingTier, offlineAllowed: e.target.checked })}
                      className="rounded border-zinc-700 bg-zinc-900 text-[#ff5500]"
                    />
                    <span>Cho phép tải nhạc ngoại tuyến</span>
                  </label>
                  <div>
                    <label className="block text-zinc-400 mb-1">Số bài offline tối đa</label>
                    <input
                      type="number"
                      value={editingTier.offlineMaxTracks}
                      onChange={(e) => setEditingTier({ ...editingTier, offlineMaxTracks: Number(e.target.value) })}
                      disabled={!editingTier.offlineAllowed}
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-white outline-none focus:border-[#ff5500] disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Family Sharing */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-white cursor-pointer mt-3">
                    <input
                      type="checkbox"
                      checked={editingTier.familySharing}
                      onChange={(e) => setEditingTier({ ...editingTier, familySharing: e.target.checked })}
                      className="rounded border-zinc-700 bg-zinc-900 text-[#ff5500]"
                    />
                    <span>Chia sẻ gói Gia Đình</span>
                  </label>
                  <div>
                    <label className="block text-zinc-400 mb-1">Số thành viên gia đình</label>
                    <input
                      type="number"
                      value={editingTier.familyMembers}
                      onChange={(e) => setEditingTier({ ...editingTier, familyMembers: Number(e.target.value) })}
                      disabled={!editingTier.familySharing}
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-white outline-none focus:border-[#ff5500] disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Synced Lyrics & VIP Badge */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 rounded-xl border border-[#222432] bg-[#171822] px-3 py-2.5 text-white cursor-pointer hover:border-white/15">
                    <input
                      type="checkbox"
                      checked={editingTier.syncedLyrics}
                      onChange={(e) => setEditingTier({ ...editingTier, syncedLyrics: e.target.checked })}
                      className="rounded border-zinc-700 bg-zinc-900 text-[#ff5500]"
                    />
                    <span>Lyrics Karaoke đồng bộ</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-[#222432] bg-[#171822] px-3 py-2.5 text-white cursor-pointer hover:border-white/15">
                    <input
                      type="checkbox"
                      checked={editingTier.vipBadge}
                      onChange={(e) => setEditingTier({ ...editingTier, vipBadge: e.target.checked })}
                      className="rounded border-zinc-700 bg-zinc-900 text-[#ff5500]"
                    />
                    <span>Huy hiệu VIP</span>
                  </label>
                </div>
              </div>

              {tierError && (
                <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {tierError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  className="rounded-xl px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  disabled={tierSaving}
                  onClick={async () => {
                    setTierSaving(true);
                    setTierError("");
                    try {
                      await updateAdminSubscriptionTier(editingTier.id, editingTier);
                      const res = await fetchAdminSubscriptionTiers();
                      if (Array.isArray(res)) setTiers(res);
                      onToast?.(`Đã cập nhật tầng quyền lợi ${editingTier.id}.`, "success");
                      setEditingTier(null);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : "Lỗi khi lưu tầng dịch vụ.";
                      setTierError(msg);
                      onToast?.(msg, "error");
                    } finally {
                      setTierSaving(false);
                    }
                  }}
                  className="rounded-full bg-[#ff5500] px-5 py-2 text-xs font-mono font-semibold text-white shadow-lg shadow-[#ff5500]/25 hover:bg-[#ff6a1a] transition cursor-pointer"
                >
                  {tierSaving ? "Đang lưu..." : "Lưu Quyền Lợi Bậc"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 1: FULL DETAIL PACKAGE EDITOR */}
      {editingPackage && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#0e111a] p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-graphik text-xl font-bold text-white">
                  Chỉnh Sửa Toàn Diện Gói Cước
                </h3>
                <p className="font-mono text-xs text-white/50 mt-1">
                  Mã gói: #{editingPackage.id} · Cập nhật trực tiếp vào danh mục gói cước hệ thống
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPackage(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-mono text-white/70 uppercase tracking-wider mb-2 font-semibold">
                  Tên Gói Cước
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-[#222432] bg-[#171822] px-4 py-2.5 text-sm text-white focus:border-[#ff5500] focus:outline-none font-semibold"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-mono text-white/70 uppercase tracking-wider mb-2 font-semibold">
                  Đơn Giá (VNĐ)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full rounded-xl border border-[#222432] bg-[#171822] px-4 py-2.5 font-mono text-sm text-emerald-400 font-bold focus:border-[#ff5500] focus:outline-none"
                />
              </div>

              {/* Duration Days */}
              <div>
                <label className="block text-xs font-mono text-white/70 uppercase tracking-wider mb-2 font-semibold">
                  Chu Kỳ Gói Cước
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={[30, 90, 180, 365].includes(formData.durationDays) ? formData.durationDays : "custom"}
                    onChange={(e) => {
                      if (e.target.value !== "custom") {
                        setFormData({ ...formData, durationDays: Number(e.target.value) });
                      }
                    }}
                    className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-3 py-2 text-xs font-mono text-white focus:border-[#ff5500] focus:outline-none cursor-pointer"
                  >
                    <option value={30} className="bg-[#12131a]">1 Tháng (30 ngày)</option>
                    <option value={90} className="bg-[#12131a]">3 Tháng (90 ngày)</option>
                    <option value={180} className="bg-[#12131a]">6 Tháng (180 ngày)</option>
                    <option value={365} className="bg-[#12131a]">1 Năm (365 ngày)</option>
                    <option value="custom" className="bg-[#12131a]">Tùy chỉnh số ngày...</option>
                  </select>
                  <input
                    type="number"
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                    placeholder="Số ngày..."
                    className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-4 py-2 text-xs font-mono text-white focus:border-[#ff5500] focus:outline-none"
                  />
                </div>
              </div>

              {/* Tier, Display Order & Status */}
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-white/70 uppercase tracking-wider mb-2 font-semibold">
                      Tầng Quyền Lợi (Tier)
                    </label>
                    <select
                      value={formData.tierId}
                      onChange={(e) => {
                        const selectedTier = e.target.value;
                        const newEnts = buildEntitlementsFromTier(selectedTier, tiers, formData.entitlements);
                        setFormData({
                          ...formData,
                          tierId: selectedTier,
                          entitlements: newEnts,
                          featureItems: generateBulletPointsFromEntitlements(newEnts),
                        });
                      }}
                      className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-3 py-2.5 text-xs font-mono text-amber-300 font-semibold focus:border-[#ff5500] focus:outline-none"
                    >
                      {(tiers.length > 0
                        ? tiers.filter((t) => t.id !== "FREE" || formData.tierId === "FREE")
                        : [
                            { id: "INDIVIDUAL_BASIC", name: "Tiết Kiệm" },
                            { id: "INDIVIDUAL_FULL", name: "Cá Nhân FULL" },
                            { id: "FAMILY", name: "Gói Gia Đình" },
                          ]
                      ).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.id} ({t.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-white/70 uppercase tracking-wider mb-2 font-semibold">
                      Thứ Tự Hiển Thị
                    </label>
                    <input
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                      className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-4 py-2.5 font-mono text-sm text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-white/70 uppercase tracking-wider mb-2 font-semibold">
                      Trạng Thái
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                      className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-3 py-2.5 text-xs font-mono text-white focus:border-[#ff5500] focus:outline-none"
                    >
                      <option value="ACTIVE">ACTIVE (Kích hoạt)</option>
                      <option value="INACTIVE">INACTIVE (Tạm ngưng)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Read-only Tier Entitlements Inheritance Preview */}
            <TierInheritedPreview
              tierId={formData.tierId}
              entitlements={buildEntitlementsFromTier(formData.tierId, tiers, formData.entitlements)}
              onSyncToBullets={() =>
                setFormData((prev) => ({
                  ...prev,
                  featureItems: generateBulletPointsFromEntitlements(
                    buildEntitlementsFromTier(prev.tierId, tiers, prev.entitlements)
                  ),
                }))
              }
              onNavigateToTiers={() => {
                setEditingPackage(null);
                setActiveSubTab("tiers");
              }}
            />

            {/* Feature items editor */}
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-mono text-white/70 uppercase tracking-wider font-semibold">
                  Danh Sách Quyền Lợi &amp; Tính Năng Gói ({formData.featureItems.length})
                </label>
                <span className="text-[11px] font-mono text-zinc-400">Nhập hoặc chọn gợi ý bên dưới</span>
              </div>

              <div className="flex gap-2 mb-2.5">
                <input
                  type="text"
                  value={newFeatureInput}
                  onChange={(e) => setNewFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddFeatureItem();
                    }
                  }}
                  placeholder="Ví dụ: Tải nhạc chất lượng FLAC không giới hạn..."
                  className="flex-1 rounded-xl border border-[#222432] bg-[#171822] px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#ff5500] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddFeatureItem()}
                  disabled={!newFeatureInput.trim()}
                  className={`px-4 py-2.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
                    newFeatureInput.trim()
                      ? "bg-[#ff5500] text-white shadow-md shadow-[#ff5500]/25 hover:bg-[#ff6a1a] active:scale-[0.98] cursor-pointer"
                      : "bg-white/10 text-white/40 cursor-not-allowed"
                  }`}
                >
                  <Plus className="h-4 w-4" /> Thêm Quyền Lợi
                </button>
              </div>

              {/* Quick suggestion dropdown */}
              <div className="mb-3">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleAddFeatureItem(e.target.value);
                  }}
                  className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-3 py-2 text-xs font-mono text-zinc-400 outline-none focus:border-[#ff5500] cursor-pointer"
                >
                  <option value="" className="bg-[#12131a]">-- Chọn nhanh quyền lợi mẫu để thêm --</option>
                  {POPULAR_BENEFITS.filter((item) => !formData.featureItems.includes(item)).map((item) => (
                    <option key={item} value={item} className="bg-[#12131a] text-white">
                      + {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-[#171822] border border-[#222432]">
                {formData.featureItems.length === 0 ? (
                  <p className="py-4 text-center text-xs text-zinc-500 font-mono italic">
                    Chưa có quyền lợi nào. Hãy nhập ở trên hoặc bấm vào gợi ý nhanh để thêm.
                  </p>
                ) : (
                  formData.featureItems.map((feat, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#12131a] text-xs text-white/90 border border-[#222432]/60">
                      <span className="flex items-center gap-2 font-medium">
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#ff5500]" /> {feat}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeatureItem(idx)}
                        className="p-1 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Xóa quyền lợi này"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-[#222432] pt-4">
              <button
                type="button"
                onClick={() => setPackageToDelete(editingPackage)}
                className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Xóa Gói Cước Này
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingPackage(null)}
                  className="rounded-full border border-[#222432] px-5 py-2.5 text-sm font-semibold text-zinc-400 hover:bg-[#171822] transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditPackage}
                  className="rounded-full bg-[#ff5500] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff5500]/25 hover:bg-[#ff6a1a] active:scale-[0.98] transition cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}

      {/* MODAL 2: CREATE NEW PACKAGE */}
      {isCreateModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#0e111a] p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-graphik text-xl font-bold text-white">
                  Tạo Mới Gói Cước Thuê Bao
                </h3>
                <p className="font-mono text-xs text-white/50 mt-1">
                  Đăng ký thêm gói cước dịch vụ mới vào danh mục hệ thống
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-mono text-white/70 uppercase tracking-wider mb-2 font-semibold">
                  Tên Gói Cước
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Moodify Family Pro"
                  className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-4 py-2.5 text-sm text-white focus:border-[#ff5500] focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-white/70 uppercase tracking-wider mb-2 font-semibold">
                  Đơn Giá (VNĐ)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-4 py-2.5 font-mono text-sm text-emerald-400 font-bold focus:border-[#ff5500] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-white/70 uppercase tracking-wider mb-2 font-semibold">
                  Chu Kỳ Gói Cước
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={[30, 90, 180, 365].includes(formData.durationDays) ? formData.durationDays : "custom"}
                    onChange={(e) => {
                      if (e.target.value !== "custom") {
                        setFormData({ ...formData, durationDays: Number(e.target.value) });
                      }
                    }}
                    className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-3 py-2 text-xs font-mono text-white focus:border-[#ff5500] focus:outline-none cursor-pointer"
                  >
                    <option value={30} className="bg-[#12131a]">1 Tháng (30 ngày)</option>
                    <option value={90} className="bg-[#12131a]">3 Tháng (90 ngày)</option>
                    <option value={180} className="bg-[#12131a]">6 Tháng (180 ngày)</option>
                    <option value={365} className="bg-[#12131a]">1 Năm (365 ngày)</option>
                    <option value="custom" className="bg-[#12131a]">Tùy chỉnh số ngày...</option>
                  </select>
                  <input
                    type="number"
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                    placeholder="Số ngày..."
                    className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-4 py-2 text-xs font-mono text-white focus:border-[#ff5500] focus:outline-none"
                  />
                </div>
              </div>

              {/* Tier, Display Order & Status */}
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-white/70 uppercase tracking-wider mb-2 font-semibold">
                      Tầng Quyền Lợi (Tier)
                    </label>
                    <select
                      value={formData.tierId}
                      onChange={(e) => {
                        const selectedTier = e.target.value;
                        const newEnts = buildEntitlementsFromTier(selectedTier, tiers, formData.entitlements);
                        setFormData({
                          ...formData,
                          tierId: selectedTier,
                          entitlements: newEnts,
                          featureItems: generateBulletPointsFromEntitlements(newEnts),
                        });
                      }}
                      className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-3 py-2.5 text-xs font-mono text-amber-300 font-semibold focus:border-[#ff5500] focus:outline-none"
                    >
                      {(tiers.length > 0
                        ? tiers.filter((t) => t.id !== "FREE" || formData.tierId === "FREE")
                        : [
                            { id: "INDIVIDUAL_BASIC", name: "Tiết Kiệm" },
                            { id: "INDIVIDUAL_FULL", name: "Cá Nhân FULL" },
                            { id: "FAMILY", name: "Gói Gia Đình" },
                          ]
                      ).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.id} ({t.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-white/70 uppercase tracking-wider mb-2 font-semibold">
                      Thứ Tự Hiển Thị
                    </label>
                    <input
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                      className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-4 py-2.5 font-mono text-sm text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-white/70 uppercase tracking-wider mb-2 font-semibold">
                      Trạng Thái
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                      className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-3 py-2.5 text-xs font-mono text-white focus:border-[#ff5500] focus:outline-none"
                    >
                      <option value="ACTIVE">ACTIVE (Kích hoạt)</option>
                      <option value="INACTIVE">INACTIVE (Tạm ngưng)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Read-only Tier Entitlements Inheritance Preview */}
            <TierInheritedPreview
              tierId={formData.tierId}
              entitlements={buildEntitlementsFromTier(formData.tierId, tiers, formData.entitlements)}
              onSyncToBullets={() =>
                setFormData((prev) => ({
                  ...prev,
                  featureItems: generateBulletPointsFromEntitlements(
                    buildEntitlementsFromTier(prev.tierId, tiers, prev.entitlements)
                  ),
                }))
              }
              onNavigateToTiers={() => {
                setIsCreateModalOpen(false);
                setActiveSubTab("tiers");
              }}
            />

            {/* Feature items */}
            <div className="border-t border-[#222432] pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-mono text-white/70 uppercase tracking-wider font-semibold">
                  Quyền Lợi Gói Mới ({formData.featureItems.length})
                </label>
                <span className="text-[11px] font-mono text-zinc-400">Nhập hoặc chọn gợi ý bên dưới</span>
              </div>

              <div className="flex gap-2 mb-2.5">
                <input
                  type="text"
                  value={newFeatureInput}
                  onChange={(e) => setNewFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddFeatureItem();
                    }
                  }}
                  placeholder="Nhập quyền lợi nổi bật..."
                  className="flex-1 rounded-xl border border-[#222432] bg-[#12131a] px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-[#ff5500] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddFeatureItem()}
                  disabled={!newFeatureInput.trim()}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-[0.98] ${
                    newFeatureInput.trim()
                      ? "bg-[#ff5500] text-white shadow-md shadow-[#ff5500]/25 hover:brightness-110 cursor-pointer"
                      : "bg-white/10 text-white/40 cursor-not-allowed"
                  }`}
                >
                  <Plus className="h-4 w-4" /> Thêm Quyền Lợi
                </button>
              </div>

              {/* Quick suggestion dropdown */}
              <div className="mb-3">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleAddFeatureItem(e.target.value);
                  }}
                  className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-3 py-2 text-xs font-mono text-zinc-400 outline-none focus:border-[#ff5500] cursor-pointer"
                >
                  <option value="" className="bg-[#12131a]">-- Chọn nhanh quyền lợi mẫu để thêm --</option>
                  {POPULAR_BENEFITS.filter((item) => !formData.featureItems.includes(item)).map((item) => (
                    <option key={item} value={item} className="bg-[#12131a] text-white">
                      + {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-[#12131a] border border-[#222432]">
                {formData.featureItems.length === 0 ? (
                  <p className="py-4 text-center text-xs text-white/40 font-mono italic">
                    Chưa có quyền lợi nào. Hãy nhập ở trên hoặc bấm vào gợi ý nhanh để thêm.
                  </p>
                ) : (
                  formData.featureItems.map((feat, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#171822] text-xs text-white/90 border border-[#222432]/60">
                      <span className="flex items-center gap-2 font-medium">
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#ff5500]" /> {feat}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeatureItem(idx)}
                        className="p-1 rounded-md text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Xóa quyền lợi này"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/5 transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveCreatePackage}
                className="rounded-full bg-[#ff5500] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff5500]/25 hover:bg-[#ff6a1a] active:scale-[0.98] transition cursor-pointer"
              >
                Tạo Gói Cước
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}

      {/* CANCEL SUBSCRIPTION MODAL */}
      {selectedSubForCancel && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-rose-500/30 bg-[#0e111a] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 border border-rose-500/20">
                <XCircle className="h-5 w-5" />
              </div>
              <h3 className="font-graphik text-lg font-bold text-white">Xác Nhận Hủy Gói Thuê Bao</h3>
            </div>

            <p className="text-sm text-white/70 leading-relaxed">
              Bạn có chắc chắn muốn hủy gói dịch vụ <strong className="text-white font-semibold">{selectedSubForCancel.packageName}</strong> của người dùng{" "}
              <strong className="text-white">{selectedSubForCancel.userName || selectedSubForCancel.userEmail}</strong>?
              Sau khi hủy, trạng thái gói sẽ chuyển sang CANCELLED và người dùng sẽ trở về tài khoản FREE.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedSubForCancel(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/60 hover:bg-white/5"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onCancelSubscription) onCancelSubscription(selectedSubForCancel.id);
                  setSelectedSubForCancel(null);
                }}
                className="rounded-xl bg-rose-500 px-5 py-2 text-sm font-bold text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20"
              >
                Xác Nhận Hủy Gói
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}

      {/* CONFIRMATION MODAL: DELETE PACKAGE */}
      {packageToDelete && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-rose-500/30 bg-[#0c1017] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="h-6 w-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Xác Nhận Xóa Gói Cước</h3>
                <p className="text-xs text-rose-400/80 font-mono">Dọn dẹp liên kết & xóa vĩnh viễn</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa gói cước <strong className="text-white">"{packageToDelete.name}"</strong> (ID: #{packageToDelete.id}, giá {formatVND(packageToDelete.price)}) khỏi hệ thống? Dữ liệu gói cước và quan hệ con sẽ được dọn dẹp sạch sẽ.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setPackageToDelete(null)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition"
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetId = packageToDelete.id;
                  setPackageToDelete(null);
                  setEditingPackage(null);
                  if (onDeletePackage) {
                    onDeletePackage(targetId);
                  } else {
                    onTogglePackageStatus(targetId);
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-900/30 hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                <Trash2 className="h-4 w-4" /> Xác Nhận Xóa Gói Cước
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}
    </div>
  );
}
