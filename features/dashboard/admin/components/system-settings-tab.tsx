"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileAudio,
  HardDrive,
  Info,
  Megaphone,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";
import { SystemAuditLog } from "../types";
import { AdminPagination } from "./shared/admin-pagination";

export type SystemConfig = {
  // 1. Operation & Maintenance
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowRegistration: boolean;
  autoApproveArtist: boolean;

  // 2. Media & Upload Policies
  allowedAudioFormats: string[];
  maxAudioSizeMb: number;
  maxCoverSizeMb: number;
  moderationMode: "PRE_MODERATION" | "POST_MODERATION";

  // 3. Payment & Billing
  vnpayEnabled: boolean;
  momoEnabled: boolean;
  cardEnabled: boolean;
  refundWindowHours: number;
  vatPercentage: number;

  // 4. Global Announcement
  announcementEnabled: boolean;
  announcementText: string;
  announcementType: "promo" | "info" | "warning";

  // 5. Session Security
  sessionTimeoutMinutes: number;
};

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  maintenanceMode: false,
  maintenanceMessage: "Moodify đang bảo trì định kỳ để nâng cấp cụm máy chủ và thư viện âm thanh. Vui lòng quay lại sau ít phút.",
  allowRegistration: true,
  autoApproveArtist: false,

  allowedAudioFormats: ["MP3", "WAV", "FLAC", "AAC"],
  maxAudioSizeMb: 50,
  maxCoverSizeMb: 5,
  moderationMode: "PRE_MODERATION",

  vnpayEnabled: true,
  momoEnabled: true,
  cardEnabled: true,
  refundWindowHours: 48,
  vatPercentage: 8,

  announcementEnabled: true,
  announcementText: "🎉 Chào mừng chiến dịch âm nhạc Moodify 2026 - Giảm 20% khi đăng ký gói cước VIP Năm!",
  announcementType: "promo",

  sessionTimeoutMinutes: 60,
};

type SystemSettingsTabProps = {
  auditLogs: SystemAuditLog[];
  onSaveSettings?: (config: SystemConfig) => void;
  onRecordAudit?: (
    action: string,
    target: string,
    details: string,
    category: SystemAuditLog["category"],
    severity: SystemAuditLog["severity"]
  ) => void;
  onAddToast?: (message: string, type: "success" | "error" | "info" | "warning") => void;
};

