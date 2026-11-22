"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  DollarSign,
  Heart,
  HelpCircle,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";

import "./admin-layout.css";
import { BrandLogo } from "@/components/shared/logo-mark";
import {
  clearAuthSession,
  getCurrentUser,
  getValidAccessToken,
  logoutAndRedirect,
  pingDeviceStatus,
  registerCurrentDevice,
  type UserProfileResponse,
} from "@/lib/auth/auth-client";
import {
  fetchAdminPackages,
  fetchAdminTransactions,
  fetchAdminRevenueStats,
  fetchAdminSubscriptions,
  cancelAdminSubscription,
  fetchAdminUsers,
  fetchAdminOverview,
  fetchAdminAuditLogs,
  type AdminOverviewResponse,
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
  revokeAllAdminUserDevices,
} from "@/lib/api/admin-client";
import {
  AdminTab,
  AdminPreviewTrack,
  AdminRevenueStats,
  AdminToast,
  AdminUser,
  AdminUserRole,
  AdminUserStatus,
  AdminUserSubscription,
  PaymentTransaction,
  ServicePackage,
  SystemAuditLog,
  UserDevice,
} from "../types";

import { OverviewTab } from "./overview-tab";
import { UsersManagementTab } from "./users-management-tab";
import { FavoritesManagementTab } from "./favorites-management-tab";
import { MonetizationTab } from "./monetization-tab";
import { NotificationsTab } from "./notifications-tab";
import { KaraokeResourcesTab } from "./karaoke-resources-tab";
import { RecommendationsCurationTab } from "./recommendations-curation-tab";
import { AdminAudioPlayerDock } from "./shared/admin-audio-player-dock";

const USER_DASHBOARD_ROUTE = "/dashboard/user";
const CONTENT_LEAD_DASHBOARD_ROUTE = "/dashboard/content-lead";

