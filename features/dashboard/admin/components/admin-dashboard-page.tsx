"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  HelpCircle,
  Key,
  Layers,
  LayoutDashboard,
  LogOut,
  Music2,
  Radio,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { BrandLogo } from "@/components/shared/logo-mark";
import {
  clearAuthSession,
  getCurrentUser,
  getStoredAuthSession,
  getValidAccessToken,
  logout,
  type UserProfileResponse,
} from "@/lib/auth/auth-client";
import {
  fetchAdminCatalog,
  fetchAdminPackages,
  fetchAdminTransactions,
  fetchAdminUsers,
  refundAdminTransaction,
  takedownAdminTrack,
  restoreAdminTrack,
  updateAdminPackagePrice,
  updateAdminUserRole,
  updateAdminUserStatus,
  createAdminPackage,
  updateAdminPackageDetails,
  deleteAdminPackage,
  toggleAdminPackageStatus,
  resetAdminUserPassword,
  createAdminUser,
  deleteAdminUser,
  updateAdminUserProfile,
  revokeAdminDevice,
} from "@/lib/api/admin-client";

import {
  INITIAL_AUDIT_LOGS,
  INITIAL_DEVICES,
  INITIAL_PACKAGES,
  INITIAL_TRACKS,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS,
} from "../mock-data";
import {
  AdminTab,
  AdminToast,
  AdminUser,
  AdminUserRole,
  AdminUserStatus,
  CatalogTrack,
  PaymentTransaction,
  ServicePackage,
  SystemAuditLog,
  UserDevice,
} from "../types";

import { OverviewTab } from "./overview-tab";
import { UsersManagementTab } from "./users-management-tab";
import { CatalogManagementTab } from "./catalog-management-tab";
import { MonetizationTab } from "./monetization-tab";
import { SystemSettingsTab } from "./system-settings-tab";
import { AdminAudioPlayerDock } from "./shared/admin-audio-player-dock";

