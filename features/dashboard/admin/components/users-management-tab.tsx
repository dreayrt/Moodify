"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Filter,
  Key,
  Lock,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Smartphone,
  Trash2,
  Unlock,
  User,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AdminUser, AdminUserRole, AdminUserStatus, UserDevice } from "../types";
import { AdminPagination } from "./shared/admin-pagination";
import { ModalPortal } from "./shared/modal-portal";
import { fetchAdminUserDevices } from "@/lib/api/admin-client";

type UsersManagementTabProps = {
  users: AdminUser[];
  devices: UserDevice[];
  currentAdminId?: number;
  currentAdminUsername?: string;
  onBanUser: (userId: number, reason: string, duration: string) => void;
  onUnbanUser: (userId: number) => void;
  onChangeUserRole: (
    userId: number,
    newRole: AdminUserRole,
    extra?: { staffCode?: string; artistSpotifyId?: string }
  ) => void;
  onRevokeDevice: (deviceId: number) => void;
  onRevokeAllUserDevices?: (userId: number) => Promise<void> | void;
  onResetPassword?: (userId: number) => Promise<string | null> | string | null | void;
  onUpdateProfile?: (
    userId: number,
    data: { fullName?: string; email?: string; phone?: string }
  ) => Promise<{ ok: boolean; error?: string } | void> | void;
  onCreateUser?: (data: {
    username: string;
    fullName: string;
    email: string;
    phone?: string;
    role: AdminUserRole;
    status: AdminUserStatus;
    password?: string;
  }) => Promise<{ ok: boolean; error?: string } | void> | void;
};