export function SystemSettingsTab({
  auditLogs,
  onSaveSettings,
  onRecordAudit,
  onAddToast,
}: SystemSettingsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"config" | "audit">("config");

  // Core System Configurations
  const [config, setConfig] = useState<SystemConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("moodify_system_config");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_SYSTEM_CONFIG;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);



  // Audit Logs Filter & Search State
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchAudit, setSearchAudit] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setAuditPage(1);
  }, [searchAudit, categoryFilter, severityFilter]);

  const handleSaveAllConfig = () => {
    setIsSaving(true);
    try {
      localStorage.setItem("moodify_system_config", JSON.stringify(config));
    } catch {}

    if (onSaveSettings) {
      onSaveSettings(config);
    }
    if (onRecordAudit) {
      onRecordAudit(
        "UPDATE_SYSTEM_CONFIG",
        "Cấu hình Hệ thống Moodify",
        `Bảo trì: ${config.maintenanceMode ? "BẬT" : "TẮT"}, Đăng ký: ${config.allowRegistration ? "MỞ" : "ĐÓNG"}, Kiểm duyệt: ${config.moderationMode === "PRE_MODERATION" ? "Tiền kiểm" : "Hậu kiểm"}, Banner: ${config.announcementEnabled ? "BẬT" : "TẮT"}`,
        "SYSTEM",
        "info"
      );
    }
    if (onAddToast) {
      onAddToast("Đã lưu và áp dụng toàn bộ cấu hình hệ thống thành công!", "success");
    }

    setIsSaving(false);
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 3000);
  };



  const handleExportConfigBackup = () => {
    const backupData = {
      exportTime: new Date().toISOString(),
      platform: "Moodify Music Streaming Platform",
      systemConfig: config,
      auditLogsCount: auditLogs.length,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `moodify_system_config_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    if (onAddToast) {
      onAddToast("Đã xuất bản sao lưu cấu hình hệ thống (.json) thành công!", "info");
    }
  };

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `moodify_audit_vault_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const toggleAudioFormat = (fmt: string) => {
    setConfig((prev) => {
      const exists = prev.allowedAudioFormats.includes(fmt);
      if (exists) {
        if (prev.allowedAudioFormats.length <= 1) return prev; // Keep at least one
        return { ...prev, allowedAudioFormats: prev.allowedAudioFormats.filter((f) => f !== fmt) };
      } else {
        return { ...prev, allowedAudioFormats: [...prev.allowedAudioFormats, fmt] };
      }
    });
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchSev = severityFilter === "ALL" || log.severity === severityFilter;
    const matchCat = categoryFilter === "ALL" || log.category === categoryFilter;
    const matchSearch =
      log.action.toLowerCase().includes(searchAudit.toLowerCase()) ||
      log.target.toLowerCase().includes(searchAudit.toLowerCase()) ||
      log.details.toLowerCase().includes(searchAudit.toLowerCase()) ||
      log.operatorName.toLowerCase().includes(searchAudit.toLowerCase());

    return matchSev && matchCat && matchSearch;
  });

  const paginatedLogs = filteredLogs.slice(
    (auditPage - 1) * auditPageSize,
    auditPage * auditPageSize
  );

  return (
    <div className="space-y-6 anim-fade-up select-none">
      {/* Studio Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-graphik text-[24px] font-bold text-white tracking-tight">
            Cài Đặt Hệ Thống &amp; Kiểm Toán Vận Hành
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Trung tâm thiết lập tham số nền tảng, quản lý cổng thanh toán, thông báo toàn sàn và bảo trì hệ thống.
          </p>
        </div>

        {/* Action Button & Subtab Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {activeSubTab === "config" && (
            <button
              type="button"
              onClick={handleSaveAllConfig}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-full bg-[#ff5500] px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#ff5500]/25 hover:bg-[#ff6a1a] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            >
              {isSavedSuccess ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {isSavedSuccess ? "Đã Lưu Cấu Hình!" : "Lưu Cấu Hình Hệ Thống"}
            </button>
          )}

          {/* Subtab Toggle Buttons */}
          <div className="flex items-center rounded-xl border border-[#222432] bg-[#12131a] p-1">
            <button
              type="button"
              onClick={() => setActiveSubTab("config")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeSubTab === "config"
                  ? "bg-[#ff5500] text-white shadow font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Settings className="h-3.5 w-3.5" /> Cài Đặt Hệ Thống
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("audit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeSubTab === "audit"
                  ? "bg-[#ff5500] text-white shadow font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Shield className="h-3.5 w-3.5" /> Nhật Ký Kiểm Toán ({auditLogs.length})
            </button>
          </div>
        </div>
      </div>

      {/* ================= SUBTAB 1: SYSTEM CONFIGURATION CONSOLE ================= */}
      {activeSubTab === "config" && (
        <div className="space-y-6">
          {/* Card 1: Maintenance & Platform Operational Status */}
          <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 shadow-xl">
            <div className="flex items-center gap-3 border-b border-[#222432] pb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#222432] bg-[#171822] text-[#ff5500]">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-graphik text-base font-bold text-white">Chế Độ Bảo Trì &amp; Truy Cập Nền Tảng</h3>
                <p className="text-[11px] text-zinc-400 font-mono">Quản lý quyền truy cập của người nghe và đăng ký tài khoản</p>
              </div>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              {/* Toggle 1: Maintenance Mode */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#171822] border border-[#222432]">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Chế độ bảo trì hệ thống (Maintenance Mode)</span>
                    <span
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                        config.maintenanceMode
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {config.maintenanceMode ? "ĐANG BẢO TRÌ" : "HOẠT ĐỘNG BÌNH THƯỜNG"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Khi bật, người dùng thông thường khi vào website sẽ thấy trang thông báo bảo trì. Chỉ các tài khoản có quyền ADMIN mới có thể đăng nhập và điều hành.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.maintenanceMode ? "bg-[#ff5500]" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      config.maintenanceMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Maintenance Message Input (if enabled or for pre-configuration) */}
              {config.maintenanceMode && (
                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                  <label className="font-semibold text-rose-300 block">Thông điệp bảo trì gửi tới người nghe:</label>
                  <textarea
                    rows={2}
                    value={config.maintenanceMessage}
                    onChange={(e) => setConfig((prev) => ({ ...prev, maintenanceMessage: e.target.value }))}
                    className="w-full rounded-xl border border-[#222432] bg-[#12131a] p-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#ff5500]"
                  />
                </div>
              )}

              {/* Two Column Switches: User Registration & Artist Verification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Switch 2: User Registration */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#171822] border border-[#222432]">
                  <div>
                    <div className="font-semibold text-white">Cho phép đăng ký tài khoản mới</div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Mở đăng ký cho người nghe tự do</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, allowRegistration: !prev.allowRegistration }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      config.allowRegistration ? "bg-emerald-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                        config.allowRegistration ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Switch 3: Artist Auto-Approve */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#171822] border border-[#222432]">
                  <div>
                    <div className="font-semibold text-white">Yêu cầu xét duyệt hồ sơ Nghệ Sĩ</div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Admin phải phê duyệt trước khi cấp quyền</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, autoApproveArtist: !prev.autoApproveArtist }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      !config.autoApproveArtist ? "bg-emerald-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                        !config.autoApproveArtist ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Audio Upload & Quality Policies */}
          <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 shadow-xl">
            <div className="flex items-center gap-3 border-b border-[#222432] pb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#222432] bg-[#171822] text-[#ff5500]">
                <FileAudio className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-graphik text-base font-bold text-white">Chính Sách Tải Lên Âm Thanh &amp; Kiểm Duyệt</h3>
                <p className="text-[11px] text-zinc-400 font-mono">Quy định định dạng tệp, dung lượng và luồng duyệt bài hát mới</p>
              </div>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              {/* Audio Format Checkboxes */}
              <div>
                <label className="font-semibold text-white block mb-2">Định dạng âm thanh chấp nhận khi nghệ sĩ tải lên:</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[
                    { ext: "MP3", desc: "MPEG-3 Audio (320kbps)" },
                    { ext: "FLAC", desc: "Lossless Audio Hi-Fi" },
                    { ext: "WAV", desc: "Master Studio PCM" },
                    { ext: "AAC", desc: "Advanced Audio Coding" },
                    { ext: "M4A", desc: "Apple Lossless / AAC" },
                  ].map((item) => {
                    const isChecked = config.allowedAudioFormats.includes(item.ext);
                    return (
                      <button
                        key={item.ext}
                        type="button"
                        onClick={() => toggleAudioFormat(item.ext)}
                        className={`flex flex-col text-left p-3 rounded-xl border transition cursor-pointer ${
                          isChecked
                            ? "border-[#ff5500] bg-[#ff5500]/10 text-white"
                            : "border-[#222432] bg-[#171822] text-zinc-400 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sm">{item.ext}</span>
                          <span
                            className={`h-4 w-4 rounded grid place-items-center text-[10px] ${
                              isChecked ? "bg-[#ff5500] text-white" : "border border-zinc-600"
                            }`}
                          >
                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 mt-1">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3 Selectors: Max Audio Size, Max Cover Size, Moderation Policy */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Max Audio Size */}
                <div className="p-3.5 rounded-xl bg-[#171822] border border-[#222432] space-y-1.5">
                  <label className="font-semibold text-white flex items-center justify-between">
                    <span>Hạn mức tệp âm thanh</span>
                    <HardDrive className="h-3.5 w-3.5 text-zinc-400" />
                  </label>
                  <p className="text-[11px] text-zinc-400">File quá dung lượng này sẽ bị từ chối tải lên.</p>
                  <select
                    value={config.maxAudioSizeMb}
                    onChange={(e) => setConfig((prev) => ({ ...prev, maxAudioSizeMb: Number(e.target.value) }))}
                    className="w-full mt-2 rounded-lg border border-[#222432] bg-[#12131a] px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#ff5500] cursor-pointer"
                  >
                    <option value={25}>25 MB (Tối ưu băng thông mạng)</option>
                    <option value={50}>50 MB (Khuyên dùng - Chuẩn MP3 320k / FLAC)</option>
                    <option value={100}>100 MB (Lossless Hi-Fi &amp; Studio Master)</option>
                  </select>
                </div>

                {/* Max Cover Image Size */}
                <div className="p-3.5 rounded-xl bg-[#171822] border border-[#222432] space-y-1.5">
                  <label className="font-semibold text-white flex items-center justify-between">
                    <span>Hạn mức ảnh bìa Album/Track</span>
                    <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
                  </label>
                  <p className="text-[11px] text-zinc-400">Dung lượng tối đa cho mỗi file ảnh bìa (JPG/PNG).</p>
                  <select
                    value={config.maxCoverSizeMb}
                    onChange={(e) => setConfig((prev) => ({ ...prev, maxCoverSizeMb: Number(e.target.value) }))}
                    className="w-full mt-2 rounded-lg border border-[#222432] bg-[#12131a] px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#ff5500] cursor-pointer"
                  >
                    <option value={2}>2 MB (Tải trang cực nhanh)</option>
                    <option value={5}>5 MB (Khuyên dùng - Ảnh sắc nét 4K)</option>
                    <option value={10}>10 MB (Độ phân giải nguyên bản)</option>
                  </select>
                </div>

                {/* Moderation Mode */}
                <div className="p-3.5 rounded-xl bg-[#171822] border border-[#222432] space-y-1.5">
                  <label className="font-semibold text-white flex items-center justify-between">
                    <span>Quy trình duyệt phát hành</span>
                    <Shield className="h-3.5 w-3.5 text-zinc-400" />
                  </label>
                  <p className="text-[11px] text-zinc-400">Kiểm soát bài hát trước khi người nghe tiếp cận.</p>
                  <select
                    value={config.moderationMode}
                    onChange={(e) => setConfig((prev) => ({ ...prev, moderationMode: e.target.value as "PRE_MODERATION" | "POST_MODERATION" }))}
                    className="w-full mt-2 rounded-lg border border-[#222432] bg-[#12131a] px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#ff5500] cursor-pointer"
                  >
                    <option value="PRE_MODERATION">Tiền kiểm (Phải duyệt mới được phát hành)</option>
                    <option value="POST_MODERATION">Hậu kiểm (Phát hành ngay, xử lý khi báo cáo)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Payment Gateways & Billing Policies */}
          <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 shadow-xl">
            <div className="flex items-center gap-3 border-b border-[#222432] pb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#222432] bg-[#171822] text-[#ff5500]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-graphik text-base font-bold text-white">Cổng Thanh Toán &amp; Chính Sách Thuê Bao</h3>
                <p className="text-[11px] text-zinc-400 font-mono">Bật/tắt phương thức thanh toán và quy định hoàn tiền giao dịch</p>
              </div>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              {/* Payment Gateways Switches */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#171822] border border-[#222432]">
                  <div>
                    <span className="font-semibold text-white font-mono block">VNPAY (QR / ATM)</span>
                    <span className="text-[11px] text-zinc-400">Cổng thanh toán quốc gia</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, vnpayEnabled: !prev.vnpayEnabled }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      config.vnpayEnabled ? "bg-[#ff5500]" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                        config.vnpayEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#171822] border border-[#222432]">
                  <div>
                    <span className="font-semibold text-white font-mono block">Ví Điện Tử MoMo</span>
                    <span className="text-[11px] text-zinc-400">Thanh toán ví thông minh</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, momoEnabled: !prev.momoEnabled }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      config.momoEnabled ? "bg-[#ff5500]" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                        config.momoEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#171822] border border-[#222432]">
                  <div>
                    <span className="font-semibold text-white font-mono block">Thẻ Quốc Tế (Visa/Master)</span>
                    <span className="text-[11px] text-zinc-400">Thanh toán trực tiếp thẻ quốc tế</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, cardEnabled: !prev.cardEnabled }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      config.cardEnabled ? "bg-[#ff5500]" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                        config.cardEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Refund policy & VAT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="p-3.5 rounded-xl bg-[#171822] border border-[#222432]">
                  <label className="font-semibold text-white block mb-1">Thời hạn cho phép yêu cầu hoàn tiền:</label>
                  <p className="text-[11px] text-zinc-400 mb-2">Áp dụng cho gói cước mới kích hoạt chưa sử dụng quá mức.</p>
                  <select
                    value={config.refundWindowHours}
                    onChange={(e) => setConfig((prev) => ({ ...prev, refundWindowHours: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-[#222432] bg-[#12131a] px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#ff5500] cursor-pointer"
                  >
                    <option value={0}>Không hỗ trợ hoàn tiền</option>
                    <option value={24}>Trong vòng 24 Giờ sau thanh toán</option>
                    <option value={48}>Trong vòng 48 Giờ (Tiêu chuẩn)</option>
                    <option value={168}>Trong vòng 7 Ngày</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-xl bg-[#171822] border border-[#222432]">
                  <label className="font-semibold text-white block mb-1">Thuế suất GTGT (VAT) áp dụng cho gói cước:</label>
                  <p className="text-[11px] text-zinc-400 mb-2">Được tính tự động khi xuất hóa đơn đối soát cho khách hàng.</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={config.vatPercentage}
                      onChange={(e) => setConfig((prev) => ({ ...prev, vatPercentage: Number(e.target.value) }))}
                      className="w-24 rounded-lg border border-[#222432] bg-[#12131a] px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-[#ff5500]"
                    />
                    <span className="font-mono text-xs text-zinc-400">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Global Announcement Banner */}
          <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#222432] pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#222432] bg-[#171822] text-[#ff5500]">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-graphik text-base font-bold text-white">Thông Báo Toàn Sàn (Global Banner)</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">Hiển thị thông điệp sự kiện hoặc thông báo trực tiếp cho toàn bộ người nghe</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, announcementEnabled: !prev.announcementEnabled }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  config.announcementEnabled ? "bg-[#ff5500]" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    config.announcementEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {config.announcementEnabled && (
              <div className="mt-5 space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-white block mb-1">Nội dung thông báo hiển thị trên đầu website:</label>
                  <input
                    type="text"
                    value={config.announcementText}
                    onChange={(e) => setConfig((prev) => ({ ...prev, announcementText: e.target.value }))}
                    placeholder="Nhập nội dung banner toàn sàn..."
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] p-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#ff5500]"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-zinc-400 font-medium">Kiểu hiển thị banner:</span>
                  <div className="flex items-center gap-2">
                    {[
                      { id: "promo", label: "Khuyến mãi (Màu Cam)", color: "text-[#ff5500]" },
                      { id: "info", label: "Thông tin (Màu Lam)", color: "text-sky-400" },
                      { id: "warning", label: "Cảnh báo (Màu Vàng)", color: "text-amber-400" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, announcementType: t.id as any }))}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition cursor-pointer ${
                          config.announcementType === t.id
                            ? "border-white/30 bg-white/10 font-bold " + t.color
                            : "border-transparent bg-[#171822] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Preview */}
                <div className="mt-2 p-3 rounded-xl border border-[#222432] bg-[#171822]">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">
                    Xem trước banner thực tế:
                  </span>
                  <div
                    className={`py-2 px-4 rounded-lg text-center text-xs font-medium flex items-center justify-center gap-2 ${
                      config.announcementType === "promo"
                        ? "bg-[#ff5500]/20 text-[#ff7722] border border-[#ff5500]/30"
                        : config.announcementType === "warning"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                    }`}
                  >
                    <Megaphone className="h-4 w-4 shrink-0" />
                    <span>{config.announcementText || "Chưa có nội dung thông báo"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 5: System Configuration Backup & Export */}
          <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 shadow-xl">
            <div className="flex items-center gap-3 border-b border-[#222432] pb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#222432] bg-[#171822] text-[#ff5500]">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-graphik text-base font-bold text-white">Sao Lưu Cấu Hình Hệ Thống</h3>
                <p className="text-[11px] text-zinc-400 font-mono">Xuất dữ liệu thiết lập hệ thống để lưu trữ an toàn hoặc phục hồi khi cần thiết</p>
              </div>
            </div>

            <div className="mt-5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#171822] border border-[#222432]">
                <div className="max-w-xl">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Download className="h-4 w-4 text-sky-400" /> Tệp Cấu Hình Toàn Bộ Nền Tảng (.json)
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Tải về tệp JSON chứa toàn bộ thiết lập hệ thống: chế độ bảo trì, chính sách tải lên, cổng thanh toán (VNPAY/MoMo/Thẻ), tỷ lệ VAT, thời hạn hoàn tiền và nội dung thông báo toàn sàn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportConfigBackup}
                  className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-[#222432] bg-[#12131a] py-2.5 px-4 text-xs font-semibold text-zinc-200 hover:text-white hover:border-sky-500/50 transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-sky-400" /> Xuất File Sao Lưu (.json)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBTAB 2: AUDIT VAULT ================= */}
      {activeSubTab === "audit" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-graphik text-lg font-bold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#ff5500]" /> Nhật Ký Kiểm Toán Thao Tác (Audit Vault)
              </h3>
              <p className="text-xs text-zinc-400">
                Lịch sử ghi nhận thao tác của ban quản trị để phục vụ đối soát, bảo mật và an toàn dữ liệu.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportLogs}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#222432] bg-[#12131a] px-4 py-2 font-mono text-xs text-zinc-300 hover:bg-[#171822] hover:text-white transition self-start sm:self-auto cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-[#ff5500]" /> Xuất File JSON
            </button>
          </div>

          {/* Audit Filter Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#222432] bg-[#12131a] p-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
                placeholder="Tìm theo hành động, mục tiêu, chi tiết..."
                className="w-full rounded-xl border border-[#222432] bg-[#171822] py-2 pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#ff5500]"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#ff5500] cursor-pointer"
            >
              <option value="ALL" className="bg-[#12131a]">Tất cả danh mục</option>
              <option value="IAM" className="bg-[#12131a]">Người dùng &amp; Phân quyền</option>
              <option value="MODERATION" className="bg-[#12131a]">Kiểm duyệt âm nhạc</option>
              <option value="CATALOG" className="bg-[#12131a]">Kho nhạc &amp; Bản quyền</option>
              <option value="BILLING" className="bg-[#12131a]">Gói cước &amp; Doanh thu</option>
              <option value="SECURITY" className="bg-[#12131a]">Bảo mật &amp; Hệ thống</option>
              <option value="SYSTEM" className="bg-[#12131a]">Tham số cốt lõi</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#ff5500] cursor-pointer"
            >
              <option value="ALL" className="bg-[#12131a]">Tất cả mức độ</option>
              <option value="critical" className="bg-[#12131a]">Khẩn cấp (Critical)</option>
              <option value="warning" className="bg-[#12131a]">Cảnh báo (Warning)</option>
              <option value="info" className="bg-[#12131a]">Thông tin (Info)</option>
            </select>
          </div>

          {/* Audit Table */}
          <div className="overflow-hidden rounded-2xl border border-[#222432] bg-[#12131a] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#222432] bg-[#171822] font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="py-3.5 pl-5 pr-3">Thời Điểm</th>
                    <th className="py-3.5 px-3">Quản Trị Viên</th>
                    <th className="py-3.5 px-3">Hành Động</th>
                    <th className="py-3.5 px-3">Mục Tiêu</th>
                    <th className="py-3.5 px-3">Chi Tiết Sự Kiện</th>
                    <th className="py-3.5 pl-3 pr-5 text-right">Mức Độ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400 font-mono">
                        Không có bản ghi kiểm toán nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 pl-5 pr-3 font-mono text-[11px] text-zinc-400 shrink-0">
                          {log.timestamp}
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-medium text-white">{log.operatorName}</span>
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px] font-bold text-[#ff5500]">
                          {log.action}
                        </td>

                        <td className="py-3 px-3 font-medium text-white/90">
                          {log.target}
                        </td>

                        <td className="py-3 px-3 text-zinc-300 truncate max-w-[280px]" title={log.details}>
                          {log.details}
                        </td>

                        <td className="py-3 pl-3 pr-5 text-right font-mono text-[11px]">
                          {log.severity === "critical" ? (
                            <span className="inline-flex items-center gap-1.5 text-rose-400 font-semibold">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                              Khẩn cấp
                            </span>
                          ) : log.severity === "warning" ? (
                            <span className="inline-flex items-center gap-1.5 text-amber-400 font-semibold">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              Cảnh báo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-sky-400 font-semibold">
                              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                              Thông tin
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <AdminPagination
              currentPage={auditPage}
              totalItems={filteredLogs.length}
              pageSize={auditPageSize}
              onPageChange={setAuditPage}
              onPageSizeChange={setAuditPageSize}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
