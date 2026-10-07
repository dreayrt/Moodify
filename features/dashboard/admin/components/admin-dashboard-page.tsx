"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Heart,
  HelpCircle,
  Key,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Music2,
  Radio,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  XCircle,
} from "lucide-react";

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
  fetchAdminSubscriptions,
  cancelAdminSubscription,
  fetchAdminUsers,
  fetchAdminOverview,
  fetchAdminAuditLogs,
  type AdminOverviewResponse,
  takedownAdminTrack,
  restoreAdminTrack,
  updateAdminTrackGenre,
  deleteAdminTrack,
  updateAdminPackagePrice,
  updateAdminUserRole,
  updateAdminUserStatus,
  createAdminPackage,
  updateAdminPackageDetails,
  deleteAdminPackage,
  toggleAdminPackageStatus,
  resetAdminUserPassword,
  createAdminUser,
  updateAdminUserProfile,
  revokeAdminDevice,
  fetchAdminModerationQueue,
  fetchAdminReviewActions,
  submitAdminReviewDecision,
  fetchAdminLicensing,
  createAdminDistributor,
  updateAdminDistributor,
  toggleAdminDistributorStatus,
  createAdminContract,
  updateAdminContract,
  updateAdminContractStatus,
} from "@/lib/api/admin-client";
import {
  AdminTab,
  AdminToast,
  AdminUser,
  AdminUserRole,
  AdminUserStatus,
  AdminUserSubscription,
  CatalogTrack,
  DistributionContract,
  Distributor,
  PaymentTransaction,
  ReviewAction,
  ReviewRequest,
  ServicePackage,
  SongLicense,
  SystemAuditLog,
  UserDevice,
} from "../types";

import { OverviewTab } from "./overview-tab";
import { UsersManagementTab } from "./users-management-tab";
import { CatalogManagementTab } from "./catalog-management-tab";
import { FavoritesManagementTab } from "./favorites-management-tab";
import { ModerationTab } from "./moderation-tab";
import { MonetizationTab } from "./monetization-tab";
import { LicensingTab } from "./licensing-tab";
import { NotificationsTab } from "./notifications-tab";
import { AdminAudioPlayerDock } from "./shared/admin-audio-player-dock";

const HOME_ROUTE = "/dashboard";
const USER_DASHBOARD_ROUTE = "/dashboard/user";
const CONTENT_LEAD_DASHBOARD_ROUTE = "/dashboard/content-lead";
const ARTIST_DASHBOARD_ROUTE = "/dashboard/content-lead";

