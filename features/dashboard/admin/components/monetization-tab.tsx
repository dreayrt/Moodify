"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Edit2,
  Filter,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  Settings2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingUp,
  Users,
  X,
  XCircle,
  Crown,
  Download,
  Headphones,
  Radio,
  ShieldCheck,
  SkipForward,
  Sliders,
  Smartphone,
} from "lucide-react";
import { PaymentTransaction, ServicePackage, PackageEntitlements } from "../types";
import { AdminPagination } from "./shared/admin-pagination";
import { ModalPortal } from "./shared/modal-portal";

type MonetizationTabProps = {
  packages: ServicePackage[];
  transactions: PaymentTransaction[];
  onTogglePackageStatus: (packageId: number) => void;
  onUpdatePackagePrice: (packageId: number, newPrice: number) => void;
  onCreatePackage?: (data: Partial<ServicePackage>) => void;
  onUpdatePackageDetails?: (packageId: number, data: Partial<ServicePackage>) => void;
  onDeletePackage?: (packageId: number) => void;
  onRefundTransaction: (transactionId: number) => void;
};

export function getEffectiveEntitlements(pkg: ServicePackage): PackageEntitlements {
  if (pkg.featuresJson) {
    try {
      const parsed = JSON.parse(pkg.featuresJson);
      if (parsed && typeof parsed === "object") {
        return {
          tier: parsed.tier,
          adPolicy: parsed.adPolicy || "DAILY_QUOTA",
          adFreeDailyLimit: parsed.adFreeDailyLimit ?? 15,
          adIntervalAfterLimit: parsed.adIntervalAfterLimit ?? 7,
          skipPolicy: parsed.skipPolicy || "LIMITED",
          skipDailyLimit: parsed.skipDailyLimit ?? 30,
          audioQuality: parsed.audioQuality || "HQ_320",
          offlineAllowed: parsed.offlineAllowed ?? true,
          offlineMaxTracks: parsed.offlineMaxTracks ?? 50,
          maxDevices: parsed.maxDevices ?? 1,
          syncedLyrics: parsed.syncedLyrics ?? true,
          vipBadge: parsed.vipBadge ?? true,
          customThemes: parsed.customThemes ?? false,
          familySharing: parsed.familySharing ?? false,
          familyMembers: parsed.familyMembers ?? 1,
        };
      }
    } catch (_) {}
  }

  const name = pkg.name.toLowerCase();
  if (name.includes("gia đình") || name.includes("family")) {
    return {
      tier: "FAMILY",
      adPolicy: "NO_ADS",
      adFreeDailyLimit: 9999,
      adIntervalAfterLimit: 0,
      skipPolicy: "UNLIMITED",
      skipDailyLimit: 9999,
      audioQuality: "LOSSLESS_FLAC",
      offlineAllowed: true,
      offlineMaxTracks: 9999,
      maxDevices: 6,
      syncedLyrics: true,
      vipBadge: true,
      customThemes: true,
      familySharing: true,
      familyMembers: 6,
    };
  }
  if (name.includes("full") || name.includes("không giới hạn")) {
    return {
      tier: "INDIVIDUAL_FULL",
      adPolicy: "NO_ADS",
      adFreeDailyLimit: 9999,
      adIntervalAfterLimit: 0,
      skipPolicy: "UNLIMITED",
      skipDailyLimit: 9999,
      audioQuality: "LOSSLESS_FLAC",
      offlineAllowed: true,
      offlineMaxTracks: 9999,
      maxDevices: 1,
      syncedLyrics: true,
      vipBadge: true,
      customThemes: true,
      familySharing: false,
      familyMembers: 1,
    };
  }
  return {
    tier: "INDIVIDUAL_BASIC",
    adPolicy: "DAILY_QUOTA",
    adFreeDailyLimit: 15,
    adIntervalAfterLimit: 7,
    skipPolicy: "LIMITED",
    skipDailyLimit: 30,
    audioQuality: "HQ_320",
    offlineAllowed: true,
    offlineMaxTracks: 50,
    maxDevices: 1,
    syncedLyrics: true,
    vipBadge: true,
    customThemes: false,
    familySharing: false,
    familyMembers: 1,
  };
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

  if (ent.audioQuality === "LOSSLESS_FLAC") {
    bullets.push("Âm thanh Hi-Res FLAC 24-bit/96kHz Studio Master");
  } else if (ent.audioQuality === "HQ_320") {
    bullets.push("Chất lượng âm thanh Lossless 320kbps");
  } else {
    bullets.push("Âm thanh tiêu chuẩn Standard 128kbps");
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
    bullets.push("Huy hiệu VIP và chủ đề phát nhạc độc quyền");
  }

  return bullets;
}