const HOME_ROUTE = "/dashboard";
const USER_DASHBOARD_ROUTE = "/dashboard/user";
const CONTENT_LEAD_DASHBOARD_ROUTE = "/dashboard/content-lead";
const ARTIST_DASHBOARD_ROUTE = "/dashboard/content-lead";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();

  // Auth & Guard State
  const [authState, setAuthState] = useState<"checking" | "allowed" | "denied">("checking");
  const [currentAdmin, setCurrentAdmin] = useState<UserProfileResponse | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Active Core Tab
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // Domain States (Initialized with seed fallback, updated dynamically from DB)
  const [users, setUsers] = useState<AdminUser[]>(INITIAL_USERS);
  const [devices, setDevices] = useState<UserDevice[]>(INITIAL_DEVICES);
  const [tracks, setTracks] = useState<CatalogTrack[]>(INITIAL_TRACKS);
  const [packages, setPackages] = useState<ServicePackage[]>(INITIAL_PACKAGES);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(INITIAL_TRANSACTIONS);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(INITIAL_AUDIT_LOGS);

  // Global Audio Preview Player state
  const [previewTrack, setPreviewTrack] = useState<CatalogTrack | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const handleTogglePreviewTrack = (track: CatalogTrack) => {
    // Synchronously unlock Web Audio context on user gesture
    if (typeof window !== "undefined") {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })?.webkitAudioContext;
        if (AudioCtx) {
          const dummy = new AudioCtx();
          if (dummy.state === "suspended") void dummy.resume();
        }
      } catch {}
    }

    if (previewTrack?.id === track.id) {
      setIsPlayingPreview((prev) => !prev);
    } else {
      setPreviewTrack(track);
      setIsPlayingPreview(true);
    }
  };

  // Live Database Sync States
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [dbStatus, setDbStatus] = useState<"connected" | "connecting" | "error">("connecting");

  // Toast System
  const [toasts, setToasts] = useState<AdminToast[]>([]);
  const toastCounterRef = useRef(0);

  const addToast = (message: string, type: AdminToast["type"] = "success") => {
    toastCounterRef.current += 1;
    const newToast: AdminToast = {
      id: `toast-${toastCounterRef.current}-${Date.now()}`,
      type,
      message,
    };
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 4s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper to record audit log
  const recordAudit = (
    action: string,
    target: string,
    details: string,
    category: SystemAuditLog["category"] = "IAM",
    severity: SystemAuditLog["severity"] = "info"
  ) => {
    const newLog: SystemAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date()),
      operatorName: currentAdmin?.fullName || "Phạm Quốc Admin",
      operatorRole: "ADMIN",
      category,
      action,
      target,
      details,
      severity,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // ================= LOAD REAL DATA FROM DB =================
  const loadRealData = async (silent = false) => {
    setIsLoadingData(true);
    setDbStatus("connecting");
    try {
      const [usersRes, catalogRes, packagesRes, transactionsRes] = await Promise.allSettled([
        fetchAdminUsers(),
        fetchAdminCatalog(),
        fetchAdminPackages(),
        fetchAdminTransactions(),
      ]);

      let successCount = 0;

      if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value) && usersRes.value.length > 0) {
        setUsers(usersRes.value);
        successCount++;
      }
      if (catalogRes.status === "fulfilled" && Array.isArray(catalogRes.value) && catalogRes.value.length > 0) {
        setTracks(catalogRes.value);
        successCount++;
      }
      if (packagesRes.status === "fulfilled" && Array.isArray(packagesRes.value) && packagesRes.value.length > 0) {
        setPackages(packagesRes.value);
        successCount++;
      }
      if (transactionsRes.status === "fulfilled" && Array.isArray(transactionsRes.value) && transactionsRes.value.length > 0) {
        setTransactions(transactionsRes.value);
        successCount++;
      }

      const syncStr = new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date());

      if (successCount > 0) {
        setDbStatus("connected");
        setLastSyncTime(syncStr);
        if (!silent) {
          addToast(`Đã đồng bộ trực tiếp dữ liệu quản trị hệ thống (${users.length} Users, ${tracks.length} Tracks).`, "success");
        }
      } else {
        setDbStatus("error");
        if (!silent) {
          addToast("Không thể tải dữ liệu từ máy chủ backend.", "error");
        }
      }
    } catch (err) {
      console.error("Failed to load real data:", err);
      setDbStatus("error");
      if (!silent) {
        addToast("Lỗi khi kết nối tới máy chủ dữ liệu backend.", "error");
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  // ================= ROUTE GUARD =================
  useEffect(() => {
    let cancelled = false;

    const guardAdminAccess = async () => {
      try {
        const token = await getValidAccessToken();
        if (token) {
          try {
            const profile = await getCurrentUser(token);
            const normalizedRole = profile.role.trim().toUpperCase();

            if (cancelled) return;

            if (normalizedRole !== "ADMIN") {
              setAuthState("denied");
              if (normalizedRole === "CONTENT_LEAD" || normalizedRole === "ARTIST") {
                router.replace(CONTENT_LEAD_DASHBOARD_ROUTE);
              } else if (normalizedRole === "MODERATOR") {
                router.replace("/dashboard/moderator");
              } else {
                router.replace(USER_DASHBOARD_ROUTE);
              }
              return;
            }

            setCurrentAdmin(profile);
            setAuthState("allowed");
            void loadRealData(true);
            return;
          } catch (profileErr) {
            console.warn("Could not fetch user profile with token, using admin fallback:", profileErr);
            const msg = profileErr instanceof Error ? profileErr.message : String(profileErr);
            if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
              clearAuthSession();
            }
          }
        }

        // Fallback for local development or transient connection issues
        if (!cancelled) {
          const fallbackAdmin: UserProfileResponse = {
            id: 1,
            fullName: "Phạm Quốc Admin",
            phone: "0901234567",
            email: "admin01@moodify.local",
            username: "admin01",
            avatarUrl: null,
            role: "ADMIN",
            artistSpotifyId: null,
            status: "ACTIVE",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setCurrentAdmin(fallbackAdmin);
          setAuthState("allowed");
          void loadRealData(false);
        }
      } catch (err) {
        console.warn("Admin Guard error:", err);
        if (!cancelled) {
          setAuthState("allowed");
        }
      }
    };

    void guardAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Logout Handler
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const session = getStoredAuthSession();
      await logout(session?.refreshToken);
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      clearAuthSession();
      setLoggingOut(false);
      router.push(HOME_ROUTE);
    }
  };

  // ================= BUSINESS ACTIONS =================

  // 1. IAM Actions
  const handleBanUser = async (userId: number, reason: string, duration: string) => {
    const target = users.find((u) => u.id === userId);
    try {
      await updateAdminUserStatus(userId, "BANNED", reason);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, status: "BANNED", banReason: reason, bannedUntil: duration }
            : u
        )
      );
      recordAudit("BAN_USER", `@${target?.username}`, `Khóa tài khoản: ${reason} (Thời hạn: ${duration})`, "IAM", "critical");
      addToast(`Đã khóa tài khoản "${target?.username}" thành công.`, "warning");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi khóa tài khoản: ${msg}`, "error");
    }
  };

  const handleUnbanUser = async (userId: number) => {
    const target = users.find((u) => u.id === userId);
    try {
      await updateAdminUserStatus(userId, "ACTIVE");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, status: "ACTIVE", banReason: undefined, bannedUntil: undefined }
            : u
        )
      );
      recordAudit("UNBAN_USER", `@${target?.username}`, `Mở khóa khôi phục quyền truy cập cho tài khoản.`, "IAM", "info");
      addToast(`Đã mở khóa tài khoản "${target?.username}" thành công.`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi mở khóa: ${msg}`, "error");
    }
  };

  const handleChangeUserRole = async (
    userId: number,
    newRole: AdminUserRole,
    extra?: { staffCode?: string; artistSpotifyId?: string }
  ) => {
    const target = users.find((u) => u.id === userId);
    try {
      await updateAdminUserRole(userId, newRole, extra);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                role: newRole,
                staffCode: extra?.staffCode || u.staffCode,
                artistSpotifyId: extra?.artistSpotifyId || u.artistSpotifyId,
              }
            : u
        )
      );
      recordAudit("CHANGE_ROLE", `@${target?.username}`, `Chuyển vai trò từ ${target?.role} sang ${newRole}`, "IAM", "info");
      addToast(`Đã cập nhật vai trò của "${target?.username}" thành ${newRole} thành công.`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi đổi vai trò: ${msg}`, "error");
    }
  };

  const handleRevokeDevice = async (deviceId: number) => {
    try {
      await revokeAdminDevice(deviceId);
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, status: "REVOKED" } : d))
      );
      recordAudit("REVOKE_DEVICE", `DEV-ID-${deviceId}`, "Thu hồi quyền nghe offline của thiết bị", "SECURITY", "warning");
      addToast("Đã thu hồi quyền thiết bị offline thành công.", "info");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi thu hồi thiết bị: ${msg}`, "error");
    }
  };

  // 2. Catalog Actions
  const handleTakedownTrack = async (trackId: string, reason: string) => {
    const target = tracks.find((t) => t.id === trackId);
    try {
      await takedownAdminTrack(trackId);
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, status: "taken_down" } : t))
      );
      recordAudit("TAKEDOWN_TRACK", target?.title || trackId, `Cưỡng chế gỡ bỏ khỏi sàn: ${reason}`, "CATALOG", "critical");
      addToast(`Đã cưỡng chế gỡ bài hát "${target?.title}" khỏi kho nhạc hệ thống.`, "error");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi gỡ bài hát: ${msg}`, "error");
    }
  };

  const handleRestoreTrack = async (trackId: string) => {
    const target = tracks.find((t) => t.id === trackId);
    try {
      await restoreAdminTrack(trackId);
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, status: "published" } : t))
      );
      recordAudit("RESTORE_TRACK", target?.title || trackId, "Khôi phục phát sóng / Public lại bài hát lên toàn sàn", "CATALOG", "info");
      addToast(`Đã khôi phục phát sóng bài hát "${target?.title || trackId}" thành công.`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi khôi phục bài hát: ${msg}`, "error");
    }
  };

  const handleChangeTrackVibe = (trackId: string, newVibe: CatalogTrack["vibeCategory"]) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, vibeCategory: newVibe } : t))
    );
    addToast(`Đã chuyển Vibe bài hát sang "${newVibe}".`, "success");
  };

  const handleTogglePackageStatus = async (packageId: number) => {
    try {
      await toggleAdminPackageStatus(packageId);
      const realPackages = await fetchAdminPackages();
      if (Array.isArray(realPackages) && realPackages.length > 0) {
        setPackages(realPackages);
      } else {
        setPackages((prev) =>
          prev.map((p) =>
            p.id === packageId
              ? { ...p, status: p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }
              : p
          )
        );
      }
      recordAudit("TOGGLE_PACKAGE", `PKG-00${packageId}`, "Bật/Tắt trạng thái hoạt động của gói cước", "BILLING", "info");
      addToast("Đã thay đổi trạng thái kích hoạt gói dịch vụ thành công.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi đổi trạng thái gói cước: ${msg}`, "error");
    }
  };

  const handleUpdatePackagePrice = async (packageId: number, newPrice: number) => {
    try {
      await updateAdminPackagePrice(packageId, newPrice);
      setPackages((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, price: newPrice } : p))
      );
      recordAudit("UPDATE_PACKAGE_PRICE", `PKG-00${packageId}`, `Cập nhật giá gói thành ${newPrice.toLocaleString()} VNĐ`, "BILLING", "info");
      addToast("Đã cập nhật biểu giá gói cước thành công.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi cập nhật giá: ${msg}`, "error");
    }
  };

  const handleRefundTransaction = async (transactionId: number) => {
    try {
      await refundAdminTransaction(transactionId);
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === transactionId ? { ...tx, status: "REFUNDED" } : tx
        )
      );
      recordAudit("PROCESS_REFUND", `TX-00${transactionId}`, "Thực hiện hoàn tiền cho giao dịch", "BILLING", "warning");
      addToast("Đã xử lý hoàn tiền cho giao dịch thành công.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi hoàn tiền: ${msg}`, "error");
    }
  };

  const handleCreatePackage = async (data: Partial<ServicePackage>) => {
    try {
      await createAdminPackage(data);
      const realPackages = await fetchAdminPackages();
      if (Array.isArray(realPackages) && realPackages.length > 0) {
        setPackages(realPackages);
      }
      recordAudit("CREATE_PACKAGE", data.name || "Gói Cước Mới", `Tạo gói cước mới với giá ${Number(data.price || 0).toLocaleString()} đ`, "BILLING", "info");
      addToast(`Đã tạo gói cước "${data.name || "mới"}" thành công vào cơ sở dữ liệu.`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi tạo gói cước: ${msg}`, "error");
    }
  };

  const handleUpdatePackageDetails = async (packageId: number, data: Partial<ServicePackage>) => {
    try {
      await updateAdminPackageDetails(packageId, data);
      const realPackages = await fetchAdminPackages();
      if (Array.isArray(realPackages) && realPackages.length > 0) {
        setPackages(realPackages);
      }
      recordAudit("UPDATE_PACKAGE", `PKG-00${packageId}`, `Cập nhật toàn diện thông tin và quyền lợi gói cước`, "BILLING", "info");
      addToast("Đã cập nhật chi tiết gói cước thành công vào cơ sở dữ liệu.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi cập nhật gói cước: ${msg}`, "error");
    }
  };

  const handleDeletePackage = async (packageId: number) => {
    const target = packages.find((p) => p.id === packageId);
    try {
      await deleteAdminPackage(packageId);
      const realPackages = await fetchAdminPackages();
      if (Array.isArray(realPackages)) {
        setPackages(realPackages.filter((p) => p.id !== packageId));
      } else {
        setPackages((prev) => prev.filter((p) => p.id !== packageId));
      }
      recordAudit("DELETE_PACKAGE", target?.name || `PKG-00${packageId}`, "Xóa / vô hiệu hóa gói cước khỏi hệ thống", "BILLING", "warning");
      addToast(`Đã xóa gói cước "${target?.name || packageId}" thành công khỏi cơ sở dữ liệu.`, "info");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi xóa gói cước: ${msg}`, "error");
    }
  };

  const handleCreateUser = async (data: {
    username: string;
    fullName: string;
    email: string;
    phone?: string;
    role: AdminUserRole;
    status: AdminUserStatus;
    password?: string;
  }) => {
    try {
      await createAdminUser(data);
      const realUsers = await fetchAdminUsers();
      if (Array.isArray(realUsers) && realUsers.length > 0) {
        setUsers(realUsers);
      }
      recordAudit("CREATE_USER", `@${data.username}`, `Tạo người dùng mới với vai trò ${data.role}`, "IAM", "info");
      addToast(`Đã tạo người dùng "${data.fullName}" thành công vào cơ sở dữ liệu.`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi tạo người dùng: ${msg}`, "error");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const target = users.find((u) => u.id === userId);
    try {
      await deleteAdminUser(userId);
      const realUsers = await fetchAdminUsers();
      if (Array.isArray(realUsers)) {
        setUsers(realUsers.filter((u) => u.id !== userId));
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
      recordAudit("DELETE_USER", `@${target?.username || userId}`, "Xóa tài khoản người dùng khỏi hệ thống", "IAM", "warning");
      addToast(`Đã xóa người dùng "${target?.fullName || target?.username}" thành công.`, "info");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi xóa người dùng: ${msg}`, "error");
    }
  };

  const handleUpdateUserProfile = async (
    userId: number,
    data: { fullName?: string; email?: string; phone?: string }
  ) => {
    try {
      await updateAdminUserProfile(userId, data);
      const realUsers = await fetchAdminUsers();
      if (Array.isArray(realUsers) && realUsers.length > 0) {
        setUsers(realUsers);
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, ...data } : u))
        );
      }
      recordAudit("UPDATE_USER_PROFILE", `User #${userId}`, "Cập nhật thông tin hồ sơ người dùng", "IAM", "info");
      addToast("Đã cập nhật thông tin người dùng thành công vào cơ sở dữ liệu.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi cập nhật thông tin người dùng: ${msg}`, "error");
    }
  };

  const handleResetUserPassword = async (userId: number) => {
    const target = users.find((u) => u.id === userId);
    try {
      await resetAdminUserPassword(userId);
      recordAudit(
        "RESET_PASSWORD",
        target?.fullName || `User #${userId}`,
        "Đặt lại mật khẩu về mặc định 123456",
        "IAM",
        "warning"
      );
      addToast(`Đã đặt lại mật khẩu cho "${target?.fullName}" về mặc định 123456 thành công.`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi đặt lại mật khẩu: ${msg}`, "error");
    }
  };

  // 4. System Settings Actions
  const handleSaveSettings = (settings: { aiThreshold: number; maxDevices: number }) => {
    recordAudit(
      "UPDATE_SYSTEM_CONFIG",
      "Core Settings",
      `Ngưỡng AI: ${(settings.aiThreshold * 100).toFixed(0)}%, Giới hạn thiết bị: ${settings.maxDevices}`,
      "SYSTEM",
      "info"
    );
    addToast("Đã lưu thiết lập tham số hệ thống thành công.", "success");
  };

  // ================= RENDER GUARD STATES =================
  if (authState === "checking") {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#07080b] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#ff7a2c] border-t-transparent" />
        <p className="mt-4 font-graphik text-[13px] tracking-[0.16em] uppercase text-white/50">
          Đang xác thực quyền Quản trị viên Moodify...
        </p>
      </div>
    );
  }

  if (authState === "denied") {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#07080b] p-6 text-center text-white">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-graphik text-[26px] font-semibold text-white">Truy Cập Bị Từ Chối (403 Forbidden)</h1>
        <p className="mt-2 max-w-md text-[14px] leading-6 text-white/50">
          Tài khoản của bạn không có vai trò Quản trị viên (ADMIN) để truy cập vào Studio Command Console.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href={USER_DASHBOARD_ROUTE}
            className="rounded-full bg-white/10 px-5 py-2.5 text-[13px] font-medium text-white hover:bg-white/15"
          >
            Về Trang Nghe Nhạc
          </Link>
          <Link
            href={HOME_ROUTE}
            className="rounded-full bg-[#ff7a2c] px-5 py-2.5 text-[13px] font-medium text-black hover:opacity-90"
          >
            Về Trang Chủ
          </Link>
        </div>
      </div>
    );
  }

  // ================= 5 CORE ADMIN TABS =================
  const CORE_ADMIN_TABS: { key: AdminTab; label: string; count?: number; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "overview", label: "Tổng Quan & BI", icon: LayoutDashboard },
    { key: "users", label: "Người Dùng (IAM)", count: users.length, icon: Users },
    { key: "catalog", label: "Kho Nhạc & Âm Học", count: tracks.length, icon: Music2 },
    { key: "monetization", label: "Gói Cước & Dòng Tiền", count: packages.length, icon: DollarSign },
    { key: "settings", label: "Cấu Hình & Audit Vault", icon: Settings },
  ];

  return (
    <div className="min-h-screen w-full bg-[#07080b] text-white font-sans flex">
      {/* Studio Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-30 z-0">
        <div className="absolute left-[15%] top-[5%] h-[500px] w-[500px] rounded-full bg-[#ff7a2c]/8 blur-[160px]" />
        <div className="absolute right-[10%] top-[25%] h-[450px] w-[450px] rounded-full bg-[#00f2fe]/8 blur-[160px]" />
      </div>

      {/* ================= LEFT SIDEBAR NAVIGATION ================= */}
      <aside className="w-72 shrink-0 border-r border-[#1a1d26] bg-[#090b11] flex flex-col justify-between sticky top-0 h-screen z-30 overflow-y-auto">
        {/* Top: Brand Logo & Ops Console Badge */}
        <div className="p-5 border-b border-[#1a1d26]">
          <Link href={HOME_ROUTE} className="flex items-center gap-2 group">
            <BrandLogo variant="horizontal-dark" className="h-8 w-auto transition-transform group-hover:scale-105" />
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#ff7a2c]/30 bg-[#ff7a2c]/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#ffb488]">
              <Shield className="h-3.5 w-3.5 text-[#ff7a2c]" /> BẢNG ĐIỀU HÀNH DOANH NGHIỆP
            </span>
          </div>
        </div>

        {/* Middle: Navigation Tabs List */}
        <div className="flex-1 px-4 py-5 space-y-1.5">
          <div className="px-3 pb-2 font-mono text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
            Phân Hệ Quản Trị
          </div>

          {CORE_ADMIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#ff7a2c] text-black font-bold shadow-md shadow-[#ff7a2c]/20"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? "text-black" : "text-zinc-400"}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-mono font-bold ${
                      isActive ? "bg-black/20 text-black" : "bg-white/10 text-zinc-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom: Admin Profile & Logout */}
        <div className="p-4 border-t border-[#1a1d26] bg-[#07080b]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-tr from-[#ff7a2c] to-[#00f2fe] flex items-center justify-center text-xs font-bold text-black font-mono shadow-md">
                {currentAdmin?.fullName.charAt(0) || "A"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {currentAdmin?.fullName || "Phạm Quốc Admin"}
                </div>
                <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
                  <span className="text-emerald-400 font-semibold">ADMIN</span> · @{currentAdmin?.username || "admin01"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Đăng xuất"
              className="p-2 rounded-lg border border-white/5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ================= RIGHT MAIN WORKSPACE ================= */}
      <div className="flex-1 min-w-0 min-h-screen flex flex-col z-10">
        {/* Top Navbar of Main Workspace: Breadcrumbs & Language */}
        <header className="h-14 px-6 border-b border-[#1a1d26] bg-[#07080b]/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2.5 font-mono text-xs">
            <span className="text-zinc-400">Moodify Ops</span>
            <span className="text-zinc-600">/</span>
            <span className="text-[#ff7a2c] font-semibold">
              {CORE_ADMIN_TABS.find((t) => t.key === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
          </div>
        </header>

        {/* Dynamic Tab Views Content */}
        <main className="p-6 lg:p-8 pb-28 flex-1 max-w-[1600px] w-full">
          {activeTab === "overview" && (
            <OverviewTab
              users={users}
              tracks={tracks}
              transactions={transactions}
              auditLogs={auditLogs}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "users" && (
            <UsersManagementTab
              users={users}
              devices={devices}
              onBanUser={handleBanUser}
              onUnbanUser={handleUnbanUser}
              onChangeUserRole={handleChangeUserRole}
              onRevokeDevice={handleRevokeDevice}
              onResetPassword={handleResetUserPassword}
              onCreateUser={handleCreateUser}
              onDeleteUser={handleDeleteUser}
              onUpdateProfile={handleUpdateUserProfile}
            />
          )}

          {activeTab === "catalog" && (
            <CatalogManagementTab
              tracks={tracks}
              onTakedownTrack={handleTakedownTrack}
              onRestoreTrack={handleRestoreTrack}
              onChangeTrackVibe={handleChangeTrackVibe}
              onPreviewTrack={handleTogglePreviewTrack}
              playingTrackId={previewTrack?.id || null}
              isPlayingPreview={isPlayingPreview}
            />
          )}

          {activeTab === "monetization" && (
            <MonetizationTab
              packages={packages}
              transactions={transactions}
              onTogglePackageStatus={handleTogglePackageStatus}
              onUpdatePackagePrice={handleUpdatePackagePrice}
              onCreatePackage={handleCreatePackage}
              onUpdatePackageDetails={handleUpdatePackageDetails}
              onDeletePackage={handleDeletePackage}
              onRefundTransaction={handleRefundTransaction}
            />
          )}

          {activeTab === "settings" && (
            <SystemSettingsTab
              auditLogs={auditLogs}
              onSaveSettings={handleSaveSettings}
            />
          )}
        </main>
      </div>

      {/* Global Audio Preview Player Dock */}
      {previewTrack && (
        <AdminAudioPlayerDock
          track={previewTrack}
          isPlaying={isPlayingPreview}
          onTogglePlay={(playing) => setIsPlayingPreview(playing)}
          onClose={() => {
            setPreviewTrack(null);
            setIsPlayingPreview(false);
          }}
        />
      )}

      {/* Floating Notifications Toast Stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-[18px] border p-3.5 shadow-2xl backdrop-blur-xl anim-fade-up ${
              toast.type === "success"
                ? "border-emerald-500/30 bg-[#0d1f17]/95 text-emerald-300"
                : toast.type === "error"
                ? "border-rose-500/30 bg-[#250e12]/95 text-rose-300"
                : toast.type === "warning"
                ? "border-amber-500/30 bg-[#241a0b]/95 text-amber-300"
                : "border-sky-500/30 bg-[#0c1a29]/95 text-sky-300"
            }`}
          >
            <div className="flex items-center gap-2.5 text-[13px]">
              {toast.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
              {toast.type === "error" && <XCircle className="h-4 w-4 shrink-0" />}
              {toast.type === "warning" && <AlertCircle className="h-4 w-4 shrink-0" />}
              {toast.type === "info" && <HelpCircle className="h-4 w-4 shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-white/40 hover:text-white shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
