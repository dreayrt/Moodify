"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgePercent,
  CheckCircle2,
  FolderTree,
  Loader2,
  Pencil,
  Plus,
  Radio,
  Trash2,
  Upload,
  Volume2,
  X,
  XCircle,
} from "lucide-react";

import {
  createAdminAd,
  createAdminAdCategory,
  deleteAdminAd,
  deleteAdminAdCategory,
  fetchAdminAdCategories,
  fetchAdminAds,
  toggleAdminAdStatus,
  updateAdminAd,
  uploadAdminAdAudio,
} from "@/lib/api/admin-client";
import { AdCampaign, AdCategory, AdCampaignPayload } from "../types";

type ToastFn = (message: string, type?: "success" | "error" | "info" | "warning") => void;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8088";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

type CampaignFormState = {
  id: string | null;
  title: string;
  advertiser: string;
  categoryId: string;
  audioUrl: string;
  audioTitle: string;
  durationSeconds: string;
  weight: string;
  startDate: string;
  endDate: string;
};

const EMPTY_FORM: CampaignFormState = {
  id: null,
  title: "",
  advertiser: "",
  categoryId: "",
  audioUrl: "",
  audioTitle: "",
  durationSeconds: "",
  weight: "1",
  startDate: "",
  endDate: "",
};

