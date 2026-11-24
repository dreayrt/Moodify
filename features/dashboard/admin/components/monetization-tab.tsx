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
import {
  fetchAdminSubscriptionTiers,
  createAdminSubscriptionTier,
  updateAdminSubscriptionTier,
  deleteAdminSubscriptionTier,
} from "@/lib/api/admin-client";
import { InteractiveAreaChart } from "@/components/dashboard/charts/interactive-area-chart";
import { InteractiveDonutChart } from "@/components/dashboard/charts/interactive-donut-chart";

const TIER_LABELS: Record<string, string> = {
  FREE: "Miễn phí",
  INDIVIDUAL_BASIC: "Cá nhân cơ bản",
  INDIVIDUAL_FULL: "Cá nhân nâng cao",
  FAMILY: "Gia đình",
};

function getTierLabel(tierId?: string | null, tiers: SubscriptionTier[] = []): string {
  if (!tierId) return "—";
  const matched = tiers.find((t) => t.id === tierId);
  if (matched?.name) return matched.name;
  return TIER_LABELS[tierId] || tierId;
}

type MonetizationTabProps = {
  packages: ServicePackage[];
  transactions: PaymentTransaction[];
  onTogglePackageStatus: (packageId: number) => void;
  onUpdatePackagePrice: (packageId: number, newPrice: number) => void;
  onCreatePackage?: (data: Partial<ServicePackage>) => Promise<boolean> | void;
  onUpdatePackageDetails?: (packageId: number, data: Partial<ServicePackage>) => Promise<boolean> | void;
  onDeletePackage?: (packageId: number) => void;
  onRefundTransaction?: (transactionId: number) => void;
  subscriptions?: AdminUserSubscription[];
  onCancelSubscription?: (subscriptionId: number) => void;
  onTiersChanged?: () => Promise<void> | void;
  revenueStats?: AdminRevenueStats | null;
  revenueDays?: 7 | 30 | 90;
  onRevenueDaysChange?: (days: 7 | 30 | 90) => void;
  loadingRevenueStats?: boolean;
  onToast?: (message: string, type?: "success" | "error" | "info" | "warning") => void;
};

export function getEffectiveEntitlements(pkg: ServicePackage): PackageEntitlements {
  if (pkg.entitlements && pkg.entitlements.adPolicy) {
    return {
      tier: pkg.tierId || pkg.entitlements.tier,
      ...pkg.entitlements,
    };
  }

  if (pkg.featuresJson) {
    try {
      const parsed = JSON.parse(pkg.featuresJson);
      if (parsed && typeof parsed === "object" && parsed.adPolicy && parsed.skipPolicy) {
        return {
          tier: pkg.tierId || parsed.tier,
          adPolicy: parsed.adPolicy || "FULL_ADS",
          adFreeDailyLimit: parsed.adFreeDailyLimit ?? 0,
          adIntervalAfterLimit: parsed.adIntervalAfterLimit ?? 0,
          skipPolicy: parsed.skipPolicy || "LIMITED",
          skipDailyLimit: parsed.skipDailyLimit ?? 0,
          offlineAllowed: parsed.offlineAllowed ?? false,
          offlineMaxTracks: parsed.offlineMaxTracks ?? 0,
          maxDevices: parsed.maxDevices ?? 1,
          syncedLyrics: true,
          vipBadge: (pkg.tierId || parsed.tier) !== "FREE",
          familySharing: false,
          familyMembers: 0,
        };
      }
    } catch (_) {}
  }

  throw new Error("Gói dịch vụ chưa có cấu hình quyền lợi từ máy chủ.");
}

export function generateBulletPointsFromEntitlements(ent: PackageEntitlements): string[] {
  const bullets: string[] = [];

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
    const trackStr = ent.offlineMaxTracks >= 9999 ? "không giới hạn bài hát" : `${ent.offlineMaxTracks} bài hát`;
    bullets.push(`Tải nghe ngoại tuyến (${trackStr})`);
  }

  const deviceCount = Math.max(1, ent.maxDevices || 1);
  bullets.push(
    deviceCount > 1
      ? `Sử dụng tối đa ${deviceCount} thiết bị đồng thời`
      : "Sử dụng trên 1 thiết bị"
  );

  if (ent.tier !== "FREE" && ent.vipBadge !== false) {
    bullets.push("Giao diện và huy hiệu thành viên VIP");
  }

  return bullets;
}

const POPULAR_BENEFITS = [
  "Nghe nhạc không quảng cáo",
  "Chuyển bài không giới hạn",
  "Tải nhạc nghe ngoại tuyến",
  "Sử dụng nhiều thiết bị đồng thời",
  "Giao diện và huy hiệu thành viên VIP",
];

type EntitlementFormValues = {
  adPolicy: "NO_ADS" | "DAILY_QUOTA" | "FULL_ADS";
  adFreeDailyLimit: number;
  skipPolicy: "UNLIMITED" | "LIMITED";
  skipDailyLimit: number;
  offlineAllowed: boolean;
  offlineMaxTracks: number;
  maxDevices: number;
};

function validateEntitlementValues(val: EntitlementFormValues): string | null {
  if (!Number.isInteger(val.maxDevices) || val.maxDevices < 1 || val.maxDevices > 10) {
    return "Số thiết bị tối đa phải từ 1 đến 10.";
  }
  if (val.adPolicy === "DAILY_QUOTA" && (!Number.isInteger(val.adFreeDailyLimit) || val.adFreeDailyLimit < 1 || val.adFreeDailyLimit > 500)) {
    return "Hạn mức bài không quảng cáo/ngày phải từ 1 đến 500.";
  }
  if (val.skipPolicy === "LIMITED" && (!Number.isInteger(val.skipDailyLimit) || val.skipDailyLimit < 1 || val.skipDailyLimit > 500)) {
    return "Hạn mức lượt chuyển bài/ngày phải từ 1 đến 500.";
  }
  if (val.offlineAllowed && (!Number.isInteger(val.offlineMaxTracks) || val.offlineMaxTracks < 1 || val.offlineMaxTracks > 9999)) {
    return "Số bài ngoại tuyến tối đa phải từ 1 đến 9999.";
  }
  return null;
}

function normalizeEntitlementPayload(val: EntitlementFormValues, isFree: boolean) {
  return {
    adPolicy: val.adPolicy,
    adFreeDailyLimit: val.adPolicy === "DAILY_QUOTA" ? val.adFreeDailyLimit : 0,
    skipPolicy: val.skipPolicy,
    skipDailyLimit: val.skipPolicy === "LIMITED" ? val.skipDailyLimit : 0,
    offlineAllowed: val.offlineAllowed,
    offlineMaxTracks: val.offlineAllowed ? val.offlineMaxTracks : 0,
    maxDevices: val.maxDevices,
    syncedLyrics: true,
    vipBadge: !isFree,
    familySharing: !isFree && val.maxDevices > 1,
    familyMembers: !isFree && val.maxDevices > 1 ? val.maxDevices : 0,
  };
}