export function UsersManagementTab({
  users,
  devices,
  currentAdminId,
  currentAdminUsername,
  onBanUser,
  onUnbanUser,
  onChangeUserRole,
  onRevokeDevice,
  onRevokeAllUserDevices,
  onResetPassword,
  onUpdateProfile,
  onCreateUser,
}: UsersManagementTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals & Drawer State
  const [inspectingUser, setInspectingUser] = useState<AdminUser | null>(null);
  const [isEditProfileMode, setIsEditProfileMode] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ fullName: "", email: "", phone: "" });
  const [editProfileError, setEditProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [selectedUserForBan, setSelectedUserForBan] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");

  const [selectedUserForRole, setSelectedUserForRole] = useState<AdminUser | null>(null);
  const [targetRole, setTargetRole] = useState<AdminUserRole>("MODERATOR");
  const [artistSpotifyIdInput, setArtistSpotifyIdInput] = useState("");

  const [selectedUserForDevices, setSelectedUserForDevices] = useState<AdminUser | null>(null);
  const [revokingAllDevices, setRevokingAllDevices] = useState(false);

  const [selectedUserForResetPassword, setSelectedUserForResetPassword] = useState<AdminUser | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetTempPassword, setResetTempPassword] = useState<string | null>(null);
  const [copiedTempPassword, setCopiedTempPassword] = useState(false);

  // Create User Modal State
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    role: "USER" as AdminUserRole,
    status: "ACTIVE" as AdminUserStatus,
    password: "",
  });

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.artistSpotifyId && u.artistSpotifyId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenBanModal = (user: AdminUser) => {
    setSelectedUserForBan(user);
    setBanReason("");
  };

  const handleConfirmBan = () => {
    if (!selectedUserForBan) return;
    onBanUser(
      selectedUserForBan.id,
      banReason.trim() || "Vi phạm quy chế và tiêu chuẩn cộng đồng nền tảng",
      "Vĩnh viễn"
    );
    setSelectedUserForBan(null);
    if (inspectingUser?.id === selectedUserForBan.id) {
      setInspectingUser((prev) => prev ? { ...prev, status: "BANNED" } : null);
    }
  };

  const handleOpenRoleModal = (user: AdminUser) => {
    setSelectedUserForRole(user);
    setTargetRole(user.role === "USER" ? "MODERATOR" : user.role);
    setArtistSpotifyIdInput(user.artistSpotifyId || "");
  };

  const handleConfirmRoleChange = () => {
    if (!selectedUserForRole) return;
    const cleanArtistId = artistSpotifyIdInput.trim();
    onChangeUserRole(selectedUserForRole.id, targetRole, {
      artistSpotifyId:
        (targetRole === "CONTENT_LEAD" || targetRole === "ARTIST") && cleanArtistId
          ? cleanArtistId
          : undefined,
    });
    setSelectedUserForRole(null);
    if (inspectingUser?.id === selectedUserForRole.id) {
      setInspectingUser((prev) => prev ? { ...prev, role: targetRole } : null);
    }
  };

  const handleOpenResetPasswordModal = (user: AdminUser) => {
    setResetTempPassword(null);
    setCopiedTempPassword(false);
    setResettingPassword(false);
    setSelectedUserForResetPassword(user);
  };

  const handleConfirmResetPassword = async () => {
    if (!selectedUserForResetPassword || resettingPassword) return;
    setResettingPassword(true);
    try {
      const tempPw = onResetPassword ? await onResetPassword(selectedUserForResetPassword.id) : null;
      if (typeof tempPw === "string" && tempPw.length > 0) {
        setResetTempPassword(tempPw);
      } else {
        setSelectedUserForResetPassword(null);
      }
    } finally {
      setResettingPassword(false);
    }
  };

  const handleRevokeAllDevices = async () => {
    if (!selectedUserForDevices || !onRevokeAllUserDevices || revokingAllDevices) return;
    setRevokingAllDevices(true);
    try {
      await onRevokeAllUserDevices(selectedUserForDevices.id);
      setActiveUserDevices((prev) => prev.map((d) => ({ ...d, status: "REVOKED" })));
    } finally {
      setRevokingAllDevices(false);
    }
  };

  const handleOpenCreateUser = () => {
    setCreateUserError(null);
    setIsCreateUserModalOpen(true);
    setNewUserData({
      username: "",
      fullName: "",
      email: "",
      phone: "",
      role: "USER",
      status: "ACTIVE",
      password: "User@123456",
    });
  };

  const handleSaveCreateUser = async () => {
    const username = newUserData.username.trim();
    const fullName = newUserData.fullName.trim();
    const email = newUserData.email.trim();
    if (!username || !fullName || !email) {
      setCreateUserError("Vui lòng điền đầy đủ Tên đăng nhập, Họ tên và Email.");
      return;
    }
    setCreateUserError(null);
    setCreatingUser(true);
    try {
      const payload = {
        ...newUserData,
        username,
        fullName,
        email,
        phone: newUserData.phone.trim(),
      };
      const res = onCreateUser ? await onCreateUser(payload) : undefined;
      if (res && !res.ok) {
        setCreateUserError(res.error || "Không thể tạo người dùng.");
        return;
      }
      setNewUserData({
        username: "",
        fullName: "",
        email: "",
        phone: "",
        role: "USER",
        status: "ACTIVE",
        password: "",
      });
      setIsCreateUserModalOpen(false);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleStartEditProfile = (user: AdminUser) => {
    setEditProfileError(null);
    setIsEditProfileMode(true);
    setEditProfileForm({
      fullName: user.fullName,
      email: user.email,
      phone: !user.phone || user.phone === "Chưa cập nhật" ? "" : user.phone,
    });
  };

  const handleSaveProfileEdit = async () => {
    if (!inspectingUser) return;
    const fullName = editProfileForm.fullName.trim();
    const email = editProfileForm.email.trim();
    const phone = editProfileForm.phone.trim();
    if (!fullName || !email) {
      setEditProfileError("Họ tên và Email không được để trống.");
      return;
    }
    setEditProfileError(null);
    setSavingProfile(true);
    try {
      const payload = { fullName, email, phone };
      const res = onUpdateProfile ? await onUpdateProfile(inspectingUser.id, payload) : undefined;
      if (res && !res.ok) {
        setEditProfileError(res.error || "Không thể cập nhật hồ sơ người dùng.");
        return;
      }
      setInspectingUser((prev) =>
        prev ? { ...prev, ...payload } : null
      );
      setIsEditProfileMode(false);
    } finally {
      setSavingProfile(false);
    }
  };

  const [activeUserDevices, setActiveUserDevices] = useState<UserDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  useEffect(() => {
    if (!selectedUserForDevices) {
      setActiveUserDevices([]);
      return;
    }
    let cancelled = false;
    setIsLoadingDevices(true);
    fetchAdminUserDevices(selectedUserForDevices.id)
      .then((data) => {
        if (!cancelled) setActiveUserDevices(data);
      })
      .catch((err) => {
        console.error("Failed to load user devices:", err);
        if (!cancelled) setActiveUserDevices([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDevices(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedUserForDevices]);

  const handleRevokeDevice = (deviceId: number) => {
    onRevokeDevice(deviceId);
    setActiveUserDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, status: "REVOKED" } : d))
    );
  };

  return (
    <div className="space-y-6 anim-fade-in">
      {/* Studio Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-graphik text-[24px] font-bold text-white tracking-tight">
              Quản Lý Người Dùng
            </h2>
            <span className="font-mono text-xs text-zinc-400">
              · {users.length} tài khoản
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Quản trị tài khoản người dùng, phân quyền vai trò và trạng thái hoạt động.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenCreateUser}
            className="flex items-center gap-2 rounded-full bg-[#ff5500] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#ff5500]/25 hover:bg-[#ff6a1a] active:scale-[0.98] transition cursor-pointer"
          >
            <UserPlus className="h-4 w-4" /> Thêm Người Dùng
          </button>
          <span className="text-xs font-mono text-zinc-400">
            Hiển thị {filteredUsers.length} / {users.length} tài khoản
          </span>
        </div>
      </div>

      {/* 4 User Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-4 shadow-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
            <span>Tổng Người Dùng</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="font-display text-2xl font-bold text-white tracking-tight">
            {users.length}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">Toàn bộ tài khoản</p>
        </div>

        <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-4 shadow-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
            <span>Nghệ Sĩ</span>
            <UserCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="font-display text-2xl font-bold text-white tracking-tight">
            {users.filter((u) => u.role === "CONTENT_LEAD" || u.role === "ARTIST").length}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">Tài khoản nghệ sĩ</p>
        </div>

        <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-4 shadow-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
            <span>Kiểm Duyệt Viên</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-display text-2xl font-bold text-white tracking-tight">
            {users.filter((u) => u.role === "MODERATOR").length}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">Đội ngũ kiểm duyệt</p>
        </div>

        <div className="rounded-2xl border border-[#222432] bg-[#12131a] p-4 shadow-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
            <span>Đang Hoạt Động</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-display text-2xl font-bold text-white tracking-tight">
            {users.filter((u) => u.status === "ACTIVE").length}
          </div>
          <p className="text-[11px] text-emerald-400 mt-0.5 font-mono">
            Tài khoản hoạt động
          </p>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 rounded-2xl border border-[#222432] bg-[#12131a] p-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên, username, email, mã nghệ sĩ / nhân sự..."
            className="w-full rounded-xl border border-[#222432] bg-[#171822] py-2.5 pl-10 pr-4 text-[13px] text-white placeholder-zinc-500 outline-none transition focus:border-[#ff5500]"
          />
        </div>

        {/* Role Selector */}
        <div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3 py-2.5 text-[12px] font-mono text-white outline-none transition focus:border-[#ff5500]"
          >
            <option value="ALL" className="bg-[#12131a]">Tất cả vai trò</option>
            <option value="USER" className="bg-[#12131a]">Thính giả (USER)</option>
            <option value="CONTENT_LEAD" className="bg-[#12131a]">Phụ trách Nội dung (CONTENT_LEAD)</option>
            <option value="MODERATOR" className="bg-[#12131a]">Kiểm duyệt (MODERATOR)</option>
            <option value="ADMIN" className="bg-[#12131a]">Quản trị (ADMIN)</option>
          </select>
        </div>

        {/* Status Selector */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3 py-2.5 text-[12px] font-mono text-white outline-none transition focus:border-[#ff5500]"
          >
            <option value="ALL" className="bg-[#12131a]">Tất cả trạng thái</option>
            <option value="ACTIVE" className="bg-[#12131a]">Hoạt động (ACTIVE)</option>
            <option value="INACTIVE" className="bg-[#12131a]">Chưa kích hoạt (INACTIVE)</option>
            <option value="BANNED" className="bg-[#12131a]">Đã khóa (BANNED)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-[#222432] bg-[#12131a] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#222432] bg-[#171822] font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="py-3.5 pl-5 pr-3">Người Dùng</th>
                <th className="py-3.5 px-3">Liên Hệ</th>
                <th className="py-3.5 px-3">Vai Trò</th>
                <th className="py-3.5 px-3">Trạng Thái</th>
                <th className="py-3.5 px-3">Mã Nghệ Sĩ</th>
                <th className="py-3.5 px-3">Thiết Bị</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222432]/60 font-sans">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 font-mono">
                    Không tìm thấy người dùng phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isBanned = user.status === "BANNED";
                  const isCurrentUser = Boolean(
                    (currentAdminId && user.id === currentAdminId) ||
                    (currentAdminUsername &&
                      user.username.toLowerCase() === currentAdminUsername.trim().toLowerCase())
                  );

                  return (
                    <tr
                      key={user.id}
                      className="transition hover:bg-[#171822]/60 cursor-pointer group"
                      onClick={() => setInspectingUser(user)}
                    >
                      {/* Name + Avatar */}
                      <td className="py-3 pl-5 pr-3">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.fullName}
                              className="h-9 w-9 rounded-full object-cover border border-[#222432] shrink-0"
                            />
                          ) : (
                            <div className="grid h-9 w-9 place-items-center rounded-full border border-[#222432] bg-[#171822] font-mono font-bold text-white/70 shrink-0">
                              {user.fullName.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate max-w-[160px] group-hover:text-[#ff5500] transition">
                              {user.fullName}
                            </p>
                            <p className="font-mono text-[10px] text-zinc-400 truncate">@{user.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-3">
                        <p className="text-zinc-200 truncate max-w-[170px]">{user.email}</p>
                        <p className="font-mono text-[10px] text-zinc-400">{user.phone || "Chưa cập nhật"}</p>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span
                          className={
                            user.role === "ADMIN"
                              ? "text-[#ff9966] font-semibold flex items-center gap-1"
                              : user.role === "MODERATOR"
                              ? "text-indigo-400 font-medium"
                              : user.role === "CONTENT_LEAD" || user.role === "ARTIST"
                              ? "text-violet-400 font-medium"
                              : "text-zinc-400"
                          }
                        >
                          {user.role === "ADMIN" && <Shield className="h-3 w-3" />}
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.status === "ACTIVE"
                                ? "bg-emerald-400"
                                : user.status === "BANNED"
                                ? "bg-rose-400"
                                : "bg-zinc-500"
                            }`}
                          />
                          <span
                            className={
                              user.status === "ACTIVE"
                                ? "text-zinc-300"
                                : user.status === "BANNED"
                                ? "text-rose-400 font-semibold"
                                : "text-zinc-500"
                            }
                          >
                            {user.status === "ACTIVE" ? "Hoạt động" : user.status === "BANNED" ? "Đã khóa" : "Chưa kích hoạt"}
                          </span>
                        </span>
                      </td>

                      {/* Spotify Artist ID */}
                      <td className="py-3 px-3 font-mono text-[11px]">
                        {user.artistSpotifyId ? (
                          <span className="text-zinc-300" title={user.artistSpotifyId}>
                            {user.artistSpotifyId.substring(0, 12)}...
                          </span>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>

                      {/* Devices */}
                      <td className="py-3 px-3 font-mono text-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserForDevices(user);
                          }}
                          className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition cursor-pointer"
                        >
                          <Smartphone className="h-3.5 w-3.5 text-zinc-500" />
                          {user.devicesCount} máy
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-3 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        {!isCurrentUser ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Sửa / Inspect */}
                            <button
                              type="button"
                              onClick={() => {
                                setInspectingUser(user);
                                handleStartEditProfile(user);
                              }}
                              className="rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1 font-mono text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
                              title="Chỉnh sửa thông tin hồ sơ"
                            >
                              Sửa
                            </button>

                            {/* Reset Password Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenResetPasswordModal(user)}
                              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 font-mono text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
                              title="Cấp mật khẩu tạm ngẫu nhiên và thu hồi phiên"
                            >
                              Reset MK
                            </button>

                            {/* Ban / Unban */}
                            {!isBanned ? (
                              <button
                                type="button"
                                onClick={() => handleOpenBanModal(user)}
                                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 font-mono text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                                title="Khóa tài khoản"
                              >
                                Khóa
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onUnbanUser(user.id)}
                                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
                                title="Mở khóa tài khoản"
                              >
                                Mở
                              </button>
                            )}

                            {/* Change Role */}
                            <button
                              type="button"
                              onClick={() => handleOpenRoleModal(user)}
                              className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 font-mono text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition"
                              title="Đổi vai trò"
                            >
                              Role
                            </button>
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-purple-400 font-semibold">Tài khoản này</span>
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
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 15, 25, 50]}
        />
      </div>

      {/* ================= MODAL: USER PROFILE DETAIL DRAWER ================= */}
      {inspectingUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex justify-end bg-black/80 backdrop-blur-sm anim-fade-in">
            <div className="w-full max-w-md bg-[#0c0e14] border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div>
              <div className="flex items-center justify-between border-b border-white/8 pb-4">
                <h3 className="font-graphik text-[18px] font-bold text-white">Thông Tin Chi Tiết Tài Khoản</h3>
                <button
                  type="button"
                  onClick={() => setInspectingUser(null)}
                  className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* User Identity Head */}
              <div className="mt-5 flex items-center gap-4">
                {inspectingUser.avatarUrl ? (
                  <img
                    src={inspectingUser.avatarUrl}
                    alt={inspectingUser.fullName}
                    className="h-16 w-16 rounded-full object-cover border border-white/10 shadow-lg"
                  />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-white/[0.06] font-mono text-[20px] font-bold text-white/70">
                    {inspectingUser.fullName.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="font-graphik text-[18px] font-bold text-white">{inspectingUser.fullName}</h4>
                  <p className="font-mono text-[12px] text-white/50">@{inspectingUser.username}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white">
                      ID: #{inspectingUser.id}
                    </span>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff5500]/15 text-[#ff9966]">
                      {inspectingUser.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata Fields / Edit Form */}
              {isEditProfileMode ? (
                <div className="mt-6 space-y-3 font-mono text-[12px] p-4 rounded-2xl border border-[#ff5500]/30 bg-[#171822]">
                  <div className="flex items-center justify-between pb-2 border-b border-[#222432]">
                    <span className="font-bold text-white text-xs">Chỉnh Sửa Hồ Sơ Người Dùng</span>
                    <button
                      type="button"
                      disabled={savingProfile}
                      onClick={() => {
                        setEditProfileError(null);
                        setIsEditProfileMode(false);
                      }}
                      className="text-zinc-400 hover:text-white text-xs disabled:opacity-50"
                    >
                      Hủy
                    </button>
                  </div>
                  {editProfileError && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] font-sans text-rose-300">
                      {editProfileError}
                    </div>
                  )}
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Họ và Tên</label>
                    <input
                      type="text"
                      value={editProfileForm.fullName}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, fullName: e.target.value })}
                      className="w-full rounded-lg border border-[#222432] bg-[#12131a] px-3 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Email</label>
                    <input
                      type="email"
                      value={editProfileForm.email}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                      className="w-full rounded-lg border border-[#222432] bg-[#12131a] px-3 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Số điện thoại</label>
                    <input
                      type="text"
                      value={editProfileForm.phone}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                      className="w-full rounded-lg border border-[#222432] bg-[#12131a] px-3 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={() => void handleSaveProfileEdit()}
                    className="w-full mt-2 rounded-xl bg-[#ff5500] py-2 text-xs font-semibold text-white hover:bg-[#ff6a1a] active:scale-[0.98] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingProfile ? "Đang lưu thay đổi..." : "Lưu Thay Đổi Hồ Sơ"}
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-3 font-mono text-[12px]">
                  <div className="flex justify-between p-3 rounded-[12px] bg-white/[0.02] border border-white/6">
                    <span className="text-white/40">Email:</span>
                    <span className="text-white font-medium">{inspectingUser.email}</span>
                  </div>

                  <div className="flex justify-between p-3 rounded-[12px] bg-white/[0.02] border border-white/6">
                    <span className="text-white/40">Số điện thoại:</span>
                    <span className="text-white font-medium">{inspectingUser.phone || "Chưa cập nhật"}</span>
                  </div>

                  <div className="flex justify-between p-3 rounded-[12px] bg-white/[0.02] border border-white/6">
                    <span className="text-white/40">Trạng thái:</span>
                    <span className={`font-bold ${inspectingUser.status === "ACTIVE" ? "text-emerald-400" : "text-rose-400"}`}>
                      {inspectingUser.status}
                    </span>
                  </div>

                  {inspectingUser.artistSpotifyId && (
                    <div className="flex justify-between p-3 rounded-[12px] bg-[#ff5500]/5 border border-[#ff5500]/20">
                      <span className="text-[#ff5500]">Mã Định Danh Nghệ Sĩ:</span>
                      <span className="text-white font-bold">{inspectingUser.artistSpotifyId}</span>
                    </div>
                  )}

                  <div className="flex justify-between p-3 rounded-[12px] bg-[#12131a] border border-[#222432]">
                    <span className="text-white/40">Lần đăng nhập cuối:</span>
                    <span className="text-white/80">{inspectingUser.lastLoginAt || "Chưa có"}</span>
                  </div>

                  <div className="flex justify-between p-3 rounded-[12px] bg-[#12131a] border border-[#222432]">
                    <span className="text-white/40">Ngày tham gia:</span>
                    <span className="text-white/80">{inspectingUser.createdAt}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            {(() => {
              const isInspectingSelf = Boolean(
                (currentAdminId && inspectingUser.id === currentAdminId) ||
                (currentAdminUsername &&
                  inspectingUser.username.toLowerCase() === currentAdminUsername.trim().toLowerCase())
              );
              return (
                <div className="pt-6 border-t border-[#222432] space-y-2.5">
                  {!isEditProfileMode && (
                    <button
                      type="button"
                      onClick={() => handleStartEditProfile(inspectingUser)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#222432] bg-[#171822] py-2.5 text-xs font-semibold text-white hover:border-[#ff5500]/50 hover:bg-[#ff5500]/10 transition active:scale-[0.98]"
                    >
                      <UserCog className="h-4 w-4 text-[#ff5500]" /> Chỉnh Sửa Thông Tin Cá Nhân
                    </button>
                  )}

                  {isInspectingSelf ? (
                    <div className="rounded-xl border border-purple-500/25 bg-purple-500/10 px-3 py-2.5 text-[11px] font-mono text-purple-300 text-center">
                      Tài khoản quản trị đang đăng nhập (không thể tự khóa, tự đổi vai trò hoặc đặt lại mật khẩu tạm).
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenResetPasswordModal(inspectingUser)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-xs font-mono font-bold text-amber-300 hover:bg-amber-500/20 transition"
                      >
                        <Key className="h-4 w-4" /> Đặt Lại Mật Khẩu Tạm Ngẫu Nhiên
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenRoleModal(inspectingUser)}
                        className="w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 py-2.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition"
                      >
                        Thay Đổi Vai Trò (Role)
                      </button>

                      {inspectingUser.status !== "BANNED" ? (
                        <button
                          type="button"
                          onClick={() => handleOpenBanModal(inspectingUser)}
                          className="w-full rounded-xl bg-rose-500/20 border border-rose-500/30 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 transition"
                        >
                          Khóa Tài Khoản Này
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onUnbanUser(inspectingUser.id)}
                          className="w-full rounded-xl bg-emerald-500/20 border border-emerald-500/30 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition"
                        >
                          Mở Khóa Phục Hồi Quyền Truy Cập
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </ModalPortal>
    )}

      {/* ================= MODAL: BAN USER ================= */}
      {selectedUserForBan && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/85 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[26px] border border-rose-500/30 bg-[#0d090a] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <h3 className="font-graphik text-[17px] font-semibold text-rose-400">Khóa Quyền Truy Cập Tài Khoản</h3>
              <button
                type="button"
                onClick={() => setSelectedUserForBan(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[13px]">
              <div className="rounded-[16px] border border-white/8 bg-black/40 p-3">
                <p className="font-semibold text-white">{selectedUserForBan.fullName}</p>
                <p className="text-[12px] text-white/50 font-mono">@{selectedUserForBan.username} · {selectedUserForBan.email}</p>
              </div>

              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-[11px] font-mono text-rose-200 leading-relaxed">
                Tài khoản bị khóa sẽ bị thu hồi toàn bộ phiên đăng nhập đang hoạt động và không thể đăng nhập lại cho đến khi quản trị viên mở khóa.
              </div>

              {/* Ban Reason */}
              <div>
                <label className="block text-[12px] font-medium text-white/70 mb-1.5">Lý do khóa tài khoản</label>
                <textarea
                  rows={3}
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Ghi rõ lý do vi phạm: bản quyền, gian lận, spam..."
                  className="w-full rounded-[14px] border border-white/10 bg-black/40 p-3 text-[13px] text-white placeholder-white/30 outline-none focus:border-rose-400/70"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedUserForBan(null)}
                className="rounded-full bg-white/10 px-4 py-2 text-[12px] font-medium text-white hover:bg-white/15"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmBan}
                className="rounded-full bg-rose-500 px-5 py-2 text-[12px] font-semibold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600"
              >
                Xác nhận khóa
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}

      {/* ================= MODAL: CHANGE ROLE ================= */}
      {selectedUserForRole && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/85 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[26px] border border-white/12 bg-[#0c0e14] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <h3 className="font-graphik text-[17px] font-semibold text-white">Bổ Nhiệm &amp; Thay Đổi Vai Trò</h3>
              <button
                type="button"
                onClick={() => setSelectedUserForRole(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[13px]">
              <div className="rounded-[16px] border border-white/8 bg-black/40 p-3">
                <p className="font-semibold text-white">{selectedUserForRole.fullName}</p>
                <p className="text-[12px] text-white/50 font-mono">Vai trò hiện tại: {selectedUserForRole.role}</p>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-white/70 mb-1.5">Chọn vai trò mới</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["USER", "CONTENT_LEAD", "MODERATOR", "ADMIN"] as AdminUserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTargetRole(r)}
                      className={`rounded-xl border p-2.5 text-center text-[12px] font-medium transition ${
                        targetRole === r
                          ? "border-[#ff5500] bg-[#ff5500]/15 text-[#ff9966] font-semibold"
                          : "border-[#222432] bg-[#171822] text-zinc-400 hover:text-white"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {(targetRole === "CONTENT_LEAD" || targetRole === "ARTIST") && (
                <div>
                  <label className="block text-[12px] font-medium text-white/70 mb-1">
                    Mã Nghệ Sĩ liên kết (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={artistSpotifyIdInput}
                    onChange={(e) => setArtistSpotifyIdInput(e.target.value)}
                    placeholder="Để trống sẽ tự động tạo hồ sơ Nghệ sĩ mới"
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] p-2.5 text-[13px] text-white placeholder:text-zinc-500 outline-none focus:border-[#ff5500] font-mono"
                  />
                  <p className="mt-1 text-[11px] font-mono text-zinc-400">
                    Nếu bỏ trống, hệ thống sẽ tự tạo hồ sơ Artist trong MongoDB và đăng ký quyền tải nhạc cho tài khoản này.
                  </p>
                </div>
              )}

              <p className="text-[11px] font-mono text-amber-300/90">
                Khi thay đổi vai trò, toàn bộ phiên đăng nhập cũ của tài khoản sẽ bị thu hồi để áp dụng quyền mới.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedUserForRole(null)}
                className="rounded-full bg-white/10 px-4 py-2 text-[12px] font-medium text-white hover:bg-white/15"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                className="rounded-full bg-[#ff5500] px-5 py-2 text-[12px] font-semibold text-white shadow-lg shadow-[#ff5500]/25 hover:bg-[#ff6a1a] active:scale-[0.98] transition cursor-pointer"
              >
                Cập nhật vai trò
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}

      {/* ================= MODAL: CONNECTED DEVICES ================= */}
      {selectedUserForDevices && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/85 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[26px] border border-white/12 bg-[#0c0e14] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <h3 className="font-graphik text-[17px] font-semibold text-white">Phiên Đăng Nhập &amp; Thiết Bị</h3>
              <button
                type="button"
                onClick={() => setSelectedUserForDevices(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-[12px] text-white/50">
              Danh sách phiên đăng nhập đang hoạt động của <strong>{selectedUserForDevices.fullName}</strong> trên Web, Android, iOS hoặc Admin:
            </p>

            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {isLoadingDevices ? (
                <div className="flex items-center justify-center py-8 gap-2 text-white/50 text-xs font-mono">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#ff5500]" />
                  <span>Đang tải danh sách thiết bị từ cơ sở dữ liệu...</span>
                </div>
              ) : activeUserDevices.length === 0 ? (
                <p className="text-center py-6 text-white/30 text-[12px] font-mono">
                  Chưa có thiết bị nào được đăng ký offline trong cơ sở dữ liệu.
                </p>
              ) : (
                activeUserDevices.map((dev) => (
                  <div
                    key={dev.id}
                    className="flex items-center justify-between p-3 rounded-[14px] border border-white/8 bg-black/40 text-[12px]"
                  >
                    <div>
                      <p className="font-medium text-white">{dev.deviceName}</p>
                      <p className="font-mono text-[10px] text-white/40">{dev.platform} · {dev.deviceUuid}</p>
                    </div>

                    {dev.status === "ACTIVE" ? (
                      <button
                        type="button"
                        onClick={() => handleRevokeDevice(dev.id)}
                        className="font-mono text-[10px] font-semibold text-rose-300 bg-rose-500/15 border border-rose-500/20 px-2.5 py-1 rounded-full hover:bg-rose-500/25 transition cursor-pointer"
                      >
                        Thu hồi
                      </button>
                    ) : (
                      <span className="font-mono text-[10px] text-white/40">Đã thu hồi</span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 flex items-center gap-2.5">
              {onRevokeAllUserDevices && activeUserDevices.some((d) => d.status === "ACTIVE") && (
                <button
                  type="button"
                  disabled={revokingAllDevices}
                  onClick={() => void handleRevokeAllDevices()}
                  className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/15 py-2.5 text-xs font-mono font-semibold text-rose-300 hover:bg-rose-500/25 disabled:opacity-50 transition cursor-pointer"
                >
                  {revokingAllDevices ? "Đang thu hồi..." : "Thu hồi tất cả phiên"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedUserForDevices(null)}
                className="flex-1 rounded-xl bg-white/10 py-2.5 text-xs font-medium text-white hover:bg-white/15 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}

      {/* ================= MODAL: RESET PASSWORD ================= */}
      {selectedUserForResetPassword && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/85 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-amber-500/30 bg-[#0d0c10] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-graphik text-lg font-bold text-white">Đặt Lại Mật Khẩu</h3>
                <p className="font-mono text-xs text-white/50">
                  {resetTempPassword ? "Mật khẩu tạm đã được cấp" : "Tạo mật khẩu tạm ngẫu nhiên & thu hồi phiên"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-1">
              <p className="font-semibold text-white">{selectedUserForResetPassword.fullName}</p>
              <p className="font-mono text-xs text-white/50">@{selectedUserForResetPassword.username} · {selectedUserForResetPassword.email}</p>
            </div>

            {resetTempPassword ? (
              <div className="space-y-3">
                <p className="text-xs font-mono text-emerald-300">
                  Mật khẩu mới đã được mã hóa lưu vào hệ thống và toàn bộ phiên đăng nhập cũ đã bị thu hồi. Hãy sao chép mật khẩu tạm dưới đây để gửi cho người dùng:
                </p>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
                  <code className="font-mono text-base font-bold tracking-wider text-amber-300 select-all">
                    {resetTempPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(resetTempPassword);
                      setCopiedTempPassword(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-400 transition cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedTempPassword ? "Đã chép" : "Sao chép"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/70 leading-relaxed">
                Hệ thống sẽ sinh một <strong className="text-amber-300 font-mono">mật khẩu tạm ngẫu nhiên 10 ký tự</strong> (mã hóa BCrypt) và thu hồi toàn bộ phiên đăng nhập hiện tại của tài khoản này.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              {resetTempPassword ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserForResetPassword(null);
                    setResetTempPassword(null);
                  }}
                  className="rounded-xl bg-[#ff5500] px-5 py-2 text-xs font-bold text-white hover:bg-[#ff6a1a] cursor-pointer"
                >
                  Hoàn Tất &amp; Đóng
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={resettingPassword}
                    onClick={() => setSelectedUserForResetPassword(null)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/60 hover:bg-white/5"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="button"
                    disabled={resettingPassword}
                    onClick={() => void handleConfirmResetPassword()}
                    className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {resettingPassword ? "Đang tạo mật khẩu..." : "Xác Nhận Đặt Lại"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </ModalPortal>
    )}
      {/* ================= MODAL: CREATE NEW USER ================= */}
      {isCreateUserModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/85 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[#222432] bg-[#12131a] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#222432] pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ff5500]/15 text-[#ff5500]">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-graphik text-lg font-bold text-white">Thêm Người Dùng Mới</h3>
                  <p className="font-mono text-xs text-zinc-400">Cấp mới tài khoản truy cập vào hệ thống</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateUserModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createUserError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 font-sans">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{createUserError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 block mb-1 font-semibold">Tên Đăng Nhập (@username) *</label>
                  <input
                    type="text"
                    value={newUserData.username}
                    onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                    placeholder="vidu_user"
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2.5 text-sm text-white focus:border-[#ff5500] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 block mb-1 font-semibold">Họ và Tên Đầy Đủ *</label>
                  <input
                    type="text"
                    value={newUserData.fullName}
                    onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                    placeholder="Lâm Phước Thuận"
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2.5 text-sm text-white focus:border-[#ff5500] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 block mb-1 font-semibold">Email *</label>
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder="user@moodify.com"
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2.5 text-sm text-white focus:border-[#ff5500] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 block mb-1 font-semibold">Số Điện Thoại</label>
                  <input
                    type="text"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                    placeholder="0912345678"
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2.5 text-sm text-white focus:border-[#ff5500] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 block mb-1 font-semibold">Vai Trò (Role)</label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as AdminUserRole })}
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2.5 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                  >
                    <option value="USER" className="bg-[#12131a]">Thính giả (USER)</option>
                    <option value="CONTENT_LEAD" className="bg-[#12131a]">Phụ trách Nội dung (CONTENT_LEAD)</option>
                    <option value="MODERATOR" className="bg-[#12131a]">Kiểm duyệt viên (MODERATOR)</option>
                    <option value="ADMIN" className="bg-[#12131a]">Quản trị viên (ADMIN)</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-300 block mb-1 font-semibold">Trạng Thái Ban Đầu</label>
                  <select
                    value={newUserData.status}
                    onChange={(e) => setNewUserData({ ...newUserData, status: e.target.value as AdminUserStatus })}
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2.5 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                  >
                    <option value="ACTIVE" className="bg-[#12131a]">Kích hoạt ngay (ACTIVE)</option>
                    <option value="INACTIVE" className="bg-[#12131a]">Chưa kích hoạt (INACTIVE)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-zinc-300 block mb-1 font-semibold">Mật Khẩu Khởi Tạo</label>
                <input
                  type="text"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder="Mặc định: User@123456"
                  className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2.5 text-sm font-mono text-emerald-400 font-bold focus:border-[#ff5500] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222432]">
              <button
                type="button"
                disabled={creatingUser}
                onClick={() => {
                  setCreateUserError(null);
                  setIsCreateUserModalOpen(false);
                }}
                className="rounded-full border border-[#222432] px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-[#171822] transition disabled:opacity-50"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={creatingUser}
                onClick={() => void handleSaveCreateUser()}
                className="rounded-full bg-[#ff5500] px-5 py-2 text-xs font-semibold text-white hover:bg-[#ff6a1a] shadow-lg shadow-[#ff5500]/25 active:scale-[0.98] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creatingUser ? "Đang tạo tài khoản..." : "Tạo Người Dùng"}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}
    </div>
  );
}