const POPULAR_BENEFITS = [
  "Chất lượng âm thanh Lossless 320kbps",
  "Nghe nhạc không quảng cáo ngắt quãng",
  "Tải offline không giới hạn trên 3 thiết bị",
  "Chuyển bài không giới hạn (Unlimited Skips)",
  "Âm thanh chuẩn phòng thu Studio Master (Lossless)",
  "Lời bài hát Karaoke đồng bộ thời gian thực",
  "Âm thanh Hi-Res FLAC 24-bit/96kHz",
  "Huy hiệu VIP thành viên trên hồ sơ",
];

function EntitlementsEditor({
  entitlements,
  onChange,
  onSyncToBullets,
}: {
  entitlements: PackageEntitlements;
  onChange: (updated: PackageEntitlements) => void;
  onSyncToBullets: () => void;
}) {
  return (
    <div className="border-t border-white/10 pt-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-white flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#ff5500]" />
            Cấu Hình Chi Tiết Quyền Lợi &amp; Giới Hạn Gói Cước
          </h4>
          <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
            Cấu hình trực tiếp logic quảng cáo, hạn mức skip và chất lượng nhạc
          </p>
        </div>
        <button
          type="button"
          onClick={onSyncToBullets}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ff5500]/40 bg-[#ff5500]/10 text-[#ff5500] hover:bg-[#ff5500]/20 text-xs font-mono font-semibold transition active:scale-[0.98] cursor-pointer"
          title="Tự động đồng bộ các quyền này thành danh sách gạch đầu dòng giới thiệu cho người dùng"
        >
          <RefreshCcw className="w-3 h-3" /> Tự động tạo gạch đầu dòng
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. Ad Policy */}
        <div className="p-3 rounded-xl bg-[#12131a] border border-[#222432] space-y-2">
          <label className="text-[11px] font-mono font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3 h-3" /> Quảng Cáo (Ad Engine)
          </label>
          <select
            value={entitlements.adPolicy}
            onChange={(e) =>
              onChange({
                ...entitlements,
                adPolicy: e.target.value as "NO_ADS" | "DAILY_QUOTA" | "FULL_ADS",
              })
            }
            className="w-full rounded-lg border border-[#222432] bg-[#171822] px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-[#ff5500]"
          >
            <option value="NO_ADS">100% Không quảng cáo (FULL / Gia Đình)</option>
            <option value="DAILY_QUOTA">Hạn ngạch ngày (Gói Tiết Kiệm - 15 bài đầu)</option>
            <option value="FULL_ADS">Quảng cáo tiêu chuẩn (1-3 bài/QC)</option>
          </select>

          {entitlements.adPolicy === "DAILY_QUOTA" && (
            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-white/5">
              <div>
                <span className="block text-[10px] font-mono text-zinc-400 mb-1">Bài/ngày ko QC</span>
                <input
                  type="number"
                  min={1}
                  value={entitlements.adFreeDailyLimit}
                  onChange={(e) =>
                    onChange({
                      ...entitlements,
                      adFreeDailyLimit: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="w-full rounded-md border border-[#222432] bg-[#171822] px-2 py-1 text-xs font-mono text-amber-300 font-bold focus:border-[#ff5500] outline-none"
                />
              </div>
              <div>
                <span className="block text-[10px] font-mono text-zinc-400 mb-1">Sau đó 1 QC /</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    value={entitlements.adIntervalAfterLimit}
                    onChange={(e) =>
                      onChange({
                        ...entitlements,
                        adIntervalAfterLimit: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="w-full rounded-md border border-[#222432] bg-[#171822] px-2 py-1 text-xs font-mono text-white focus:border-[#ff5500] outline-none"
                  />
                  <span className="text-[10px] text-zinc-400 font-mono">bài</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Skip Policy */}
        <div className="p-3 rounded-xl bg-[#12131a] border border-[#222432] space-y-2">
          <label className="text-[11px] font-mono font-semibold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
            <SkipForward className="w-3 h-3" /> Lượt Chuyển Bài (Skip)
          </label>
          <select
            value={entitlements.skipPolicy}
            onChange={(e) =>
              onChange({
                ...entitlements,
                skipPolicy: e.target.value as "UNLIMITED" | "LIMITED",
              })
            }
            className="w-full rounded-lg border border-[#222432] bg-[#171822] px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-[#ff5500]"
          >
            <option value="UNLIMITED">Chuyển bài vô hạn (Unlimited Skips)</option>
            <option value="LIMITED">Giới hạn lượt/ngày (Gói Tiết Kiệm: 30 lượt)</option>
          </select>

          {entitlements.skipPolicy === "LIMITED" && (
            <div className="pt-1.5 border-t border-white/5">
              <span className="block text-[10px] font-mono text-zinc-400 mb-1">Số lượt chuyển bài thủ công/ngày</span>
              <input
                type="number"
                min={1}
                value={entitlements.skipDailyLimit}
                onChange={(e) =>
                  onChange({
                    ...entitlements,
                    skipDailyLimit: Math.max(1, Number(e.target.value)),
                  })
                }
                className="w-full rounded-md border border-[#222432] bg-[#171822] px-2 py-1 text-xs font-mono text-sky-300 font-bold focus:border-[#ff5500] outline-none"
              />
            </div>
          )}
        </div>

        {/* 3. Audio Quality */}
        <div className="p-3 rounded-xl bg-[#12131a] border border-[#222432] space-y-2">
          <label className="text-[11px] font-mono font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
            <Headphones className="w-3 h-3" /> Chất Lượng Streaming
          </label>
          <select
            value={entitlements.audioQuality}
            onChange={(e) =>
              onChange({
                ...entitlements,
                audioQuality: e.target.value as "STANDARD_128" | "HQ_320" | "LOSSLESS_FLAC",
              })
            }
            className="w-full rounded-lg border border-[#222432] bg-[#171822] px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-[#ff5500]"
          >
            <option value="STANDARD_128">Standard 128kbps (Tiêu chuẩn)</option>
            <option value="HQ_320">Lossless 320kbps (Chất lượng cao VIP)</option>
            <option value="LOSSLESS_FLAC">Hi-Res FLAC 24-bit Studio Master</option>
          </select>
        </div>

        {/* 4. Offline Downloads */}
        <div className="p-3 rounded-xl bg-[#12131a] border border-[#222432] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono font-semibold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-3 h-3" /> Tải Nhạc Offline
            </label>
            <input
              type="checkbox"
              checked={entitlements.offlineAllowed}
              onChange={(e) =>
                onChange({
                  ...entitlements,
                  offlineAllowed: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#ff5500] cursor-pointer"
            />
          </div>

          {entitlements.offlineAllowed ? (
            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-white/5">
              <div>
                <span className="block text-[10px] font-mono text-zinc-400 mb-1">Số bài tối đa</span>
                <select
                  value={entitlements.offlineMaxTracks}
                  onChange={(e) =>
                    onChange({
                      ...entitlements,
                      offlineMaxTracks: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-[#222432] bg-[#171822] px-2 py-1 text-xs font-mono text-white outline-none"
                >
                  <option value={50}>50 bài (Tiết Kiệm)</option>
                  <option value={100}>100 bài</option>
                  <option value={500}>500 bài</option>
                  <option value={9999}>Không giới hạn (FULL)</option>
                </select>
              </div>
              <div>
                <span className="block text-[10px] font-mono text-zinc-400 mb-1">Số thiết bị</span>
                <select
                  value={entitlements.maxDevices}
                  onChange={(e) =>
                    onChange({
                      ...entitlements,
                      maxDevices: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-[#222432] bg-[#171822] px-2 py-1 text-xs font-mono text-white outline-none"
                >
                  <option value={1}>1 máy (Cá nhân)</option>
                  <option value={3}>3 máy</option>
                  <option value={6}>6 máy (Gia đình)</option>
                </select>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-zinc-500 font-mono italic">
              Không cho phép tải nhạc ngoại tuyến.
            </p>
          )}
        </div>
      </div>

      {/* 5. Special Perks */}
      <div className="p-3 rounded-xl bg-[#12131a] border border-[#222432]">
        <span className="block text-[11px] font-mono font-semibold text-purple-300 uppercase tracking-wider mb-2">
          Đặc Quyền Bổ Sung &amp; Nhận Diện
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-white/90">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={entitlements.syncedLyrics}
              onChange={(e) =>
                onChange({ ...entitlements, syncedLyrics: e.target.checked })
              }
              className="rounded border-zinc-700 bg-zinc-900 text-[#ff5500]"
            />
            <span>Karaoke Lyrics</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={entitlements.vipBadge}
              onChange={(e) =>
                onChange({ ...entitlements, vipBadge: e.target.checked })
              }
              className="rounded border-zinc-700 bg-zinc-900 text-[#ff5500]"
            />
            <span>Huy Hiệu VIP</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={entitlements.customThemes}
              onChange={(e) =>
                onChange({ ...entitlements, customThemes: e.target.checked })
              }
              className="rounded border-zinc-700 bg-zinc-900 text-[#ff5500]"
            />
            <span>Theme VIP Player</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={entitlements.familySharing}
              onChange={(e) =>
                onChange({
                  ...entitlements,
                  familySharing: e.target.checked,
                  maxDevices: e.target.checked ? 6 : entitlements.maxDevices,
                  familyMembers: e.target.checked ? 6 : 1,
                })
              }
              className="rounded border-zinc-700 bg-zinc-900 text-[#ff5500]"
            />
            <span>Gia Đình (6 tài khoản)</span>
          </label>
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
  onRefundTransaction,
}: MonetizationTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"packages" | "transactions">("packages");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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
    description: "",
    featureItems: [] as string[],
    entitlements: {
      adPolicy: "DAILY_QUOTA",
      adFreeDailyLimit: 15,
      adIntervalAfterLimit: 7,
      skipPolicy: "LIMITED",
      skipDailyLimit: 30,
      audioQuality: "HQ_320",
      offlineAllowed: true,
      offlineMaxTracks: 50,
      maxDevices: 1,
      syncedLyrics: true,
      vipBadge: true,
      customThemes: false,
      familySharing: false,
      familyMembers: 1,
    } as PackageEntitlements,
  });

  const [newFeatureInput, setNewFeatureInput] = useState("");
  const [selectedTxForRefund, setSelectedTxForRefund] = useState<PaymentTransaction | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<ServicePackage | null>(null);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const totalRevenue = transactions
    .filter((t) => t.status === "SUCCESS")
    .reduce((sum, t) => sum + t.amount, 0);

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
    const ents = getEffectiveEntitlements(pkg);
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      price: pkg.price,
      durationDays: pkg.durationDays,
      displayOrder: pkg.displayOrder,
      status: pkg.status,
      description: pkg.description,
      featureItems: features.length > 0 ? features : generateBulletPointsFromEntitlements(ents),
      entitlements: ents,
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
      audioQuality: "HQ_320",
      offlineAllowed: true,
      offlineMaxTracks: 50,
      maxDevices: 1,
      syncedLyrics: true,
      vipBadge: true,
      customThemes: false,
      familySharing: false,
      familyMembers: 1,
    };
    setFormData({
      name: "Moodify VIP Mới",
      price: 59000,
      durationDays: 30,
      displayOrder: packages.length + 1,
      status: "ACTIVE",
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

  const handleSaveEditPackage = () => {
    if (!editingPackage) return;
    const serializedDesc = formData.featureItems.join("\n• ");
    const finalDesc = serializedDesc.startsWith("• ") ? serializedDesc : `• ${serializedDesc}`;
    const featuresJsonStr = JSON.stringify(formData.entitlements);

    if (onUpdatePackageDetails) {
      onUpdatePackageDetails(editingPackage.id, {
        name: formData.name,
        price: formData.price,
        durationDays: formData.durationDays,
        displayOrder: formData.displayOrder,
        status: formData.status,
        description: finalDesc,
        featuresJson: featuresJsonStr,
      });
    } else {
      onUpdatePackagePrice(editingPackage.id, formData.price);
    }
    setEditingPackage(null);
  };

  const handleSaveCreatePackage = () => {
    const serializedDesc = formData.featureItems.join("\n• ");
    const finalDesc = serializedDesc.startsWith("• ") ? serializedDesc : `• ${serializedDesc}`;
    const featuresJsonStr = JSON.stringify(formData.entitlements);

    if (onCreatePackage) {
      onCreatePackage({
        name: formData.name,
        price: formData.price,
        durationDays: formData.durationDays,
        displayOrder: formData.displayOrder,
        status: formData.status,
        description: finalDesc,
        featuresJson: featuresJsonStr,
      });
    }
    setIsCreateModalOpen(false);
  };

  const handleDeletePackage = (pkg: ServicePackage) => {
    setPackageToDelete(pkg);
  };

  const handleConfirmRefund = () => {
    if (!selectedTxForRefund) return;
    onRefundTransaction(selectedTxForRefund.id);
    setSelectedTxForRefund(null);
  };

  return (
    <div className="space-y-6 anim-fade-in">
      {/* Studio Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-graphik text-2xl font-bold text-white tracking-tight">
              Quản Lý Gói Dịch Vụ &amp; Doanh Thu
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Quản trị biểu giá dịch vụ thuê bao Moodify, thiết lập quyền lợi người dùng và đối soát giao dịch thanh toán.
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
              <Plus className="h-4 w-4" /> Thêm Gói Cước Mới
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
              onClick={() => setActiveSubTab("transactions")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeSubTab === "transactions"
                  ? "bg-[#ff5500] text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Receipt className="h-3.5 w-3.5" /> Lịch Sử Giao Dịch ({transactions.length})
            </button>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: PACKAGES GRID */}
      {activeSubTab === "packages" && (
        <div className="space-y-6 anim-fade-up">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {packages.map((pkg) => {
              const isActive = pkg.status === "ACTIVE";
              const features = parseDescriptionToFeatures(pkg.description);

              return (
                <div
                  key={pkg.id}
                  className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-[#12131a] p-5 shadow-xl transition hover:border-[#ff5500]/50 ${
                    isActive ? "border-[#222432]" : "border-rose-500/20 opacity-70"
                  }`}
                >
                  {/* Top info */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-zinc-400 font-semibold">
                          {pkg.durationDays} Ngày
                        </span>
                        <span className="font-mono text-xs text-zinc-500">
                          #{pkg.displayOrder}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onTogglePackageStatus(pkg.id)}
                        className="text-zinc-400 hover:text-white transition cursor-pointer"
                        title={isActive ? "Tạm ngưng cung cấp" : "Kích hoạt gói"}
                      >
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-rose-400"}`} />
                          <span className={isActive ? "text-zinc-300" : "text-rose-400"}>
                            {isActive ? "Hoạt động" : "Tạm dừng"}
                          </span>
                        </span>
                      </button>
                    </div>

                    <h3 className="mt-4 font-graphik text-xl font-bold text-white tracking-tight">
                      {pkg.name}
                    </h3>

                    {/* Price Tag */}
                    <div className="mt-2.5 flex items-baseline gap-1.5">
                      <span className="font-display text-2xl font-bold text-[#ff5500] tracking-tight">
                        {formatVND(pkg.price)}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        / {pkg.durationDays === 30 ? "tháng" : `${pkg.durationDays} ngày`}
                      </span>
                    </div>

                    {/* Active subscribers count badge */}
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#171822] border border-[#222432] px-3 py-1.5">
                      <Users className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="font-mono text-xs text-emerald-400 font-semibold">
                        {pkg.subscribersCount ?? 0}
                      </span>
                      <span className="text-xs text-zinc-400">thuê bao đang kích hoạt</span>
                    </div>

                    {/* Technical Entitlements Badges Matrix */}
                    {(() => {
                      const ent = getEffectiveEntitlements(pkg);
                      return (
                        <div className="mt-3 pt-3 border-t border-[#222432] flex flex-wrap gap-1.5">
                          {ent.adPolicy === "NO_ADS" ? (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3" /> 0% QC (24/7)
                            </span>
                          ) : ent.adPolicy === "DAILY_QUOTA" ? (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              <Radio className="w-3 h-3" /> {ent.adFreeDailyLimit} bài ko QC/ngày
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-500/10 border border-zinc-500/20">
                              QC chuẩn
                            </span>
                          )}

                          {ent.skipPolicy === "UNLIMITED" ? (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                              <SkipForward className="w-3 h-3" /> Skip vô hạn
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              <SkipForward className="w-3 h-3" /> {ent.skipDailyLimit} skips/ngày
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            <Headphones className="w-3 h-3" />
                            {ent.audioQuality === "LOSSLESS_FLAC"
                              ? "Hi-Res FLAC"
                              : ent.audioQuality === "HQ_320"
                              ? "Lossless 320k"
                              : "Standard 128k"}
                          </span>

                          {ent.offlineAllowed && (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                              <Download className="w-3 h-3" />
                              Offline ({ent.offlineMaxTracks >= 9999 ? "∞" : `${ent.offlineMaxTracks}`} bài, {ent.maxDevices} máy)
                            </span>
                          )}

                          {ent.familySharing && (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
                              <Crown className="w-3 h-3" /> Gia đình (6 tài khoản)
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Features list */}
                    <div className="mt-3.5 border-t border-[#222432] pt-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                          Quyền Lợi Gói ({features.length})
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(pkg)}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-[#ff5500] hover:underline"
                          title="Bấm để mở danh sách quyền lợi và thêm quyền lợi mới"
                        >
                          <Plus className="h-3 w-3" /> Thêm quyền lợi
                        </button>
                      </div>
                      {features.length > 0 ? (
                        features.slice(0, 4).map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                            <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#ff5500] mt-0.5" />
                            <span className="line-clamp-2">{feat}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-between py-1">
                          <p className="text-xs text-zinc-500 italic">Chưa có quyền lợi chi tiết.</p>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(pkg)}
                            className="text-xs font-semibold text-[#ff5500] hover:underline"
                          >
                            + Thiết lập ngay
                          </button>
                        </div>
                      )}
                      {features.length > 4 && (
                        <p className="font-mono text-[10px] text-zinc-500">
                          +{features.length - 4} đặc quyền khác... (bấm sửa để xem hết)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-6 border-t border-[#222432] pt-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(pkg)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 hover:border-[#ff5500]/40 transition"
                    >
                      <Settings2 className="h-3.5 w-3.5 text-[#ff5500]" /> Chỉnh Sửa Chi Tiết
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePackage(pkg)}
                      title="Xóa hoặc vô hiệu hóa gói cước này"
                      className="p-2 rounded-xl border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40 transition"
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
                <option value="REFUNDED">Đã hoàn tiền (REFUNDED)</option>
                <option value="PENDING">Đang chờ (PENDING)</option>
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
                    <th className="px-5 py-3.5 text-right">Thao Tác</th>
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
                            {tx.paidAt}
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
                            {!isSuccess && !isRefunded && (
                              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber-300">
                                <Clock className="h-3 w-3" /> {tx.status}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {isSuccess && (
                              <button
                                type="button"
                                onClick={() => setSelectedTxForRefund(tx)}
                                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                              >
                                Hoàn Tiền
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

              {/* Display Order & Status */}
              <div>
                <div className="grid grid-cols-2 gap-3">
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

            {/* Granular Entitlements Configuration Matrix */}
            <EntitlementsEditor
              entitlements={formData.entitlements}
              onChange={(ents) => setFormData((prev) => ({ ...prev, entitlements: ents }))}
              onSyncToBullets={() =>
                setFormData((prev) => ({
                  ...prev,
                  featureItems: generateBulletPointsFromEntitlements(prev.entitlements),
                }))
              }
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
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#ff5500]" /> {feat}
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

              <div>
                <div className="grid grid-cols-2 gap-3">
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
                      <option value="INACTIVE">INACTIVE (Tạm dừng)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Granular Entitlements Configuration Matrix */}
            <EntitlementsEditor
              entitlements={formData.entitlements}
              onChange={(ents) => setFormData((prev) => ({ ...prev, entitlements: ents }))}
              onSyncToBullets={() =>
                setFormData((prev) => ({
                  ...prev,
                  featureItems: generateBulletPointsFromEntitlements(prev.entitlements),
                }))
              }
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
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#ff5500]" /> {feat}
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

      {/* REFUND MODAL */}
      {selectedTxForRefund && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-rose-500/30 bg-[#0e111a] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 border border-rose-500/20">
                <RefreshCcw className="h-5 w-5" />
              </div>
              <h3 className="font-graphik text-lg font-bold text-white">Xác Nhận Hoàn Tiền</h3>
            </div>

            <p className="text-sm text-white/70 leading-relaxed">
              Bạn đang thực hiện hoàn trả số tiền{" "}
              <strong className="text-emerald-400 font-mono font-bold">
                {formatVND(selectedTxForRefund.amount)}
              </strong>{" "}
              cho giao dịch <strong className="text-white font-mono">{selectedTxForRefund.providerTransactionId}</strong> của người dùng{" "}
              <strong className="text-white">{selectedTxForRefund.userName}</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedTxForRefund(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/60 hover:bg-white/5"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                className="rounded-xl bg-rose-500 px-5 py-2 text-sm font-bold text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20"
              >
                Xác Nhận Hoàn Tiền
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