function EntitlementEditorFields({
  value,
  onChange,
  isFree = false,
}: {
  value: EntitlementFormValues;
  onChange: (next: EntitlementFormValues) => void;
  isFree?: boolean;
}) {
  return (
    <div className="space-y-4 text-xs">
      {/* 1. Quảng cáo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-zinc-400 mb-1">Chính sách quảng cáo</label>
          <select
            value={value.adPolicy}
            onChange={(e) => {
              const nextPolicy = e.target.value as EntitlementFormValues["adPolicy"];
              onChange({
                ...value,
                adPolicy: nextPolicy,
                adFreeDailyLimit: nextPolicy === "DAILY_QUOTA" ? Math.max(1, value.adFreeDailyLimit || 15) : 0,
              });
            }}
            className="w-full rounded-xl border border-white/[0.08] bg-[#171923] px-3 py-2 text-white outline-none focus:border-[#ff5500] cursor-pointer"
          >
            <option value="NO_ADS">Không quảng cáo</option>
            <option value="DAILY_QUOTA">Giới hạn bài không quảng cáo/ngày</option>
            <option value="FULL_ADS">Có quảng cáo thông thường</option>
          </select>
        </div>
        <div>
          <label className="block text-zinc-400 mb-1">Số bài/ngày không quảng cáo</label>
          <input
            type="number"
            min={value.adPolicy === "DAILY_QUOTA" ? 1 : 0}
            max={500}
            value={value.adPolicy === "DAILY_QUOTA" ? value.adFreeDailyLimit : 0}
            onChange={(e) => onChange({ ...value, adFreeDailyLimit: Number(e.target.value) })}
            disabled={value.adPolicy !== "DAILY_QUOTA"}
            className="w-full rounded-xl border border-white/[0.08] bg-[#171923] px-3 py-2 font-mono text-white outline-none focus:border-[#ff5500] disabled:opacity-45"
          />
        </div>
      </div>

      {/* 2. Chuyển bài */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-zinc-400 mb-1">Chính sách chuyển bài</label>
          <select
            value={value.skipPolicy}
            onChange={(e) => {
              const nextPolicy = e.target.value as EntitlementFormValues["skipPolicy"];
              onChange({
                ...value,
                skipPolicy: nextPolicy,
                skipDailyLimit: nextPolicy === "LIMITED" ? Math.max(1, value.skipDailyLimit || 30) : 0,
              });
            }}
            className="w-full rounded-xl border border-white/[0.08] bg-[#171923] px-3 py-2 text-white outline-none focus:border-[#ff5500] cursor-pointer"
          >
            <option value="UNLIMITED">Không giới hạn</option>
            <option value="LIMITED">Giới hạn mỗi ngày</option>
          </select>
        </div>
        <div>
          <label className="block text-zinc-400 mb-1">Số lượt chuyển bài/ngày</label>
          <input
            type="number"
            min={value.skipPolicy === "LIMITED" ? 1 : 0}
            max={500}
            value={value.skipPolicy === "LIMITED" ? value.skipDailyLimit : 0}
            onChange={(e) => onChange({ ...value, skipDailyLimit: Number(e.target.value) })}
            disabled={value.skipPolicy !== "LIMITED"}
            className="w-full rounded-xl border border-white/[0.08] bg-[#171923] px-3 py-2 font-mono text-white outline-none focus:border-[#ff5500] disabled:opacity-45"
          />
        </div>
      </div>

      {/* 3. Tải nghe ngoại tuyến */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <label className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#171923] px-3 py-2.5 text-white cursor-pointer hover:border-white/15">
          <input
            type="checkbox"
            checked={value.offlineAllowed}
            onChange={(e) => {
              const allowed = e.target.checked;
              onChange({
                ...value,
                offlineAllowed: allowed,
                offlineMaxTracks: allowed ? (value.offlineMaxTracks > 0 ? value.offlineMaxTracks : 100) : 0,
              });
            }}
            className="rounded border-zinc-700 bg-zinc-900 accent-[#ff5500]"
          />
          <span>Cho phép tải nghe ngoại tuyến</span>
        </label>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-zinc-400">Số bài ngoại tuyến tối đa</label>
            {value.offlineAllowed && (
              <label className="inline-flex items-center gap-1 text-[11px] text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.offlineMaxTracks >= 9999}
                  onChange={(e) =>
                    onChange({ ...value, offlineMaxTracks: e.target.checked ? 9999 : 100 })
                  }
                  className="accent-[#ff5500]"
                />
                <span>Không giới hạn</span>
              </label>
            )}
          </div>
          <input
            type="number"
            min={value.offlineAllowed ? 1 : 0}
            max={9999}
            value={value.offlineAllowed ? value.offlineMaxTracks : 0}
            onChange={(e) => onChange({ ...value, offlineMaxTracks: Number(e.target.value) })}
            disabled={!value.offlineAllowed}
            className="w-full rounded-xl border border-white/[0.08] bg-[#171923] px-3 py-2 font-mono text-white outline-none focus:border-[#ff5500] disabled:opacity-45"
          />
        </div>
      </div>

      {/* 4. Số thiết bị */}
      <div>
        <label className="block text-zinc-400 mb-1">Số thiết bị hoạt động đồng thời (1–10)</label>
        <input
          type="number"
          min={1}
          max={10}
          value={value.maxDevices}
          onChange={(e) => onChange({ ...value, maxDevices: Number(e.target.value) })}
          className="w-full rounded-xl border border-white/[0.08] bg-[#171923] px-3 py-2 font-mono text-white outline-none focus:border-[#ff5500]"
        />
      </div>

      {/* Quyền lợi giao diện VIP gộp sẵn (không chỉnh tay từng cờ) */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5 flex items-center gap-2.5 text-xs">
        <Crown className={`w-4 h-4 shrink-0 ${isFree ? "text-zinc-500" : "text-amber-300"}`} />
        <p className={isFree ? "text-zinc-400" : "text-amber-200/90"}>
          {isFree
            ? "Hạng Miễn phí không bao gồm quyền lợi giao diện VIP."
            : "Quyền lợi giao diện VIP (huy hiệu VIP và chủ đề giao diện nổi bật) tự động đi kèm mọi gói trả phí."}
        </p>
      </div>
    </div>
  );
}

function buildEntitlementsFromTier(
  tierId: string,
  tiers: SubscriptionTier[],
  fallback?: PackageEntitlements
): PackageEntitlements {
  const matched = tiers.find((t) => t.id === tierId);
  if (matched) {
    return {
      tier: matched.id,
      adPolicy: matched.adPolicy,
      adFreeDailyLimit: matched.adFreeDailyLimit ?? 0,
      adIntervalAfterLimit: matched.adPolicy === "DAILY_QUOTA" ? 7 : matched.adPolicy === "FULL_ADS" ? 2 : 0,
      skipPolicy: matched.skipPolicy,
      skipDailyLimit: matched.skipDailyLimit ?? 0,
      offlineAllowed: Boolean(matched.offlineAllowed),
      offlineMaxTracks: matched.offlineMaxTracks ?? 0,
      maxDevices: matched.maxDevices ?? 1,
      syncedLyrics: true,
      vipBadge: matched.id !== "FREE",
      familySharing: false,
      familyMembers: 0,
    };
  }
  if (fallback) {
    return {
      ...fallback,
      tier: tierId || fallback.tier,
      vipBadge: (tierId || fallback.tier) !== "FREE",
    };
  }
  return {
    tier: tierId || "INDIVIDUAL_FULL",
    adPolicy: "NO_ADS",
    adFreeDailyLimit: 0,
    adIntervalAfterLimit: 0,
    skipPolicy: "UNLIMITED",
    skipDailyLimit: 0,
    offlineAllowed: true,
    offlineMaxTracks: 9999,
    maxDevices: 1,
    syncedLyrics: true,
    vipBadge: (tierId || "INDIVIDUAL_FULL") !== "FREE",
    familySharing: false,
    familyMembers: 0,
  };
}

function TierInheritedPreview({
  tierId,
  tiers,
  entitlements,
  onSyncToBullets,
  onNavigateToTiers,
}: {
  tierId: string;
  tiers: SubscriptionTier[];
  entitlements: PackageEntitlements;
  onSyncToBullets: () => void;
  onNavigateToTiers: () => void;
}) {
  return (
    <div className="border-t border-white/10 pt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold text-white flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#ff5500]" />
            Quyền lợi theo hạng gói ({getTierLabel(tierId, tiers)})
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Quyền hạn áp dụng theo cấu hình chung. Chỉnh sửa tại{" "}
            <button
              type="button"
              onClick={onNavigateToTiers}
              className="text-[#ff5500] underline hover:brightness-110 cursor-pointer"
            >
              Hạng gói
            </button>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={onSyncToBullets}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ff5500]/40 bg-[#ff5500]/10 text-[#ff5500] hover:bg-[#ff5500]/20 text-xs font-semibold transition active:scale-[0.98] cursor-pointer"
          title="Tự động cập nhật danh sách mô tả quyền lợi theo cấu hình hạng gói"
        >
          <RefreshCcw className="w-3 h-3" /> Đồng bộ mô tả quyền lợi
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 rounded-xl border border-white/[0.08] bg-[#12141c] p-3 text-xs">
        <div>
          <span className="text-zinc-500 block">Quảng cáo</span>
          <strong className="text-amber-300 tabular-nums">
            {entitlements.adPolicy === "NO_ADS"
              ? "Không quảng cáo"
              : entitlements.adPolicy === "DAILY_QUOTA"
              ? `${entitlements.adFreeDailyLimit} bài/ngày không QC`
              : "Có quảng cáo"}
          </strong>
        </div>
        <div>
          <span className="text-zinc-500 block">Chuyển bài</span>
          <strong className="text-sky-300 tabular-nums">
            {entitlements.skipPolicy === "UNLIMITED"
              ? "Không giới hạn"
              : `${entitlements.skipDailyLimit} lượt/ngày`}
          </strong>
        </div>
        <div>
          <span className="text-zinc-500 block">Tải nghe ngoại tuyến</span>
          <strong className="text-emerald-300 tabular-nums">
            {entitlements.offlineAllowed
              ? entitlements.offlineMaxTracks >= 9999
                ? "Không giới hạn"
                : `${entitlements.offlineMaxTracks} bài`
              : "Không hỗ trợ"}
          </strong>
        </div>
        <div>
          <span className="text-zinc-500 block">Số thiết bị đồng thời</span>
          <strong className="text-white tabular-nums">{Math.max(1, entitlements.maxDevices || 1)} máy</strong>
        </div>
        <div className="col-span-2 sm:col-span-2">
          <span className="text-zinc-500 block">Giao diện &amp; huy hiệu VIP</span>
          <strong className={tierId === "FREE" ? "text-zinc-400" : "text-yellow-300"}>
            {tierId === "FREE" ? "Không áp dụng" : "Tự động kèm mọi gói trả phí"}
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
  onTiersChanged,
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

  // Subscription Tiers
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [editingTier, setEditingTier] = useState<SubscriptionTier | null>(null);
  const [isCreateTierModalOpen, setIsCreateTierModalOpen] = useState(false);
  const [createTierDraft, setCreateTierDraft] = useState<{
    name: string;
    description: string;
    entitlements: EntitlementFormValues;
  }>({
    name: "",
    description: "",
    entitlements: {
      adPolicy: "NO_ADS",
      adFreeDailyLimit: 0,
      skipPolicy: "UNLIMITED",
      skipDailyLimit: 0,
      offlineAllowed: true,
      offlineMaxTracks: 100,
      maxDevices: 1,
    },
  });
  const [tierToDelete, setTierToDelete] = useState<SubscriptionTier | null>(null);
  const [tierSaving, setTierSaving] = useState(false);
  const [tierError, setTierError] = useState("");
  const [packageError, setPackageError] = useState("");
  const [packageModalError, setPackageModalError] = useState("");
  const [packageSaving, setPackageSaving] = useState(false);
  const [tiersLoading, setTiersLoading] = useState(true);

  useEffect(() => {
    fetchAdminSubscriptionTiers()
      .then((data) => {
        if (Array.isArray(data)) setTiers(data);
      })
      .catch((err) => setTierError(err instanceof Error ? err.message : "Không tải được danh sách hạng gói"))
      .finally(() => setTiersLoading(false));
  }, []);

  // Modals state
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [entitlementMode, setEntitlementMode] = useState<"shared" | "custom">("shared");

  // Form states for package editor / creator
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    durationDays: 30,
    displayOrder: 1,
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
    tierId: "INDIVIDUAL_FULL",
    description: "",
    featureItems: [] as string[],
    entitlements: {
      adPolicy: "NO_ADS",
      adFreeDailyLimit: 0,
      adIntervalAfterLimit: 0,
      skipPolicy: "UNLIMITED",
      skipDailyLimit: 0,
      offlineAllowed: true,
      offlineMaxTracks: 9999,
      maxDevices: 1,
      syncedLyrics: true,
      vipBadge: true,
      familySharing: false,
      familyMembers: 0,
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
    const tierId = pkg.tierId || ents.tier || "INDIVIDUAL_FULL";
    const isSingleCustomTier =
      tierId.startsWith("CUSTOM_") &&
      packages.filter((p) => p.tierId === tierId).length <= 1;
    setEntitlementMode(isSingleCustomTier ? "custom" : "shared");
    setPackageModalError("");
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      price: pkg.price,
      durationDays: pkg.durationDays,
      displayOrder: pkg.displayOrder,
      status: pkg.status,
      tierId,
      description: pkg.description,
      featureItems: features,
      entitlements: { ...ents, tier: tierId },
    });
    setNewFeatureInput("");
  };

  const handleOpenCreate = () => {
    const paidTiers = tiers.filter((t) => t.id !== "FREE");
    const defaultTierId =
      paidTiers.find((t) => t.id === "INDIVIDUAL_FULL")?.id ||
      paidTiers[0]?.id ||
      "INDIVIDUAL_FULL";
    const defaultEnts = buildEntitlementsFromTier(defaultTierId, tiers);
    setEntitlementMode("shared");
    setPackageModalError("");
    setIsCreateModalOpen(true);
    setFormData({
      name: "",
      price: 29000,
      durationDays: 30,
      displayOrder: packages.length + 1,
      status: "ACTIVE",
      tierId: defaultTierId,
      description: "",
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

  const handleSavePackageModal = async () => {
    const isEditing = Boolean(editingPackage);
    const cleanName = formData.name.trim();
    if (!cleanName) {
      const msg = isEditing ? "Vui lòng nhập tên gói dịch vụ." : "Vui lòng nhập tên gói dịch vụ mới.";
      setPackageModalError(msg);
      onToast?.(msg, "warning");
      return;
    }
    if (!Number.isFinite(formData.price) || formData.price < 0) {
      const msg = "Đơn giá gói dịch vụ không hợp lệ.";
      setPackageModalError(msg);
      onToast?.(msg, "warning");
      return;
    }
    if (!Number.isFinite(formData.durationDays) || formData.durationDays < 1 || formData.durationDays > 3650) {
      const msg = "Chu kỳ gói dịch vụ phải từ 1 đến 3650 ngày.";
      setPackageModalError(msg);
      onToast?.(msg, "warning");
      return;
    }

    const customEntValues: EntitlementFormValues = {
      adPolicy: formData.entitlements.adPolicy,
      adFreeDailyLimit: formData.entitlements.adFreeDailyLimit,
      skipPolicy: formData.entitlements.skipPolicy,
      skipDailyLimit: formData.entitlements.skipDailyLimit,
      offlineAllowed: formData.entitlements.offlineAllowed,
      offlineMaxTracks: formData.entitlements.offlineMaxTracks,
      maxDevices: formData.entitlements.maxDevices,
    };
    if (entitlementMode === "custom") {
      const validationError = validateEntitlementValues(customEntValues);
      if (validationError) {
        setPackageModalError(validationError);
        onToast?.(validationError, "warning");
        return;
      }
    }

    setPackageSaving(true);
    setPackageModalError("");
    try {
      let resolvedTierId = formData.tierId;
      let tierChanged = false;

      if (entitlementMode === "custom") {
        const tierPayload = {
          name: cleanName.slice(0, 100),
          description: `Quyền lợi tùy chỉnh cho ${cleanName}`.slice(0, 255),
          ...normalizeEntitlementPayload(customEntValues, false),
        };
        const canUpdateExistingCustomTier =
          Boolean(editingPackage?.tierId?.startsWith("CUSTOM_")) &&
          packages.filter((p) => p.tierId === editingPackage?.tierId).length <= 1;

        if (canUpdateExistingCustomTier && editingPackage?.tierId) {
          await updateAdminSubscriptionTier(editingPackage.tierId, tierPayload);
          resolvedTierId = editingPackage.tierId;
          tierChanged = true;
        } else {
          const created = await createAdminSubscriptionTier(tierPayload);
          if (!created.tier?.id) {
            throw new Error("Không tạo được cấu hình quyền lợi riêng cho gói này.");
          }
          resolvedTierId = created.tier.id;
          tierChanged = true;
        }
        const refreshedTiers = await fetchAdminSubscriptionTiers();
        if (Array.isArray(refreshedTiers)) setTiers(refreshedTiers);
      }

      const payload: Partial<ServicePackage> = {
        name: cleanName,
        price: formData.price,
        durationDays: formData.durationDays,
        displayOrder: Math.max(0, formData.displayOrder || 1),
        status: formData.status,
        tierId: resolvedTierId,
        description: serializeFeatureItems(formData.featureItems),
      };

      if (isEditing && editingPackage) {
        if (onUpdatePackageDetails) {
          const ok = await onUpdatePackageDetails(editingPackage.id, payload);
          if (ok === false) return;
        } else {
          onUpdatePackagePrice(editingPackage.id, formData.price);
        }
        if (tierChanged) await onTiersChanged?.();
        setEditingPackage(null);
      } else {
        if (onCreatePackage) {
          const ok = await onCreatePackage(payload);
          if (ok === false) return;
        }
        if (tierChanged) await onTiersChanged?.();
        setIsCreateModalOpen(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể lưu thông tin gói dịch vụ.";
      setPackageModalError(msg);
      onToast?.(msg, "error");
    } finally {
      setPackageSaving(false);
    }
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
              Gói dịch vụ &amp; Doanh thu
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
              <Plus className="h-4 w-4" /> Thêm gói mới
            </button>
          )}

          {/* Subtab Toggle Buttons */}
          <div className="flex flex-wrap items-center rounded-xl border border-white/[0.08] bg-[#12141c] p-1">
            <button
              type="button"
              onClick={() => setActiveSubTab("packages")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer tabular-nums ${
                activeSubTab === "packages"
                  ? "bg-[#ff5500] text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" /> Gói dịch vụ ({packages.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("tiers")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer tabular-nums ${
                activeSubTab === "tiers"
                  ? "bg-[#ff5500] text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> Hạng gói ({tiers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("transactions")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer tabular-nums ${
                activeSubTab === "transactions"
                  ? "bg-[#ff5500] text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Receipt className="h-3.5 w-3.5" /> Giao dịch ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("subscriptions")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer tabular-nums ${
                activeSubTab === "subscriptions"
                  ? "bg-[#ff5500] text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Thuê bao ({subscriptions.length})
            </button>
          </div>
        </div>
      </div>

      {/* ================= EXECUTIVE REVENUE & MONETIZATION DECK ================= */}
      <div className="space-y-5">
        {/* 4 Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl relative overflow-hidden group hover:border-[#ff5500]/40 transition">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span>Tổng doanh thu</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-display text-2xl font-bold text-white tracking-tight tabular-nums">
              {formatVND(totalRevenue)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between gap-2 tabular-nums">
              <span>Trong {revenueDays} ngày: {formatVND(periodRevenue)}</span>
              {growthPercent !== 0 && (
                <span className={growthPercent > 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {growthPercent > 0 ? `+${growthPercent}%` : `${growthPercent}%`}
                </span>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl relative overflow-hidden group hover:border-[#ff5500]/40 transition">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span>Giao dịch thanh toán</span>
              <Receipt className="w-4 h-4 text-sky-400" />
            </div>
            <div className="font-display text-2xl font-bold text-white tracking-tight tabular-nums">
              {totalTxCount} giao dịch
            </div>
            <p className="text-[11px] text-sky-400 mt-1 tabular-nums">
              {successCount} thành công ({successRate}%) · {pendingCount} chờ · {failedCount} lỗi/hủy
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl relative overflow-hidden group hover:border-[#ff5500]/40 transition">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span>Thuê bao đang dùng</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="font-display text-2xl font-bold text-white tracking-tight tabular-nums">
              {activeSubsCount} người
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 tabular-nums">
              {paidUsersCount} khách trả phí · Trung bình/đơn: {formatVND(avgOrderValue)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl relative overflow-hidden group hover:border-[#ff5500]/40 transition">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span>Gói đang bán</span>
              <CreditCard className="w-4 h-4 text-purple-400" />
            </div>
            <div className="font-display text-2xl font-bold text-white tracking-tight tabular-nums">
              {activePackagesCount} / {packages.length} gói
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 tabular-nums">
              {loadingRevenueStats ? "Đang cập nhật thống kê..." : `Kỳ thống kê: ${revenueDays} ngày`}
            </p>
          </div>
        </div>

        {/* 2 Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7">
            <InteractiveAreaChart
              title="Doanh thu theo thời gian"
              subtitle={`Biến động doanh thu trong ${revenueDays} ngày qua.`}
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
              title="Doanh thu theo gói"
              subtitle="Tỷ lệ doanh thu của từng gói dịch vụ."
              data={packageRevenueDonutData}
              centerLabel="Doanh thu"
              size={180}
              strokeWidth={22}
              formatValue={formatVND}
              formatCenterValue={(v) => (v === 0 ? "0 ₫" : formatCompactVND(v) + " ₫")}
            />
          </div>
        </div>

        {/* Working Revenue Summary Breakdown Table */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] shadow-xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
            <div>
              <h3 className="font-graphik text-sm font-bold text-white">
                Thống kê doanh thu chi tiết
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Phân tích theo gói dịch vụ, theo ngày trong {revenueDays} ngày và theo cổng thanh toán.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {revenueBreakdownMode === "daily" && (
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#171923] px-2.5 py-1.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyNonZeroDaily}
                    onChange={(e) => setOnlyNonZeroDaily(e.target.checked)}
                    className="accent-[#ff5500]"
                  />
                  <span>Chỉ ngày có giao dịch</span>
                </label>
              )}

              <div className="flex items-center rounded-xl border border-white/[0.08] bg-[#171923] p-1 text-xs">
                {(
                  [
                    { id: "package", label: "Theo gói" },
                    { id: "daily", label: "Theo ngày" },
                    { id: "provider", label: "Theo cổng thanh toán" },
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
                <thead className="border-b border-white/[0.08] bg-white/[0.02] text-xs font-medium text-zinc-400">
                  <tr>
                    <th className="px-5 py-3">Gói dịch vụ</th>
                    <th className="px-4 py-3">Hạng gói</th>
                    <th className="px-4 py-3">Giá niêm yết</th>
                    <th className="px-4 py-3">Đang sử dụng</th>
                    <th className="px-4 py-3">Đơn thành công / Tổng</th>
                    <th className="px-4 py-3">Doanh thu</th>
                    <th className="px-5 py-3 min-w-[140px]">Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {(!revenueStats?.byPackage || revenueStats.byPackage.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-500">
                        Chưa có dữ liệu doanh thu theo gói dịch vụ.
                      </td>
                    </tr>
                  ) : (
                    revenueStats.byPackage.map((row) => (
                      <tr key={row.packageId} className="hover:bg-white/[0.02] transition">
                        <td className="px-5 py-3 font-semibold text-white">
                          {row.packageName}
                          <span
                            className={`ml-2 text-[11px] font-medium px-1.5 py-0.5 rounded ${
                              row.packageStatus === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-zinc-700/40 text-zinc-400"
                            }`}
                          >
                            {row.packageStatus === "ACTIVE" ? "Đang bán" : "Tạm ẩn"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-amber-300">{getTierLabel(row.tierId)}</td>
                        <td className="px-4 py-3 font-mono text-zinc-300 tabular-nums">{formatVND(row.packagePrice)}</td>
                        <td className="px-4 py-3 font-mono text-sky-300 font-bold tabular-nums">{row.activeSubscriptions}</td>
                        <td className="px-4 py-3 font-mono text-zinc-300 tabular-nums">
                          <span className="text-emerald-400 font-bold">{row.successCount}</span> / {row.totalCount}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-white tabular-nums">{formatVND(row.revenue)}</td>
                        <td className="px-5 py-3 font-mono tabular-nums">
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
                <tfoot className="border-t border-white/10 bg-[#171923]/70 font-mono text-xs tabular-nums">
                  <tr>
                    <td colSpan={3} className="px-5 py-3 font-sans font-bold text-zinc-300">Tổng cộng</td>
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
                  <thead className="border-b border-white/[0.08] bg-[#171923] sticky top-0 text-xs font-medium text-zinc-400">
                    <tr>
                      <th className="px-5 py-3">Ngày</th>
                      <th className="px-4 py-3">Thành công</th>
                      <th className="px-4 py-3">Đang chờ</th>
                      <th className="px-4 py-3">Thất bại / Hủy</th>
                      <th className="px-4 py-3">Hoàn tiền</th>
                      <th className="px-5 py-3 text-right">Doanh thu ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] font-mono tabular-nums">
                    {dailyRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center font-sans text-zinc-500">
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
                <thead className="border-b border-white/[0.08] bg-white/[0.02] text-xs font-medium text-zinc-400">
                  <tr>
                    <th className="px-5 py-3">Cổng thanh toán</th>
                    <th className="px-4 py-3">Phương thức</th>
                    <th className="px-4 py-3">Đơn thành công / Tổng</th>
                    <th className="px-4 py-3">Doanh thu</th>
                    <th className="px-5 py-3 min-w-[140px]">Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] font-mono tabular-nums">
                  {(!revenueStats?.byProvider || revenueStats.byProvider.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center font-sans text-zinc-500">
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
              <span className="text-xs text-zinc-400">Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setTxPage(1);
                }}
                className="rounded-xl border border-white/[0.08] bg-[#12141c] px-3 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả ({transactions.length})</option>
                <option value="SUCCESS">Thành công</option>
                <option value="PENDING">Đang chờ</option>
                <option value="FAILED">Thất bại</option>
                <option value="CANCELLED">Đã hủy</option>
                <option value="REFUNDED">Đã hoàn tiền</option>
              </select>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300 font-semibold tabular-nums">
                Tổng thu: {formatVND(totalRevenue)}
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#12141c] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-white/80">
                <thead className="border-b border-white/[0.08] bg-white/[0.02] text-xs font-medium text-zinc-400">
                  <tr>
                    <th className="px-5 py-3.5">Mã giao dịch</th>
                    <th className="px-5 py-3.5">Khách hàng</th>
                    <th className="px-5 py-3.5">Gói dịch vụ</th>
                    <th className="px-5 py-3.5">Số tiền</th>
                    <th className="px-5 py-3.5">Cổng thanh toán</th>
                    <th className="px-5 py-3.5">Thời gian</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5 text-right">Phương thức</th>
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
          <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="font-graphik text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#ff5500]" />
                  Hạng gói dịch vụ
                </h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Cấu hình các mức quyền lợi áp dụng cho tài khoản người dùng và từng gói dịch vụ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTierError("");
                  setCreateTierDraft({
                    name: "",
                    description: "",
                    entitlements: {
                      adPolicy: "NO_ADS",
                      adFreeDailyLimit: 0,
                      skipPolicy: "UNLIMITED",
                      skipDailyLimit: 0,
                      offlineAllowed: true,
                      offlineMaxTracks: 100,
                      maxDevices: 1,
                    },
                  });
                  setIsCreateTierModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#ff5500] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#ff5500]/25 hover:bg-[#ff6a1a] active:scale-[0.98] transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" /> Thêm hạng gói mới
              </button>
            </div>

            {/* Grid of Tiers */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {tiersLoading && <p role="status" className="text-sm text-zinc-400">Đang tải danh sách hạng gói…</p>}
              {tierError && <p role="alert" className="text-sm text-rose-300">{tierError}</p>}
              {!tiersLoading && !tierError && tiers.length === 0 && <p className="text-sm text-zinc-400">Chưa có hạng gói nào.</p>}
              {tiers.map((tier) => {
                const linkedCount = packages.filter((p) => p.tierId === tier.id).length;
                const isFree = tier.id === "FREE";
                return (
                <div
                  key={tier.id}
                  className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#171923] p-5 shadow-lg hover:border-[#ff5500]/40 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full truncate">
                        {isFree ? "Mặc định" : tier.id.startsWith("CUSTOM_") ? "Tùy chỉnh riêng" : "Hạng trả phí"}
                      </span>
                      <span className="text-xs text-zinc-400 tabular-nums shrink-0">
                        {linkedCount} gói
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

                    {/* Matrix Specs — 4 real business entitlements + bundled VIP UI */}
                    <div className="space-y-2 pt-2 border-t border-white/5 text-xs tabular-nums">
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Quảng cáo:</span>
                        <span className={tier.adPolicy === "NO_ADS" ? "text-emerald-400 font-semibold" : tier.adPolicy === "DAILY_QUOTA" ? "text-amber-300 font-semibold" : "text-zinc-400"}>
                          {tier.adPolicy === "NO_ADS" ? "Không quảng cáo" : tier.adPolicy === "DAILY_QUOTA" ? `${tier.adFreeDailyLimit} bài/ngày không QC` : "Có quảng cáo"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Chuyển bài:</span>
                        <span className={tier.skipPolicy === "UNLIMITED" ? "text-sky-300 font-semibold" : "text-zinc-400"}>
                          {tier.skipPolicy === "UNLIMITED" ? "Không giới hạn" : `${tier.skipDailyLimit} lần/ngày`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Tải ngoại tuyến:</span>
                        <span className={tier.offlineAllowed ? "text-teal-300" : "text-zinc-500"}>
                          {tier.offlineAllowed ? `${tier.offlineMaxTracks >= 9999 ? "Không giới hạn" : `${tier.offlineMaxTracks} bài`}` : "Không hỗ trợ"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Số thiết bị:</span>
                        <span className="text-white font-bold">{tier.maxDevices} máy</span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Giao diện VIP:</span>
                        <span className={isFree ? "text-zinc-500" : "text-yellow-300 font-semibold"}>
                          {isFree ? "Không áp dụng" : "Tự động kèm gói"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTierError("");
                        setEditingTier(tier);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#222432]/50 hover:bg-[#ff5500]/15 hover:border-[#ff5500]/50 py-2 text-xs font-semibold text-white transition active:scale-[0.98] cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#ff5500]" /> Chỉnh sửa quyền lợi
                    </button>
                    {!isFree && linkedCount === 0 && (
                      <button
                        type="button"
                        onClick={() => setTierToDelete(tier)}
                        title="Xóa hạng gói chưa sử dụng"
                        className="p-2 rounded-xl border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: USER SUBSCRIPTIONS */}
      {activeSubTab === "subscriptions" && (
        <div className="space-y-4 anim-fade-up">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#12141c] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Tìm theo người dùng, email, tên gói..."
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0e1017] pl-10 pr-4 py-2 text-xs text-white placeholder-white/30 focus:border-[#ff5500] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50">Trạng thái:</span>
              <select
                value={subStatusFilter}
                onChange={(e) => setSubStatusFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#0e1017] px-3 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả ({subscriptions?.length || 0})</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="EXPIRED">Đã hết hạn</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12141c] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-zinc-400 font-medium">
                    <th className="px-5 py-3.5">Mã</th>
                    <th className="px-5 py-3.5">Người dùng</th>
                    <th className="px-5 py-3.5">Gói đăng ký</th>
                    <th className="px-5 py-3.5">Hạng gói</th>
                    <th className="px-5 py-3.5">Thời hạn</th>
                    <th className="px-5 py-3.5">Gia hạn tự động</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
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
                      const isPending = sub.status === "PENDING";
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
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] text-amber-300">
                              <Crown className="h-3 w-3" /> {sub.tierName || getTierLabel(sub.tierId, tiers)}
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
                            {isPending && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber-300">
                                <Clock className="h-3 w-3" /> Chờ thanh toán
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
                            {(isActive || isPending) && (
                              <button
                                type="button"
                                onClick={() => setSelectedSubForCancel(sub)}
                                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                              >
                                Hủy gói
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

      {/* MODAL: CREATE SUBSCRIPTION TIER */}
      {isCreateTierModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0e111a] p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-graphik text-xl font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#ff5500]" />
                    Tạo hạng gói mới
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Định nghĩa tập quyền lợi tùy chỉnh để dùng chung cho một hoặc nhiều gói dịch vụ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateTierModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Tên hạng gói</label>
                    <input
                      type="text"
                      value={createTierDraft.name}
                      onChange={(e) => setCreateTierDraft({ ...createTierDraft, name: e.target.value })}
                      placeholder="Ví dụ: Cá nhân Tiêu chuẩn"
                      className="w-full rounded-xl border border-white/[0.08] bg-[#171923] px-3 py-2 text-white outline-none focus:border-[#ff5500]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Mô tả tóm tắt</label>
                    <input
                      type="text"
                      value={createTierDraft.description}
                      onChange={(e) => setCreateTierDraft({ ...createTierDraft, description: e.target.value })}
                      placeholder="Ví dụ: Không quảng cáo, dùng trên 2 thiết bị"
                      className="w-full rounded-xl border border-white/[0.08] bg-[#171923] px-3 py-2 text-white outline-none focus:border-[#ff5500]"
                    />
                  </div>
                </div>

                <EntitlementEditorFields
                  value={createTierDraft.entitlements}
                  onChange={(next) => setCreateTierDraft({ ...createTierDraft, entitlements: next })}
                  isFree={false}
                />
              </div>

              {tierError && (
                <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {tierError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateTierModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={tierSaving}
                  onClick={async () => {
                    const cleanName = createTierDraft.name.trim();
                    if (!cleanName) {
                      setTierError("Vui lòng nhập tên hạng gói.");
                      return;
                    }
                    const validationMsg = validateEntitlementValues(createTierDraft.entitlements);
                    if (validationMsg) {
                      setTierError(validationMsg);
                      return;
                    }
                    setTierSaving(true);
                    setTierError("");
                    try {
                      await createAdminSubscriptionTier({
                        name: cleanName,
                        description: createTierDraft.description.trim(),
                        ...normalizeEntitlementPayload(createTierDraft.entitlements, false),
                      });
                      const res = await fetchAdminSubscriptionTiers();
                      if (Array.isArray(res)) setTiers(res);
                      await onTiersChanged?.();
                      onToast?.(`Đã tạo hạng gói "${cleanName}".`, "success");
                      setIsCreateTierModalOpen(false);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : "Lỗi khi tạo hạng gói.";
                      setTierError(msg);
                      onToast?.(msg, "error");
                    } finally {
                      setTierSaving(false);
                    }
                  }}
                  className="rounded-full bg-[#ff5500] px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-[#ff5500]/25 hover:bg-[#ff6a1a] transition cursor-pointer disabled:opacity-50"
                >
                  {tierSaving ? "Đang tạo..." : "Tạo hạng gói"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
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
                    Chỉnh sửa hạng gói: {editingTier.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Các gói gắn hạng gói này sẽ áp dụng quyền lợi mới ngay lập tức
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

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Tên hạng gói</label>
                    <input
                      type="text"
                      value={editingTier.name}
                      onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#171923] px-3 py-2 text-white outline-none focus:border-[#ff5500]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Mô tả tóm tắt</label>
                    <input
                      type="text"
                      value={editingTier.description || ""}
                      onChange={(e) => setEditingTier({ ...editingTier, description: e.target.value })}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#171923] px-3 py-2 text-white outline-none focus:border-[#ff5500]"
                    />
                  </div>
                </div>

                <EntitlementEditorFields
                  value={{
                    adPolicy: editingTier.adPolicy,
                    adFreeDailyLimit: editingTier.adFreeDailyLimit,
                    skipPolicy: editingTier.skipPolicy,
                    skipDailyLimit: editingTier.skipDailyLimit,
                    offlineAllowed: editingTier.offlineAllowed,
                    offlineMaxTracks: editingTier.offlineMaxTracks,
                    maxDevices: editingTier.maxDevices,
                  }}
                  onChange={(next) => setEditingTier({ ...editingTier, ...next })}
                  isFree={editingTier.id === "FREE"}
                />
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
                  className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={tierSaving}
                  onClick={async () => {
                    const cleanName = editingTier.name.trim();
                    if (!cleanName) {
                      setTierError("Tên hạng gói không được để trống.");
                      return;
                    }
                    const validationMsg = validateEntitlementValues({
                      adPolicy: editingTier.adPolicy,
                      adFreeDailyLimit: editingTier.adFreeDailyLimit,
                      skipPolicy: editingTier.skipPolicy,
                      skipDailyLimit: editingTier.skipDailyLimit,
                      offlineAllowed: editingTier.offlineAllowed,
                      offlineMaxTracks: editingTier.offlineMaxTracks,
                      maxDevices: editingTier.maxDevices,
                    });
                    if (validationMsg) {
                      setTierError(validationMsg);
                      return;
                    }
                    setTierSaving(true);
                    setTierError("");
                    try {
                      const isFree = editingTier.id === "FREE";
                      await updateAdminSubscriptionTier(editingTier.id, {
                        name: cleanName,
                        description: (editingTier.description || "").trim(),
                        ...normalizeEntitlementPayload(
                          {
                            adPolicy: editingTier.adPolicy,
                            adFreeDailyLimit: editingTier.adFreeDailyLimit,
                            skipPolicy: editingTier.skipPolicy,
                            skipDailyLimit: editingTier.skipDailyLimit,
                            offlineAllowed: editingTier.offlineAllowed,
                            offlineMaxTracks: editingTier.offlineMaxTracks,
                            maxDevices: editingTier.maxDevices,
                          },
                          isFree
                        ),
                      });
                      const res = await fetchAdminSubscriptionTiers();
                      if (Array.isArray(res)) setTiers(res);
                      await onTiersChanged?.();
                      onToast?.(`Đã cập nhật quyền lợi hạng gói "${cleanName}".`, "success");
                      setEditingTier(null);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : "Lỗi khi lưu hạng gói.";
                      setTierError(msg);
                      onToast?.(msg, "error");
                    } finally {
                      setTierSaving(false);
                    }
                  }}
                  className="rounded-full bg-[#ff5500] px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-[#ff5500]/25 hover:bg-[#ff6a1a] transition cursor-pointer disabled:opacity-50"
                >
                  {tierSaving ? "Đang lưu..." : "Lưu quyền lợi"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* CONFIRMATION MODAL: DELETE SUBSCRIPTION TIER */}
      {tierToDelete && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0e111a] p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <Trash2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Xóa hạng gói</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Bạn có chắc chắn muốn xóa hạng gói <strong className="text-white">{tierToDelete.name}</strong>? Hạng gói chưa gắn với gói dịch vụ nào sẽ bị xóa khỏi danh sách.
              </p>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setTierToDelete(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={tierSaving}
                  onClick={async () => {
                    const target = tierToDelete;
                    setTierSaving(true);
                    try {
                      await deleteAdminSubscriptionTier(target.id);
                      const res = await fetchAdminSubscriptionTiers();
                      if (Array.isArray(res)) setTiers(res);
                      await onTiersChanged?.();
                      onToast?.(`Đã xóa hạng gói "${target.name}".`, "success");
                      setTierToDelete(null);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : "Không thể xóa hạng gói.";
                      onToast?.(msg, "error");
                    } finally {
                      setTierSaving(false);
                    }
                  }}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition cursor-pointer disabled:opacity-50"
                >
                  {tierSaving ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* UNIFIED MODAL: CREATE OR EDIT SERVICE PACKAGE */}
      {(editingPackage || isCreateModalOpen) && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#0e111a] p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-graphik text-xl font-bold text-white">
                    {editingPackage ? "Chỉnh sửa gói dịch vụ" : "Tạo gói dịch vụ mới"}
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    {editingPackage
                      ? `Mã gói: #${editingPackage.id} · Cập nhật thông tin bán hàng và quyền lợi`
                      : "Thêm gói dịch vụ mới và cấu hình quyền lợi áp dụng cho người mua"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPackage(null);
                    setIsCreateModalOpen(false);
                    setPackageModalError("");
                  }}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs text-white/70 mb-2 font-semibold">
                    Tên gói dịch vụ
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: Gói Cá nhân 3 tháng"
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-4 py-2.5 text-sm text-white focus:border-[#ff5500] focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/70 mb-2 font-semibold">
                    Đơn giá (VNĐ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-4 py-2.5 font-mono text-sm text-emerald-400 font-bold tabular-nums focus:border-[#ff5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/70 mb-2 font-semibold">
                    Chu kỳ gói dịch vụ
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={[30, 90, 180, 365].includes(formData.durationDays) ? formData.durationDays : "custom"}
                      onChange={(e) => {
                        if (e.target.value !== "custom") {
                          setFormData({ ...formData, durationDays: Number(e.target.value) });
                        }
                      }}
                      className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-3 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none cursor-pointer"
                    >
                      <option value={30} className="bg-[#12131a]">1 tháng (30 ngày)</option>
                      <option value={90} className="bg-[#12131a]">3 tháng (90 ngày)</option>
                      <option value={180} className="bg-[#12131a]">6 tháng (180 ngày)</option>
                      <option value={365} className="bg-[#12131a]">1 năm (365 ngày)</option>
                      <option value="custom" className="bg-[#12131a]">Tùy chỉnh số ngày...</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      value={formData.durationDays}
                      onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                      placeholder="Số ngày..."
                      className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-4 py-2 text-xs font-mono tabular-nums text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/70 mb-2 font-semibold">
                      Thứ tự hiển thị
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.displayOrder}
                      onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#12141c] px-4 py-2.5 font-mono tabular-nums text-sm text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/70 mb-2 font-semibold">
                      Trạng thái bán
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#12141c] px-3 py-2.5 text-xs text-white focus:border-[#ff5500] focus:outline-none cursor-pointer"
                    >
                      <option value="ACTIVE">Đang bán</option>
                      <option value="INACTIVE">Tạm ẩn</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2-mode Entitlement Selection: Shared Tier vs Custom Per-Package */}
              <div className="border-t border-white/10 pt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white">Cấu hình quyền lợi gói</span>
                  <div className="inline-flex rounded-xl border border-white/[0.08] bg-[#12141c] p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEntitlementMode("shared");
                        const nonCustomTiers = tiers.filter((t) => t.id !== "FREE" && (!t.id.startsWith("CUSTOM_") || t.id === formData.tierId));
                        const targetTierId = nonCustomTiers.find((t) => t.id === formData.tierId)?.id || nonCustomTiers[0]?.id || formData.tierId;
                        const newEnts = buildEntitlementsFromTier(targetTierId, tiers, formData.entitlements);
                        setFormData((prev) => ({
                          ...prev,
                          tierId: targetTierId,
                          entitlements: newEnts,
                          featureItems: generateBulletPointsFromEntitlements(newEnts),
                        }));
                      }}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer font-medium ${
                        entitlementMode === "shared" ? "bg-[#ff5500] text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Chọn hạng gói có sẵn
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntitlementMode("custom")}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer font-medium ${
                        entitlementMode === "custom" ? "bg-[#ff5500] text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Tùy chỉnh quyền lợi riêng
                    </button>
                  </div>
                </div>

                {entitlementMode === "shared" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-white/70 mb-2 font-semibold">
                        Hạng gói áp dụng
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
                        className="w-full rounded-xl border border-white/[0.08] bg-[#12141c] px-3 py-2.5 text-xs text-amber-300 font-semibold focus:border-[#ff5500] focus:outline-none cursor-pointer"
                      >
                        {tiers
                          .filter((t) => t.id !== "FREE" && (!t.id.startsWith("CUSTOM_") || t.id === formData.tierId))
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <TierInheritedPreview
                      tierId={formData.tierId}
                      tiers={tiers}
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
                        setIsCreateModalOpen(false);
                        setActiveSubTab("tiers");
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-white/[0.08] bg-[#12141c] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-zinc-400">
                        Tùy biến trực tiếp các quyền lợi thực tế riêng cho gói này.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            featureItems: generateBulletPointsFromEntitlements({
                              ...prev.entitlements,
                              tier: "CUSTOM",
                              vipBadge: true,
                            }),
                          }))
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ff5500]/40 bg-[#ff5500]/10 text-[#ff5500] hover:bg-[#ff5500]/20 text-xs font-semibold transition cursor-pointer"
                      >
                        <RefreshCcw className="w-3 h-3" /> Đồng bộ mô tả quyền lợi
                      </button>
                    </div>
                    <EntitlementEditorFields
                      value={{
                        adPolicy: formData.entitlements.adPolicy,
                        adFreeDailyLimit: formData.entitlements.adFreeDailyLimit,
                        skipPolicy: formData.entitlements.skipPolicy,
                        skipDailyLimit: formData.entitlements.skipDailyLimit,
                        offlineAllowed: formData.entitlements.offlineAllowed,
                        offlineMaxTracks: formData.entitlements.offlineMaxTracks,
                        maxDevices: formData.entitlements.maxDevices,
                      }}
                      onChange={(next) =>
                        setFormData((prev) => ({
                          ...prev,
                          entitlements: {
                            ...prev.entitlements,
                            ...next,
                            vipBadge: true,
                            syncedLyrics: true,
                          },
                        }))
                      }
                      isFree={false}
                    />
                  </div>
                )}
              </div>

              {/* Feature items editor */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs text-white/70 font-semibold">
                    Mô tả nổi bật hiển thị trên thẻ gói ({formData.featureItems.length})
                  </label>
                  <span className="text-[11px] text-zinc-400">Nhập thêm hoặc chọn gợi ý</span>
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
                    placeholder="Ví dụ: Nghe nhạc không quảng cáo..."
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
                    <Plus className="h-4 w-4" /> Thêm mô tả
                  </button>
                </div>

                <div className="mb-3">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) handleAddFeatureItem(e.target.value);
                    }}
                    className="w-full rounded-xl border border-[#222432] bg-[#12131a] px-3 py-2 text-xs text-zinc-400 outline-none focus:border-[#ff5500] cursor-pointer"
                  >
                    <option value="" className="bg-[#12131a]">-- Chọn nhanh mô tả mẫu để thêm --</option>
                    {POPULAR_BENEFITS.filter((item) => !formData.featureItems.includes(item)).map((item) => (
                      <option key={item} value={item} className="bg-[#12131a] text-white">
                        + {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-[#171822] border border-[#222432]">
                  {formData.featureItems.length === 0 ? (
                    <p className="py-4 text-center text-xs text-zinc-500 italic">
                      Chưa có dòng mô tả nào. Bấm &quot;Đồng bộ mô tả quyền lợi&quot; hoặc nhập ở trên.
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
                          title="Xóa dòng mô tả này"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {packageModalError && (
                <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {packageModalError}
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-[#222432] pt-4">
                {editingPackage ? (
                  <button
                    type="button"
                    disabled={packageSaving}
                    onClick={() => setPackageToDelete(editingPackage)}
                    className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xóa gói
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={packageSaving}
                    onClick={() => {
                      setEditingPackage(null);
                      setIsCreateModalOpen(false);
                      setPackageModalError("");
                    }}
                    className="rounded-full border border-[#222432] px-5 py-2.5 text-sm font-semibold text-zinc-400 hover:bg-[#171822] transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={packageSaving}
                    onClick={() => void handleSavePackageModal()}
                    className="rounded-full bg-[#ff5500] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff5500]/25 hover:bg-[#ff6a1a] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                  >
                    {packageSaving ? "Đang lưu..." : editingPackage ? "Lưu thay đổi" : "Tạo gói dịch vụ"}
                  </button>
                </div>
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
                <h3 className="font-graphik text-lg font-bold text-white">Xác nhận hủy gói thuê bao</h3>
              </div>

              <p className="text-sm text-white/70 leading-relaxed">
                Bạn có chắc chắn muốn hủy gói dịch vụ <strong className="text-white font-semibold">{selectedSubForCancel.packageName}</strong> của người dùng{" "}
                <strong className="text-white">{selectedSubForCancel.userName || selectedSubForCancel.userEmail}</strong>?
                Sau khi hủy, gói sẽ ngừng hiệu lực và tài khoản sẽ chuyển về gói Miễn phí.
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
                  Xác nhận hủy gói
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
                  <h3 className="text-lg font-bold text-white">Xác nhận xóa gói dịch vụ</h3>
                  <p className="text-xs text-rose-400/80">Chỉ xóa được gói chưa phát sinh giao dịch</p>
                </div>
              </div>

              <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
                Bạn có chắc chắn muốn xóa gói <strong className="text-white">&quot;{packageToDelete.name}&quot;</strong> (giá {formatVND(packageToDelete.price)})?
                Nếu gói đã phát sinh giao dịch thanh toán hoặc còn người đang sử dụng, hệ thống sẽ giữ lại dữ liệu và bạn nên chuyển gói sang Tạm ẩn.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setPackageToDelete(null)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition"
                >
                  Hủy
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
                  <Trash2 className="h-4 w-4" /> Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