export default function AdminDashboardPage({
  initialTab = "overview",
}: {
  initialTab?: AdminTab;
}) {
  const router = useRouter();

  // Auth & Guard State
  const [authState, setAuthState] = useState<"checking" | "allowed" | "denied">("checking");
  const [currentAdmin, setCurrentAdmin] = useState<UserProfileResponse | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const isForcingLogoutRef = useRef(false);

  // Active Core Tab
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Data loaded from the administrative API.
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminUserSubscription[]>([]);
  const [revenueDays, setRevenueDays] = useState<7 | 30 | 90>(30);
  const [revenueStats, setRevenueStats] = useState<AdminRevenueStats | null>(null);
  const [loadingRevenueStats, setLoadingRevenueStats] = useState(false);

  // Nhật ký hành chính: bản ghi thật từ backend + bản ghi của phiên làm việc hiện tại
  const [backendAuditLogs, setBackendAuditLogs] = useState<SystemAuditLog[]>([]);
  const [sessionAuditLogs, setSessionAuditLogs] = useState<SystemAuditLog[]>([]);
  const [overviewData, setOverviewData] = useState<AdminOverviewResponse | null>(null);

  // Global Audio Preview Player state
  const [previewTrack, setPreviewTrack] = useState<AdminPreviewTrack | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const handleTogglePreviewTrack = (track: AdminPreviewTrack) => {
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
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataErrors, setDataErrors] = useState<string[]>([]);
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
  const loadRealData = async (silent = false, daysParam: 7 | 30 | 90 = revenueDays) => {
    setIsLoadingData(true);
    setDbStatus("connecting");
    try {
      const [
        usersRes,
        packagesRes,
        transactionsRes,
        revenueStatsRes,
        overviewRes,
        auditRes,
        subscriptionsRes,
      ] = await Promise.allSettled([
        fetchAdminUsers(),
        fetchAdminPackages(),
        fetchAdminTransactions(),
        fetchAdminRevenueStats(daysParam),
        fetchAdminOverview(),
        fetchAdminAuditLogs(),
        fetchAdminSubscriptions(),
      ]);

      const results = [
        usersRes,
        packagesRes,
        transactionsRes,
        revenueStatsRes,
        overviewRes,
        auditRes,
        subscriptionsRes,
      ];
      const labels = [
        "Người dùng",
        "Gói dịch vụ",
        "Giao dịch",
        "Thống kê doanh thu",
        "Tổng quan",
        "Nhật ký",
        "Đăng ký gói",
      ];
      const failures = results.flatMap((result, index) =>
        result.status === "rejected"
          ? [`${labels[index]}: ${result.reason instanceof Error ? result.reason.message : "Không tải được dữ liệu"}`]
          : []
      );
      setDataErrors(failures);
      let successCount = 0;

      if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value)) {
        setUsers(usersRes.value);
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
      if (revenueStatsRes.status === "fulfilled" && revenueStatsRes.value) {
        setRevenueStats(revenueStatsRes.value);
        successCount++;
      }
      if (subscriptionsRes.status === "fulfilled" && Array.isArray(subscriptionsRes.value)) {
        setSubscriptions(subscriptionsRes.value);
        successCount++;
      }
      if (overviewRes.status === "fulfilled" && overviewRes.value) {
        setOverviewData(overviewRes.value);
        successCount++;
      }
      if (auditRes.status === "fulfilled" && Array.isArray(auditRes.value)) {
        // Map nhật ký backend (MongoDB) sang định dạng hiển thị của tab Cài Đặt
        const categoryFor = (action: string): SystemAuditLog["category"] => {
          if (action.includes("ROLE") || action.includes("BAN") || action.includes("USER") || action.includes("PASSWORD")) return "IAM";
          if (action.includes("TRACK") || action.includes("CATALOG")) return "CATALOG";
          if (action.includes("PACKAGE") || action.includes("REFUND") || action.includes("PAYMENT")) return "BILLING";
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

      if (successCount > 0 && failures.length === 0) {
        setDbStatus("connected");
        setLastSyncTime(syncStr);
        if (!silent) {
          addToast("Đã cập nhật dữ liệu quản trị từ máy chủ.", "success");
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
        void registerCurrentDevice();
        void loadRealData(true);
      } catch (err) {
        console.warn("Admin Guard error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("401") || msg.toLowerCase().includes("unauthorized") || msg.includes("DEVICE_REVOKED")) {
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

  const forceAdminSignOut = useCallback((message?: string) => {
    if (isForcingLogoutRef.current) return;
    isForcingLogoutRef.current = true;
    if (message) {
      addToast(message, "warning");
    }
    logoutAndRedirect();
  }, []);

  useEffect(() => {
    if (authState !== "allowed") return;

    const handleSessionInvalidated = (event: Event) => {
      const detail = (event as CustomEvent<{ reason?: string; message?: string }>).detail;
      forceAdminSignOut(detail?.message || "Phiên đăng nhập quản trị đã hết hạn hoặc bị thu hồi.");
    };

    const handleDeviceRevoked = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      forceAdminSignOut(detail?.message || "Phiên quản trị trên thiết bị này đã bị thu hồi.");
    };

    window.addEventListener("moodify:admin-session-invalidated", handleSessionInvalidated);
    window.addEventListener("moodify:device-revoked", handleDeviceRevoked);

    const heartbeatTimer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void pingDeviceStatus()
        .then((res) => {
          if (res && res.active === false) {
            forceAdminSignOut("Phiên đăng nhập quản trị trên thiết bị này đã bị thu hồi.");
          }
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("DEVICE_REVOKED") || msg.includes("401")) {
            forceAdminSignOut(msg);
          }
        });
    }, 30_000);

    return () => {
      window.removeEventListener("moodify:admin-session-invalidated", handleSessionInvalidated);
      window.removeEventListener("moodify:device-revoked", handleDeviceRevoked);
      clearInterval(heartbeatTimer);
    };
  }, [authState, forceAdminSignOut]);

  const handleRevenueDaysChange = async (days: 7 | 30 | 90) => {
    setRevenueDays(days);
    setLoadingRevenueStats(true);
    try {
      const stats = await fetchAdminRevenueStats(days);
      setRevenueStats(stats);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Không tải được thống kê doanh thu.", "error");
    } finally {
      setLoadingRevenueStats(false);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    if (loggingOut) return;
    setLoggingOut(true);
    logoutAndRedirect();
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
            ? { ...u, status: "BANNED", banReason: reason, bannedUntil: duration, devicesCount: 0 }
            : u
        )
      );
      recordAudit("BAN_USER", `@${target?.username}`, `Khóa tài khoản: ${reason}`, "IAM", "critical");
      addToast(`Đã khóa tài khoản "${target?.username}" và thu hồi toàn bộ phiên đăng nhập.`, "warning");
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
      recordAudit("UNBAN_USER", `@${target?.username}`, `Mở khóa quyền truy cập cho tài khoản.`, "IAM", "info");
      addToast(`Đã mở khóa tài khoản "${target?.username}".`, "success");
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
      const freshUsers = await fetchAdminUsers().catch(() => null);
      if (Array.isArray(freshUsers)) {
        setUsers(freshUsers);
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  role: newRole,
                  artistSpotifyId: extra?.artistSpotifyId || u.artistSpotifyId,
                  devicesCount: 0,
                }
              : u
          )
        );
      }
      const roleLabels: Record<string, string> = {
        USER: "Người nghe",
        CONTENT_LEAD: "Quản lý nội dung",
        ARTIST: "Nghệ sĩ",
        MODERATOR: "Kiểm duyệt viên",
        ADMIN: "Quản trị viên",
      };
      const roleLabel = roleLabels[newRole] || newRole;
      recordAudit("CHANGE_ROLE", `@${target?.username}`, `Chuyển vai trò sang ${roleLabel}`, "IAM", "info");
      addToast(`Đã đổi vai trò của "${target?.username}" sang ${roleLabel} và làm mới phiên đăng nhập.`, "success");
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
      const freshUsers = await fetchAdminUsers().catch(() => null);
      if (Array.isArray(freshUsers)) setUsers(freshUsers);
      recordAudit("REVOKE_DEVICE", `DEV-ID-${deviceId}`, "Thu hồi phiên đăng nhập thiết bị", "SECURITY", "warning");
      addToast("Đã thu hồi phiên thiết bị.", "info");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi thu hồi thiết bị: ${msg}`, "error");
    }
  };

  const handleRevokeAllUserDevices = async (userId: number) => {
    try {
      const res = await revokeAllAdminUserDevices(userId);
      const freshUsers = await fetchAdminUsers().catch(() => null);
      if (Array.isArray(freshUsers)) setUsers(freshUsers);
      setDevices((prev) => prev.map((d) => (d.userId === userId ? { ...d, status: "REVOKED" } : d)));
      recordAudit("REVOKE_ALL_DEVICES", `User #${userId}`, res.message || "Thu hồi tất cả phiên đăng nhập", "SECURITY", "warning");
      addToast(res.message || "Đã thu hồi tất cả phiên đăng nhập đang hoạt động.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi thu hồi phiên đăng nhập: ${msg}`, "error");
    }
  };

  // 2. Monetization Actions

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
      recordAudit("TOGGLE_PACKAGE", `PKG-00${packageId}`, "Bật/Tắt trạng thái gói cước", "BILLING", "info");
      addToast("Đã thay đổi trạng thái gói dịch vụ.", "success");
      void fetchAdminRevenueStats(revenueDays).then(setRevenueStats).catch(() => {});
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
      addToast("Đã cập nhật giá gói cước.", "success");
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
      addToast(`Đã hủy gói thuê bao #${subscriptionId}.`, "success");
      void fetchAdminRevenueStats(revenueDays).then(setRevenueStats).catch(() => {});
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
      recordAudit("CREATE_PACKAGE", data.name || "Gói mới", `Tạo gói dịch vụ mới với giá ${Number(data.price || 0).toLocaleString()} đ`, "BILLING", "info");
      addToast(`Đã tạo gói dịch vụ "${data.name || "mới"}".`, "success");
      void fetchAdminRevenueStats(revenueDays).then(setRevenueStats).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi tạo gói dịch vụ: ${msg}`, "error");
    }
  };

  const handleUpdatePackageDetails = async (packageId: number, data: Partial<ServicePackage>) => {
    try {
      await updateAdminPackageDetails(packageId, data);
      const realPackages = await fetchAdminPackages();
      if (Array.isArray(realPackages) && realPackages.length > 0) {
        setPackages(realPackages);
      }
      recordAudit("UPDATE_PACKAGE", `PKG-00${packageId}`, `Cập nhật thông tin và quyền lợi gói dịch vụ`, "BILLING", "info");
      addToast("Đã cập nhật chi tiết gói dịch vụ.", "success");
      void fetchAdminRevenueStats(revenueDays).then(setRevenueStats).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi cập nhật gói dịch vụ: ${msg}`, "error");
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
      recordAudit("DELETE_PACKAGE", target?.name || `PKG-00${packageId}`, "Xóa gói dịch vụ khỏi hệ thống", "BILLING", "warning");
      addToast(`Đã xóa gói dịch vụ "${target?.name || packageId}".`, "info");
      void fetchAdminRevenueStats(revenueDays).then(setRevenueStats).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi xóa gói dịch vụ: ${msg}`, "error");
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
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await createAdminUser(data);
      const realUsers = await fetchAdminUsers();
      if (Array.isArray(realUsers) && realUsers.length > 0) {
        setUsers(realUsers);
      }
      recordAudit("CREATE_USER", `@${data.username}`, `Tạo người dùng mới`, "IAM", "info");
      addToast(`Đã tạo tài khoản "${data.fullName}".`, "success");
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi tạo người dùng: ${msg}`, "error");
      return { ok: false, error: msg };
    }
  };

  const handleUpdateUserProfile = async (
    userId: number,
    data: { fullName?: string; email?: string; phone?: string }
  ): Promise<{ ok: boolean; error?: string }> => {
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
      addToast("Đã cập nhật thông tin người dùng.", "success");
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi cập nhật thông tin người dùng: ${msg}`, "error");
      return { ok: false, error: msg };
    }
  };

  const handleResetUserPassword = async (userId: number): Promise<string | null> => {
    const target = users.find((u) => u.id === userId);
    try {
      const res = await resetAdminUserPassword(userId);
      const tempPassword =
        "tempPassword" in res && typeof res.tempPassword === "string" ? res.tempPassword : "";
      const freshUsers = await fetchAdminUsers().catch(() => null);
      if (Array.isArray(freshUsers)) setUsers(freshUsers);
      recordAudit(
        "RESET_PASSWORD",
        target?.fullName || `User #${userId}`,
        "Đặt lại mật khẩu bằng mật khẩu tạm ngẫu nhiên",
        "IAM",
        "warning"
      );
      addToast(
        tempPassword
          ? `Đã đặt lại mật khẩu tạm cho "${target?.fullName}" và thu hồi các phiên cũ.`
          : `Đã đặt lại mật khẩu cho "${target?.fullName}" thành công.`,
        "success"
      );
      return tempPassword || null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Lỗi khi đặt lại mật khẩu: ${msg}`, "error");
      return null;
    }
  };

  // ================= RENDER GUARD STATES =================
  if (authState === "checking") {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#090a0f] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#ff5500] border-t-transparent" />
        <p className="mt-4 text-sm text-zinc-400">
          Đang kiểm tra quyền truy cập...
        </p>
      </div>
    );
  }

  if (authState === "denied") {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#090a0f] p-6 text-center text-white">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-graphik text-2xl font-semibold text-white">Không có quyền truy cập</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
          Tài khoản của bạn không có quyền quản trị để mở trang này.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href={USER_DASHBOARD_ROUTE}
            className="rounded-xl border border-white/[0.08] bg-[#12141c] px-5 py-2.5 text-xs font-medium text-white hover:bg-white/10 transition active:scale-[0.98]"
          >
            Về trang nghe nhạc
          </Link>
        </div>
      </div>
    );
  }

  // ================= 7 CORE ADMIN TABS =================
  const CORE_ADMIN_TABS: { key: AdminTab; label: string; count?: number; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "overview", label: "Tổng quan", icon: LayoutDashboard },
    { key: "users", label: "Người dùng", count: users.length, icon: Users },
    { key: "monetization", label: "Gói dịch vụ", count: packages.length, icon: DollarSign },
    { key: "recommendations", label: "Tuyển chọn nhạc", icon: Sparkles },
    { key: "karaoke-resources", label: "Tài nguyên karaoke", icon: Layers },
    { key: "favorites", label: "Yêu thích", count: overviewData?.totalFavorites, icon: Heart },
    { key: "notifications", label: "Thông báo", icon: Megaphone },
  ];

  return (
    <div className="admin-workspace min-h-screen w-full bg-[#090a0f] text-white font-sans flex flex-col md:flex-row antialiased">
      {/* ================= LEFT SIDEBAR NAVIGATION ================= */}
      <aside className="admin-sidebar w-full md:w-56 xl:w-64 shrink-0 border-r border-white/[0.08] bg-[#12141c] flex flex-col justify-between md:sticky top-0 md:h-screen z-30 select-none">
        {/* Top: Brand Logo (confined inside Admin Console) */}
        <div className="p-5 border-b border-white/[0.08]">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className="flex items-center gap-2 group cursor-pointer"
            title="Về Tổng quan"
          >
            <BrandLogo variant="horizontal-dark" className="h-7 w-auto transition-transform group-hover:scale-[1.02]" />
          </button>
        </div>

        {/* Middle: Navigation Tabs List */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-medium text-zinc-500">
            Quản trị
          </div>

          {CORE_ADMIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.99] cursor-pointer ${
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
                    className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold tabular-nums ${
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
        <div className="p-3.5 border-t border-white/[0.08] bg-[#0e1017]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-[#ff5500] flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {currentAdmin?.fullName.charAt(0) || "A"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {currentAdmin?.fullName || "Quản trị viên"}
                </div>
                <div className="text-[11px] text-zinc-500 font-mono truncate">
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
      <div className="flex-1 min-w-0 min-h-screen flex flex-col z-10 bg-[#090a0f]">
        {/* Top Navbar */}
        <header className="min-h-14 gap-3 flex-wrap py-3 px-4 sm:px-6 border-b border-white/[0.08] bg-[#12141c]/95 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Quản trị</span>
              <span className="text-zinc-700">/</span>
              <span className="text-white font-semibold">
                {CORE_ADMIN_TABS.find((t) => t.key === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {dbStatus === "connecting" && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Đang tải...
              </span>
            )}
            {dbStatus === "error" && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                Mất kết nối máy chủ
              </span>
            )}

            <button
              type="button"
              disabled={isLoadingData}
              onClick={() => void loadRealData(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-[#171923] text-xs font-semibold text-zinc-300 hover:text-white hover:border-[#ff5500]/50 hover:bg-[#ff5500]/10 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#ff5500] ${isLoadingData ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              disabled={loggingOut}
              onClick={handleLogout}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition cursor-pointer disabled:opacity-50"
              title="Đăng xuất"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Dynamic Tab Views Content */}
        <main className="min-w-0 p-4 sm:p-6 lg:p-8 pb-40 flex-1 max-w-[1600px] w-full mx-auto">
          {isLoadingData && <p role="status" className="mb-5 text-sm text-zinc-400">Đang cập nhật dữ liệu quản trị…</p>}
          {dataErrors.length > 0 && <div role="alert" className="mb-6 rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200">
            <p className="font-semibold">Một số dữ liệu chưa tải được. Dữ liệu đã tải trước đó có thể chưa được cập nhật.</p>
            <ul className="mt-2 list-inside list-disc space-y-1">{dataErrors.map((message) => <li key={message}>{message}</li>)}</ul>
            <button type="button" disabled={isLoadingData} onClick={() => void loadRealData()} className="mt-3 rounded-md border border-rose-300/30 px-3 py-2 disabled:opacity-50">Tải lại dữ liệu</button>
          </div>}
          {!isLoadingData && dataErrors.length === 0 && lastSyncTime && <p className="mb-5 text-xs text-zinc-500">Cập nhật lúc {lastSyncTime}</p>}
          {activeTab === "overview" && (
            <OverviewTab
              users={users}
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
              currentAdminId={currentAdmin?.id}
              currentAdminUsername={currentAdmin?.username}
              onBanUser={handleBanUser}
              onUnbanUser={handleUnbanUser}
              onChangeUserRole={handleChangeUserRole}
              onRevokeDevice={handleRevokeDevice}
              onRevokeAllUserDevices={handleRevokeAllUserDevices}
              onResetPassword={handleResetUserPassword}
              onCreateUser={handleCreateUser}
              onUpdateProfile={handleUpdateUserProfile}
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

          {activeTab === "monetization" && (
            <MonetizationTab
              packages={packages}
              transactions={transactions}
              subscriptions={subscriptions}
              revenueStats={revenueStats}
              revenueDays={revenueDays}
              onRevenueDaysChange={handleRevenueDaysChange}
              loadingRevenueStats={loadingRevenueStats}
              onToast={addToast}
              onTogglePackageStatus={handleTogglePackageStatus}
              onUpdatePackagePrice={handleUpdatePackagePrice}
              onCreatePackage={handleCreatePackage}
              onUpdatePackageDetails={handleUpdatePackageDetails}
              onDeletePackage={handleDeletePackage}
              onCancelSubscription={handleCancelSubscription}
            />
          )}

          {activeTab === "recommendations" && <RecommendationsCurationTab onToast={addToast} />}
          {activeTab === "notifications" && <NotificationsTab onToast={addToast} />}
          {activeTab === "karaoke-resources" && <KaraokeResourcesTab onToast={addToast} />}
        </main>
      </div>

      {/* Global Audio Preview Player Dock */}
      {previewTrack && (
        <AdminAudioPlayerDock
          key={previewTrack.id}
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
      <div className="fixed bottom-6 right-3 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100%-1.5rem)] pointer-events-none">
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