export function AdsManagementTab({ onToast }: { onToast: ToastFn }) {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [categories, setCategories] = useState<AdCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Campaign editor modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<CampaignFormState>(EMPTY_FORM);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category management
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [adsRes, catsRes] = await Promise.allSettled([
        fetchAdminAds(),
        fetchAdminAdCategories(),
      ]);
      if (adsRes.status === "fulfilled" && Array.isArray(adsRes.value)) {
        setCampaigns(adsRes.value);
      }
      if (catsRes.status === "fulfilled" && Array.isArray(catsRes.value)) {
        setCategories(catsRes.value);
      }
    } catch (err) {
      console.warn("Failed to load ads data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(
      (c) =>
        (statusFilter === "ALL" || c.status === statusFilter) &&
        (categoryFilter === "ALL" || c.categoryId === categoryFilter)
    );
  }, [campaigns, statusFilter, categoryFilter]);

  const totalImpressions = useMemo(
    () => campaigns.reduce((sum, c) => sum + (c.impressionCount || 0), 0),
    [campaigns]
  );

  // ============ Campaign actions ============
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  };

  const openEdit = (ad: AdCampaign) => {
    setForm({
      id: ad.id,
      title: ad.title,
      advertiser: ad.advertiser || "",
      categoryId: ad.categoryId || "",
      audioUrl: ad.audioUrl,
      audioTitle: ad.audioUrl.split("/").pop() || "",
      durationSeconds: ad.durationSeconds != null ? String(ad.durationSeconds) : "",
      weight: String(ad.weight || 1),
      startDate: ad.startDate ? ad.startDate.slice(0, 10) : "",
      endDate: ad.endDate ? ad.endDate.slice(0, 10) : "",
    });
    setEditorOpen(true);
  };

  const handleUploadAudio = async (file: File) => {
    setIsUploading(true);
    try {
      const res = await uploadAdminAdAudio(file);
      setForm((prev) => ({
        ...prev,
        audioUrl: res.url,
        audioTitle: res.url.split("/").pop() || file.name,
        durationSeconds: prev.durationSeconds || "",
      }));
      onToast("Đã tải lên tệp âm thanh quảng cáo.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onToast(`Lỗi khi tải tệp âm thanh: ${msg}`, "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveCampaign = async () => {
    if (!form.title.trim() || !form.audioUrl) {
      onToast("Cần nhập tiêu đề và tải lên tệp âm thanh quảng cáo.", "warning");
      return;
    }
    setIsSaving(true);
    try {
      const payload: AdCampaignPayload = {
        title: form.title.trim(),
        advertiser: form.advertiser.trim() || null,
        categoryId: form.categoryId || null,
        audioUrl: form.audioUrl,
        durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : null,
        weight: Number(form.weight) > 0 ? Number(form.weight) : 1,
        status: "ACTIVE",
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };
      if (form.id) {
        await updateAdminAd(form.id, payload);
        onToast("Đã cập nhật chiến dịch quảng cáo.", "success");
      } else {
        await createAdminAd(payload);
        onToast("Đã tạo chiến dịch quảng cáo mới.", "success");
      }
      setEditorOpen(false);
      void loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onToast(`Lỗi khi lưu chiến dịch: ${msg}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (ad: AdCampaign) => {
    try {
      await toggleAdminAdStatus(ad.id);
      setCampaigns((prev) =>
        prev.map((c) => (c.id === ad.id ? { ...c, status: c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : c))
      );
      onToast(`Đã ${ad.status === "ACTIVE" ? "tạm ngưng" : "kích hoạt"} chiến dịch "${ad.title}".`, "info");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onToast(`Lỗi khi đổi trạng thái: ${msg}`, "error");
    }
  };

  const handleDeleteCampaign = async (ad: AdCampaign) => {
    if (!window.confirm(`Xóa chiến dịch quảng cáo "${ad.title}"? Hành động không thể hoàn tác.`)) return;
    try {
      await deleteAdminAd(ad.id);
      setCampaigns((prev) => prev.filter((c) => c.id !== ad.id));
      onToast(`Đã xóa chiến dịch "${ad.title}".`, "info");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onToast(`Lỗi khi xóa chiến dịch: ${msg}`, "error");
    }
  };

  // ============ Category actions ============
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      onToast("Vui lòng nhập tên danh mục quảng cáo.", "warning");
      return;
    }
    setIsCreatingCategory(true);
    try {
      await createAdminAdCategory({ name: newCategoryName.trim(), description: newCategoryDesc.trim() || undefined });
      onToast(`Đã tạo danh mục "${newCategoryName.trim()}".`, "success");
      setNewCategoryName("");
      setNewCategoryDesc("");
      void loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onToast(`Lỗi khi tạo danh mục: ${msg}`, "error");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: AdCategory) => {
    if (!window.confirm(`Xóa danh mục quảng cáo "${cat.name}"?`)) return;
    try {
      await deleteAdminAdCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      onToast(`Đã xóa danh mục "${cat.name}".`, "info");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onToast(`Lỗi khi xóa danh mục: ${msg}`, "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-graphik text-[22px] font-semibold text-white flex items-center gap-2.5">
            <BadgePercent className="h-5 w-5 text-[#ff5500]" />
            Quản Lý Quảng Cáo
          </h1>
          <p className="mt-1 text-[13px] text-zinc-400 max-w-2xl">
            Quản lý danh mục và chiến dịch quảng cáo âm thanh phát xen kẽ trong player của người dùng FREE / Tiết Kiệm.
            Lưu ý: kho âm nhạc của nghệ sĩ thuộc về Content Lead & Kiểm duyệt — khu vực này chỉ dành cho nội dung quảng cáo.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[#ff5500] px-4 py-2.5 text-[13px] font-bold text-white shadow-md shadow-[#ff5500]/25 hover:brightness-110 transition active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Tạo Chiến Dịch
        </button>
      </div>

      {/* Stats ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Chiến dịch" value={String(campaigns.length)} />
        <StatCard label="Đang phát" value={String(campaigns.filter((c) => c.status === "ACTIVE").length)} accent />
        <StatCard label="Danh mục" value={String(categories.length)} />
        <StatCard label="Lượt hiển thị" value={totalImpressions.toLocaleString("vi-VN")} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* Campaign list */}
        <section className="rounded-2xl border border-[#222432] bg-[#12131a] p-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h2 className="text-sm font-semibold text-white">Chiến dịch quảng cáo</h2>
            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-[#222432] bg-[#0e0f14] px-2.5 py-1.5 text-[12px] text-zinc-300 focus:outline-none focus:border-[#ff5500]/60 cursor-pointer"
              >
                <option value="ALL">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-[#222432] bg-[#0e0f14] px-2.5 py-1.5 text-[12px] text-zinc-300 focus:outline-none focus:border-[#ff5500]/60 cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang phát</option>
                <option value="INACTIVE">Tạm ngưng</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-14 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-[13px]">Đang tải dữ liệu quảng cáo...</span>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-14 text-zinc-500">
              <Radio className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-[13px]">Chưa có chiến dịch nào khớp bộ lọc. Tạo chiến dịch đầu tiên để bắt đầu phục vụ quảng cáo.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto moodify-scroll pr-1">
              {filteredCampaigns.map((ad) => (
                <div key={ad.id} className="rounded-xl border border-[#222432] bg-[#0e0f14] p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            ad.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
                          }`}
                        >
                          {ad.status === "ACTIVE" ? "ĐANG PHÁT" : "TẠM NGƯNG"}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-zinc-400">
                          {ad.categoryName || "Chưa phân loại"}
                        </span>
                        {ad.weight > 1 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff5500]/15 text-[#ff5500]">
                            TRỌNG SỐ ×{ad.weight}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[13px] font-semibold text-white truncate">{ad.title}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {ad.advertiser || "Nhà quảng cáo nội bộ"} · {formatDate(ad.startDate)} → {formatDate(ad.endDate)}
                      </p>
                      {ad.audioUrl && (
                        <audio controls preload="none" src={`${API_BASE_URL}${ad.audioUrl}`} className="mt-2 h-8 w-full max-w-sm moodify-scroll" />
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <div className="text-right">
                        <div className="text-[11px] font-mono font-bold text-[#ff5500]">{(ad.impressionCount || 0).toLocaleString("vi-VN")}</div>
                        <div className="text-[10px] text-zinc-500">lượt phát</div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(ad)}
                          title="Chỉnh sửa"
                          className="p-1.5 rounded-lg border border-[#222432] text-zinc-400 hover:text-white hover:border-[#ff5500]/50 transition cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(ad)}
                          title={ad.status === "ACTIVE" ? "Tạm ngưng" : "Kích hoạt"}
                          className="p-1.5 rounded-lg border border-[#222432] text-zinc-400 hover:text-white hover:border-[#ff5500]/50 transition cursor-pointer"
                        >
                          {ad.status === "ACTIVE" ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteCampaign(ad)}
                          title="Xóa"
                          className="p-1.5 rounded-lg border border-[#222432] text-zinc-400 hover:text-rose-400 hover:border-rose-500/50 transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Categories sidebar */}
        <section className="rounded-2xl border border-[#222432] bg-[#12131a] p-5">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <FolderTree className="h-4 w-4 text-[#ff5500]" />
            Danh mục quảng cáo
          </h2>

          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto moodify-scroll pr-1">
            {categories.length === 0 ? (
              <p className="text-[12px] text-zinc-500 py-4 text-center">Chưa có danh mục nào.</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#222432] bg-[#0e0f14] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-white truncate">{cat.name}</p>
                    <p className="text-[10px] text-zinc-500">{cat.campaignCount} chiến dịch</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteCategory(cat)}
                    title="Xóa danh mục"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[#222432] pt-4 space-y-2.5">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Tên danh mục mới"
              className="w-full rounded-xl border border-[#222432] bg-[#0e0f14] px-3 py-2 text-[12px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#ff5500]/60 transition"
            />
            <input
              value={newCategoryDesc}
              onChange={(e) => setNewCategoryDesc(e.target.value)}
              placeholder="Mô tả ngắn (tùy chọn)"
              className="w-full rounded-xl border border-[#222432] bg-[#0e0f14] px-3 py-2 text-[12px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#ff5500]/60 transition"
            />
            <button
              type="button"
              onClick={() => void handleCreateCategory()}
              disabled={isCreatingCategory}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#ff5500]/40 bg-[#ff5500]/10 px-3 py-2 text-[12px] font-bold text-[#ff5500] hover:bg-[#ff5500]/20 transition cursor-pointer disabled:opacity-50"
            >
              {isCreatingCategory ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Thêm danh mục
            </button>
          </div>
        </section>
      </div>

      {/* Campaign Editor Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#222432] bg-[#12131a] p-6 max-h-[90vh] overflow-y-auto moodify-scroll">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white">
                {form.id ? "Chỉnh sửa chiến dịch quảng cáo" : "Tạo chiến dịch quảng cáo"}
              </h3>
              <button type="button" onClick={() => setEditorOpen(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Tiêu đề chiến dịch *">
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="VD: Khuyến mãi cà phê sữa tháng 10"
                  className={inputCls}
                />
              </Field>

              <Field label="Nhà quảng cáo">
                <input
                  value={form.advertiser}
                  onChange={(e) => setForm((p) => ({ ...p, advertiser: e.target.value }))}
                  placeholder="VD: Highlands Coffee (bỏ trống = nội bộ Moodify)"
                  className={inputCls}
                />
              </Field>

              <Field label="Danh mục">
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                  className={`${inputCls} cursor-pointer`}
                >
                  <option value="">Chưa phân loại</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Tệp âm thanh quảng cáo *">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 rounded-xl border border-dashed border-[#ff5500]/50 bg-[#ff5500]/10 px-3.5 py-2.5 text-[12px] font-semibold text-[#ff5500] hover:bg-[#ff5500]/20 transition cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {isUploading ? "Đang tải lên..." : "Chọn tệp audio (mp3)"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUploadAudio(f);
                    }}
                  />
                  {form.audioUrl && (
                    <span className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-mono truncate">
                      <Volume2 className="h-3 w-3 shrink-0" />
                      {form.audioTitle}
                    </span>
                  )}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Thời lượng (giây)">
                  <input
                    value={form.durationSeconds}
                    onChange={(e) => setForm((p) => ({ ...p, durationSeconds: e.target.value.replace(/[^0-9]/g, "") }))}
                    placeholder="15"
                    className={inputCls}
                  />
                </Field>
                <Field label="Trọng số tần suất (1-10)">
                  <input
                    value={form.weight}
                    onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value.replace(/[^0-9]/g, "") }))}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Hiệu lực từ (tùy chọn)">
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Đến ngày (tùy chọn)">
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="flex-1 rounded-xl border border-[#222432] bg-[#171822] px-4 py-2.5 text-[13px] font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveCampaign()}
                  disabled={isSaving}
                  className="flex-1 rounded-xl bg-[#ff5500] px-4 py-2.5 text-[13px] font-bold text-white shadow-md shadow-[#ff5500]/25 hover:brightness-110 transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Đang lưu..." : form.id ? "Lưu thay đổi" : "Tạo chiến dịch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[#222432] bg-[#0e0f14] px-3.5 py-2.5 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#ff5500]/60 transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#222432] bg-[#12131a] px-4 py-3.5">
      <div className={`text-[20px] font-graphik font-bold ${accent ? "text-[#ff5500]" : "text-white"}`}>{value}</div>
      <div className="text-[11px] text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}