export default function AdminDashboardPage() {
  const router = useRouter();

  // Auth & Guard State
  const [authState, setAuthState] = useState<"checking" | "allowed" | "denied">("checking");
  const [currentAdmin, setCurrentAdmin] = useState<UserProfileResponse | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Active Core Tab
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // Domain States (100% Real Database, khởi tạo mảng rỗng thay vì mock data)
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [tracks, setTracks] = useState<CatalogTrack[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [reviews, setReviews] = useState<ReviewRequest[]>([]);
  const [reviewActions, setReviewActions] = useState<ReviewAction[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [contracts, setContracts] = useState<DistributionContract[]>([]);
  const [licenses, setLicenses] = useState<SongLicense[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminUserSubscription[]>([]);
  // Nhật ký hành chính: bản ghi thật từ backend + bản ghi của phiên làm việc hiện tại
  const [backendAuditLogs, setBackendAuditLogs] = useState<SystemAuditLog[]>([]);
  const [sessionAuditLogs, setSessionAuditLogs] = useState<SystemAuditLog[]>([]);
  const [overviewData, setOverviewData] = useState<AdminOverviewResponse | null>(null);

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

  // Nhật ký hành chính hiển thị = bản ghi thật từ backend (MongoDB) + bản ghi phiên làm việc
  const auditLogs = useMemo<SystemAuditLog[]>(
    () => [...sessionAuditLogs, ...backendAuditLogs],
    [sessionAuditLogs, backendAuditLogs]
  );

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
      operatorName: currentAdmin?.fullName || "Quản trị viên",
      operatorRole: "ADMIN",
      category,
      action,
      target,
      details,
      severity,
    };
    setSessionAuditLogs((prev) => [newLog, ...prev]);
  };

  // ================= LOAD REAL DATA FROM DB =================
  const loadRealData = async (silent = false) => {
    setIsLoadingData(true);
    setDbStatus("connecting");
    try {
      const [
        usersRes,
        catalogRes,
        packagesRes,
        transactionsRes,
        moderationRes,
        actionsRes,
        licensingRes,
        overviewRes,
        auditRes,
        subscriptionsRes,
      ] = await Promise.allSettled([
        fetchAdminUsers(),
        fetchAdminCatalog(),
        fetchAdminPackages(),
        fetchAdminTransactions(),
        fetchAdminModerationQueue(),
        fetchAdminReviewActions(),
        fetchAdminLicensing(),
        fetchAdminOverview(),
        fetchAdminAuditLogs(),
        fetchAdminSubscriptions(),
      ]);

      let successCount = 0;

      if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value)) {
        setUsers(usersRes.value);
        successCount++;
      }
      if (catalogRes.status === "fulfilled" && Array.isArray(catalogRes.value)) {
        setTracks(catalogRes.value);
        successCount++;
      }
      if (packagesRes.status === "fulfilled" && Array.isArray(packagesRes.value)) {
        setPackages(packagesRes.value);
        successCount++;
      }
      if (transactionsRes.status === "fulfilled" && Array.isArray(transactionsRes.value)) {
        setTransactions(transactionsRes.value);
        successCount++;
      }
      if (subscriptionsRes.status === "fulfilled" && Array.isArray(subscriptionsRes.value)) {
        setSubscriptions(subscriptionsRes.value);
        successCount++;
      }
      if (moderationRes.status === "fulfilled" && Array.isArray(moderationRes.value)) {
        setReviews(moderationRes.value);
        successCount++;
      }
      if (actionsRes.status === "fulfilled" && Array.isArray(actionsRes.value)) {
        setReviewActions(actionsRes.value);
        successCount++;
      }
      if (overviewRes.status === "fulfilled" && overviewRes.value) {
        setOverviewData(overviewRes.value);
        successCount++;
      }
      if (licensingRes.status === "fulfilled" && licensingRes.value) {
        if (Array.isArray(licensingRes.value.distributors)) {
          setDistributors(licensingRes.value.distributors);
        }
        if (Array.isArray(licensingRes.value.contracts)) {
          setContracts(licensingRes.value.contracts);
        }
        if (Array.isArray(licensingRes.value.licenses)) {
          setLicenses(licensingRes.value.licenses);
        }
        successCount++;
      }
      if (auditRes.status === "fulfilled" && Array.isArray(auditRes.value)) {
        // Map nhật ký backend (MongoDB) sang định dạng hiển thị của tab Cài Đặt
        const categoryFor = (action: string): SystemAuditLog["category"] => {
          if (action.includes("ROLE") || action.includes("BAN") || action.includes("USER") || action.includes("PASSWORD")) return "IAM";
          if (action.includes("TRACK") || action.includes("CATALOG")) return "CATALOG";
          if (action.includes("PACKAGE") || action.includes("REFUND") || action.includes("PAYMENT")) return "BILLING";
          if (action.includes("MODERATION") || action.includes("REVIEW")) return "MODERATION";
          if (action.includes("DEVICE") || action.includes("TOKEN")) return "SECURITY";
          return "SYSTEM";
        };
        setBackendAuditLogs(
          auditRes.value.map((log) => ({
            id: log.id,
            timestamp: log.createdAt || "",
            operatorName: log.operatorName || "Hệ thống",
            operatorRole: log.operatorRole || "SYSTEM",
            category: categoryFor(log.action || ""),
            action: log.action,
            target: log.targetEntity ? `${log.targetEntity}${log.targetId ? ` #${log.targetId}` : ""}` : "—",
            details: log.details || "",
            severity: "info" as const,
          }))
        );
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
          addToast(`Đã đồng bộ trực tiếp dữ liệu quản trị hệ thống (${users.length} người dùng, ${tracks.length} bài hát).`, "success");
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
  // Fail-closed: chỉ cho phép vào khi có token hợp lệ VÀ vai trò là ADMIN.
  // Không còn auto-login bằng tài khoản cứng và không còn mở khóa khi backend lỗi.
  useEffect(() => {
    let cancelled = false;

    const guardAdminAccess = async () => {
      try {
        const token = await getValidAccessToken();
        if (!token) {
          if (!cancelled) setAuthState("denied");
          return;
        }

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
      } catch (err) {
        console.warn("Admin Guard error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
          clearAuthSession();
        }
        if (!cancelled) setAuthState("denied");
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

  const handleDeleteTrack = async (trackId: string) => {
    const target = tracks.find((t) => t.id === trackId);
    try {
      await deleteAdminTrack(trackId);
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
      recordAudit("DELETE_TRACK", target?.title || trackId, "Xóa vĩnh viễn bài hát khỏi danh mục hệ thống và MongoDB", "CATALOG", "critical");
      addToast(`Đã xóa vĩnh viễn bài hát "${target?.title || trackId}" khỏi hệ thống thành công.`, "warning");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi xóa bài hát";
      addToast(msg, "error");
    }
  };

  const handleChangeTrackGenre = async (trackId: string, newGenre: string) => {
    const target = tracks.find((t) => t.id === trackId);
    try {
      await updateAdminTrackGenre(trackId, newGenre);
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, genre: newGenre } : t))
      );
      recordAudit("UPDATE_TRACK_GENRE", target?.title || trackId, `Cập nhật thể loại bài hát thành ${newGenre} trong MongoDB`, "CATALOG", "info");
      addToast(`Đã cập nhật thể loại bài hát "${target?.title || trackId}" thành "${newGenre}".`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi đổi thể loại";
      addToast(msg, "error");
    }
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

  const handleCancelSubscription = async (subscriptionId: number) => {
    try {
      await cancelAdminSubscription(subscriptionId);
      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub.id === subscriptionId ? { ...sub, status: "CANCELLED" } : sub
        )
      );
      recordAudit("CANCEL_SUBSCRIPTION", `SUB-00${subscriptionId}`, "Hủy gói thuê bao người dùng", "BILLING", "warning");
      addToast(`Đã hủy gói thuê bao #${subscriptionId} thành công.`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi hủy gói: ${msg}`, "error");
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
      const res = await resetAdminUserPassword(userId);
      const tempPassword =
        "tempPassword" in res && typeof res.tempPassword === "string" ? res.tempPassword : "";
      recordAudit(
        "RESET_PASSWORD",
        target?.fullName || `User #${userId}`,
        "Đặt lại mật khẩu bằng mật khẩu tạm ngẫu nhiên",
        "IAM",
        "warning"
      );
      addToast(
        tempPassword
          ? `Đã đặt lại mật khẩu cho "${target?.fullName}". Mật khẩu tạm: ${tempPassword} (vui lòng ghi lại và chia sẻ cho người dùng).`
          : `Đã đặt lại mật khẩu cho "${target?.fullName}" thành công.`,
        "success"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi đặt lại mật khẩu: ${msg}`, "error");
    }
  };

  // 4. Licensing Real Actions

  const handleCreateDistributor = async (data: Partial<Distributor>) => {
    try {
      await createAdminDistributor(data);
      const licRes = await fetchAdminLicensing();
      if (licRes?.distributors) setDistributors(licRes.distributors);
      addToast("Đã thêm nhà phân phối đối tác mới thành công.", "success");
      recordAudit("CREATE_DISTRIBUTOR", data.companyName || "Đối tác", "Tạo đối tác phân phối mới", "SYSTEM", "info");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi thêm nhà phân phối";
      addToast(msg, "error");
    }
  };

  const handleToggleDistributorStatus = async (distributorId: number) => {
    try {
      await toggleAdminDistributorStatus(distributorId);
      const licRes = await fetchAdminLicensing();
      if (licRes?.distributors) setDistributors(licRes.distributors);
      addToast("Đã cập nhật trạng thái nhà phân phối thành công.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi cập nhật trạng thái";
      addToast(msg, "error");
    }
  };

  const handleCreateContract = async (data: Partial<DistributionContract>) => {
    try {
      await createAdminContract(data);
      const licRes = await fetchAdminLicensing();
      if (licRes?.contracts) setContracts(licRes.contracts);
      addToast("Đã ký hợp đồng phân phối mới thành công.", "success");
      recordAudit("CREATE_CONTRACT", data.contractCode || "Hợp đồng", "Lập hợp đồng phân phối mới", "SYSTEM", "info");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi tạo hợp đồng";
      addToast(msg, "error");
    }
  };

  const handleToggleContractStatus = async (contractId: number, status: string) => {
    try {
      await updateAdminContractStatus(contractId, status);
      const licRes = await fetchAdminLicensing();
      if (licRes?.contracts) setContracts(licRes.contracts);
      addToast("Đã cập nhật trạng thái hợp đồng thành công.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi cập nhật hợp đồng";
      addToast(msg, "error");
    }
  };

  // 5. Moderation Actions
  const handleApproveReview = async (requestId: number) => {
    try {
      await submitAdminReviewDecision(requestId, "APPROVE");
      setReviews((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "APPROVED" } : r))
      );
      try {
        const freshActions = await fetchAdminReviewActions();
        if (Array.isArray(freshActions)) setReviewActions(freshActions);
      } catch {}
      recordAudit("APPROVE_TRACK", `Yêu cầu #${requestId}`, "Phê duyệt phát hành bài hát/album mới", "MODERATION", "info");
      addToast("Đã phê duyệt xuất bản tác phẩm thành công.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi phê duyệt: ${msg}`, "error");
    }
  };

  const handleRejectReview = async (requestId: number, reason: string) => {
    try {
      await submitAdminReviewDecision(requestId, "REJECT", reason);
      setReviews((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "REJECTED" } : r))
      );
      try {
        const freshActions = await fetchAdminReviewActions();
        if (Array.isArray(freshActions)) setReviewActions(freshActions);
      } catch {}
      recordAudit("REJECT_TRACK", `Yêu cầu #${requestId}`, `Từ chối phát hành: ${reason}`, "MODERATION", "warning");
      addToast("Đã từ chối tác phẩm.", "warning");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi từ chối: ${msg}`, "error");
    }
  };

  const handleReturnReview = async (requestId: number, reason: string) => {
    try {
      await submitAdminReviewDecision(requestId, "RETURN_FOR_EDIT", reason);
      setReviews((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "IN_REVIEW" } : r))
      );
      try {
        const freshActions = await fetchAdminReviewActions();
        if (Array.isArray(freshActions)) setReviewActions(freshActions);
      } catch {}
      recordAudit("RETURN_TRACK", `Yêu cầu #${requestId}`, `Yêu cầu chỉnh sửa: ${reason}`, "MODERATION", "info");
      addToast("Đã gửi yêu cầu chỉnh sửa cho nghệ sĩ.", "info");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi gửi yêu cầu sửa: ${msg}`, "error");
    }
  };

  // ================= RENDER GUARD STATES =================
  if (authState === "checking") {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0e0f14] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#ff5500] border-t-transparent" />
        <p className="mt-4 font-graphik text-[13px] tracking-[0.16em] uppercase text-zinc-400">
          Đang xác thực quyền Quản trị viên Moodify...
        </p>
      </div>
    );
  }

  if (authState === "denied") {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0e0f14] p-6 text-center text-white">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-graphik text-[26px] font-semibold text-white">Truy Cập Bị Từ Chối (403 Forbidden)</h1>
        <p className="mt-2 max-w-md text-[14px] leading-6 text-zinc-400">
          Tài khoản của bạn không có vai trò Quản trị viên (ADMIN) để truy cập vào Bảng điều khiển quản trị.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href={USER_DASHBOARD_ROUTE}
            className="rounded-xl border border-[#222432] bg-[#171822] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-white/10 transition active:scale-[0.98]"
          >
            Về Trang Nghe Nhạc
          </Link>
          <Link
            href={HOME_ROUTE}
            className="rounded-xl bg-[#ff5500] px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-[#ff5500]/25 hover:brightness-110 transition active:scale-[0.98]"
          >
            Về Trang Chủ
          </Link>
        </div>
      </div>
    );
  }

  // ================= 8 CORE ADMIN TABS =================
  const pendingModerationCount = reviews.filter((r) => r.status === "PENDING" || r.status === "IN_REVIEW").length;

  const CORE_ADMIN_TABS: { key: AdminTab; label: string; count?: number; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "overview", label: "Tổng Quan", icon: LayoutDashboard },
    { key: "users", label: "Người Dùng", count: users.length, icon: Users },
    { key: "monetization", label: "Gói Dịch Vụ", count: packages.length, icon: DollarSign },
    { key: "catalog", label: "Bài Hát", count: tracks.length, icon: Music2 },
    { key: "favorites", label: "Yêu Thích", count: overviewData?.totalFavorites, icon: Heart },
    { key: "moderation", label: "Kiểm Duyệt", count: pendingModerationCount, icon: ShieldCheck },
    { key: "licensing", label: "Bản Quyền", count: contracts.length, icon: Key },
    { key: "notifications", label: "Thông Báo", icon: Megaphone },
  ];

  return (
    <div className="min-h-screen w-full bg-[#0e0f14] text-white font-sans flex antialiased">
      {/* ================= LEFT SIDEBAR NAVIGATION ================= */}
      <aside className="w-64 shrink-0 border-r border-[#222432] bg-[#12131a] flex flex-col justify-between sticky top-0 h-screen z-30 select-none">
        {/* Top: Brand Logo & Station Badge */}
        <div className="p-5 border-b border-[#222432]">
          <Link href={HOME_ROUTE} className="flex items-center gap-2 group">
            <BrandLogo variant="horizontal-dark" className="h-7 w-auto transition-transform group-hover:scale-[1.02]" />
          </Link>
        </div>

        {/* Middle: Navigation Tabs List */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Danh Mục Quản Trị
          </div>

          {CORE_ADMIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-[#ff5500] text-white font-bold shadow-md shadow-[#ff5500]/25"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-zinc-400"}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold ${
                      isActive ? "bg-black/25 text-white" : "bg-white/[0.06] text-zinc-400"
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
        <div className="p-3.5 border-t border-[#222432] bg-[#0e0f14]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-[#ff5500] flex items-center justify-center text-xs font-bold text-white font-mono shadow-sm">
                {currentAdmin?.fullName.charAt(0) || "A"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {currentAdmin?.fullName || "Quản trị viên"}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono truncate">
                  @{currentAdmin?.username || "admin"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Đăng xuất"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ================= RIGHT MAIN WORKSPACE ================= */}
      <div className="flex-1 min-w-0 min-h-screen flex flex-col z-10 bg-[#0e0f14]">
        {/* Top Navbar */}
        <header className="h-14 px-6 border-b border-[#222432] bg-[#12131a]/95 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-zinc-500">Moodify Operations</span>
              <span className="text-zinc-700">/</span>
              <span className="text-white font-semibold">
                {CORE_ADMIN_TABS.find((t) => t.key === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/user"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#222432] bg-[#171822] text-xs font-semibold text-zinc-300 hover:text-white hover:border-[#ff5500]/50 hover:bg-[#ff5500]/10 transition active:scale-[0.98]"
              title="Mở giao diện nghe nhạc dành cho người dùng"
            >
              <Radio className="h-3.5 w-3.5 text-[#ff5500]" />
              <span>Giao Diện Nghe Nhạc</span>
            </Link>
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
              overviewData={overviewData}
              previewTrack={previewTrack}
              isPlayingPreview={isPlayingPreview}
              onTogglePreview={handleTogglePreviewTrack}
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
              onUpdateProfile={handleUpdateUserProfile}
            />
          )}

          {activeTab === "catalog" && (
            <CatalogManagementTab
              tracks={tracks}
              onTakedownTrack={handleTakedownTrack}
              onRestoreTrack={handleRestoreTrack}
              onChangeTrackGenre={handleChangeTrackGenre}
              onDeleteTrack={handleDeleteTrack}
              onPreviewTrack={handleTogglePreviewTrack}
              playingTrackId={previewTrack?.id || null}
              isPlayingPreview={isPlayingPreview}
            />
          )}

          {activeTab === "favorites" && (
            <FavoritesManagementTab
              previewTrack={previewTrack}
              isPlayingPreview={isPlayingPreview}
              onTogglePreview={handleTogglePreviewTrack}
              onToast={addToast}
            />
          )}

          {activeTab === "moderation" && (
            <ModerationTab
              reviews={reviews}
              reviewActions={reviewActions}
              onApproveReview={handleApproveReview}
              onRejectReview={handleRejectReview}
              onReturnReview={handleReturnReview}
            />
          )}

          {activeTab === "monetization" && (
            <MonetizationTab
              packages={packages}
              transactions={transactions}
              subscriptions={subscriptions}
              onTogglePackageStatus={handleTogglePackageStatus}
              onUpdatePackagePrice={handleUpdatePackagePrice}
              onCreatePackage={handleCreatePackage}
              onUpdatePackageDetails={handleUpdatePackageDetails}
              onDeletePackage={handleDeletePackage}
              onCancelSubscription={handleCancelSubscription}
            />
          )}

          {activeTab === "licensing" && (
            <LicensingTab
              distributors={distributors}
              contracts={contracts}
              licenses={licenses}
              onCreateDistributor={handleCreateDistributor}
              onToggleDistributorStatus={handleToggleDistributorStatus}
              onCreateContract={handleCreateContract}
              onToggleContractStatus={handleToggleContractStatus}
            />
          )}

          {activeTab === "notifications" && <NotificationsTab onToast={addToast} />}
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
