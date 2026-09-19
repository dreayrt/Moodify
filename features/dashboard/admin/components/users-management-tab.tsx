"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  ChevronRight,
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

type UsersManagementTabProps = {
  users: AdminUser[];
  devices: UserDevice[];
  onBanUser: (userId: number, reason: string, duration: string) => void;
  onUnbanUser: (userId: number) => void;
  onChangeUserRole: (
    userId: number,
    newRole: AdminUserRole,
    extra?: { staffCode?: string; artistSpotifyId?: string }
  ) => void;
  onRevokeDevice: (deviceId: number) => void;
  onResetPassword?: (userId: number) => void;
  onUpdateProfile?: (userId: number, data: { fullName?: string; email?: string; phone?: string }) => void;
  onCreateUser?: (data: {
    username: string;
    fullName: string;
    email: string;
    phone?: string;
    role: AdminUserRole;
    status: AdminUserStatus;
    password?: string;
  }) => void;
  onDeleteUser?: (userId: number) => void;
};

export function UsersManagementTab({
  users,
  devices,
  onBanUser,
  onUnbanUser,
  onChangeUserRole,
  onRevokeDevice,
  onResetPassword,
  onUpdateProfile,
  onCreateUser,
  onDeleteUser,
}: UsersManagementTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals & Drawer State
  const [inspectingUser, setInspectingUser] = useState<AdminUser | null>(null);
  const [isEditProfileMode, setIsEditProfileMode] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ fullName: "", email: "", phone: "" });

  const [selectedUserForBan, setSelectedUserForBan] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("Vĩnh viễn");

  const [selectedUserForRole, setSelectedUserForRole] = useState<AdminUser | null>(null);
  const [targetRole, setTargetRole] = useState<AdminUserRole>("MODERATOR");
  const [staffCodeInput, setStaffCodeInput] = useState("");
  const [artistSpotifyIdInput, setArtistSpotifyIdInput] = useState("");

  const [selectedUserForDevices, setSelectedUserForDevices] = useState<AdminUser | null>(null);
  const [selectedUserForResetPassword, setSelectedUserForResetPassword] = useState<AdminUser | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<AdminUser | null>(null);

  // Create User Modal State
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
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
      u.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    setBanDuration("Vĩnh viễn");
  };

  const handleConfirmBan = () => {
    if (!selectedUserForBan) return;
    onBanUser(
      selectedUserForBan.id,
      banReason.trim() || "Vi phạm quy chế và tiêu chuẩn cộng đồng nền tảng",
      banDuration
    );
    setSelectedUserForBan(null);
    if (inspectingUser?.id === selectedUserForBan.id) {
      setInspectingUser((prev) => prev ? { ...prev, status: "BANNED" } : null);
    }
  };

  const handleOpenRoleModal = (user: AdminUser) => {
    setSelectedUserForRole(user);
    setTargetRole(user.role === "USER" ? "MODERATOR" : user.role);
    setStaffCodeInput(user.staffCode || `STAFF-VN-${Math.floor(100 + Math.random() * 900)}`);
    setArtistSpotifyIdInput(user.artistSpotifyId || `artist_${Date.now()}`);
  };

  const handleConfirmRoleChange = () => {
    if (!selectedUserForRole) return;
    onChangeUserRole(selectedUserForRole.id, targetRole, {
      staffCode: targetRole === "MODERATOR" ? staffCodeInput : undefined,
      artistSpotifyId: targetRole === "ARTIST" ? artistSpotifyIdInput : undefined,
    });
    setSelectedUserForRole(null);
    if (inspectingUser?.id === selectedUserForRole.id) {
      setInspectingUser((prev) => prev ? { ...prev, role: targetRole } : null);
    }
  };

  const handleConfirmResetPassword = () => {
    if (!selectedUserForResetPassword) return;
    if (onResetPassword) {
      onResetPassword(selectedUserForResetPassword.id);
    }
    setSelectedUserForResetPassword(null);
  };

  const handleOpenCreateUser = () => {
    setIsCreateUserModalOpen(true);
    setNewUserData({
      username: `user_${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: "",
      email: "",
      phone: "",
      role: "USER",
      status: "ACTIVE",
      password: "User@123456",
    });
  };

  const handleSaveCreateUser = () => {
    if (!newUserData.username.trim() || !newUserData.fullName.trim() || !newUserData.email.trim()) {
      alert("Vui lòng điền đầy đủ Tên đăng nhập, Họ tên và Email.");
      return;
    }
    if (onCreateUser) {
      onCreateUser(newUserData);
    }
    setIsCreateUserModalOpen(false);
  };

  const handleDeleteUser = (user: AdminUser) => {
    if (user.username === "admin01" || user.id === 1) {
      alert("Không thể xóa tài khoản Quản trị viên root (admin01).");
      return;
    }
    setSelectedUserForDelete(user);
  };

  const handleStartEditProfile = (user: AdminUser) => {
    setIsEditProfileMode(true);
    setEditProfileForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || "",
    });
  };

  const handleSaveProfileEdit = () => {
    if (!inspectingUser) return;
    if (onUpdateProfile) {
      onUpdateProfile(inspectingUser.id, editProfileForm);
    }
    setInspectingUser((prev) =>
      prev ? { ...prev, ...editProfileForm } : null
    );
    setIsEditProfileMode(false);
  };

  const userDevices = selectedUserForDevices
    ? devices.filter((d) => d.userId === selectedUserForDevices.id)
    : [];

  return (
    <div className="space-y-6 anim-fade-in">
      {/* Studio Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-graphik text-[24px] font-bold text-white tracking-tight">
              Quản Trị Người Dùng & Phân Quyền IAM
            </h2>
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-300 font-semibold">
              Cơ Sở Dữ Liệu Định Danh IAM
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Giám sát tài khoản thực tế (nghệ sĩ, admin, listener), bổ nhiệm nhân sự, kiểm soát bảo mật và khóa tài khoản.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenCreateUser}
            className="flex items-center gap-2 rounded-xl bg-[#ff7a2c] px-4 py-2.5 text-xs font-bold text-black shadow-md shadow-[#ff7a2c]/20 hover:brightness-110 transition cursor-pointer"
          >
            <UserPlus className="h-4 w-4" /> Thêm Người Dùng Mới
          </button>
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-mono text-zinc-300">
            Hiển thị: <strong className="text-white">{filteredUsers.length}</strong> / {users.length} tài khoản
          </span>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 rounded-[20px] border border-white/8 bg-[#0c0e14]/80 p-3 backdrop-blur-xl">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên, username, email, Spotify ID..."
            className="w-full rounded-[14px] border border-white/8 bg-black/40 py-2.5 pl-10 pr-4 text-[13px] text-white placeholder-white/40 outline-none transition focus:border-[#ff7a2c]/60"
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
            className="w-full rounded-[14px] border border-white/8 bg-black/40 px-3 py-2.5 text-[12px] font-mono text-white outline-none transition focus:border-[#ff7a2c]/60"
          >
            <option value="ALL" className="bg-[#0c0e14]">Tất cả vai trò</option>
            <option value="USER" className="bg-[#0c0e14]">Thính giả (USER)</option>
            <option value="ARTIST" className="bg-[#0c0e14]">Nghệ sĩ (ARTIST)</option>
            <option value="MODERATOR" className="bg-[#0c0e14]">Kiểm duyệt (MODERATOR)</option>
            <option value="ADMIN" className="bg-[#0c0e14]">Quản trị (ADMIN)</option>
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
            className="w-full rounded-[14px] border border-white/8 bg-black/40 px-3 py-2.5 text-[12px] font-mono text-white outline-none transition focus:border-[#ff7a2c]/60"
          >
            <option value="ALL" className="bg-[#0c0e14]">Tất cả trạng thái</option>
            <option value="ACTIVE" className="bg-[#0c0e14]">Hoạt động (ACTIVE)</option>
            <option value="INACTIVE" className="bg-[#0c0e14]">Chưa kích hoạt (INACTIVE)</option>
            <option value="BANNED" className="bg-[#0c0e14]">Đã khóa (BANNED)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c1017] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-white/[0.02] font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="py-3.5 pl-5 pr-3">Người Dùng</th>
                <th className="py-3.5 px-3">Liên Hệ</th>
                <th className="py-3.5 px-3">Vai Trò</th>
                <th className="py-3.5 px-3">Trạng Thái</th>
                <th className="py-3.5 px-3">Spotify ID / Code</th>
                <th className="py-3.5 px-3">Thiết Bị</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 font-mono">
                    Không tìm thấy người dùng phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isBanned = user.status === "BANNED";
                  const isCurrentUser = user.username === "admin01";

                  return (
                    <tr
                      key={user.id}
                      className="transition hover:bg-white/[0.02] cursor-pointer group"
                      onClick={() => setInspectingUser(user)}
                    >
                      {/* Name + Avatar */}
                      <td className="py-3 pl-5 pr-3">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.fullName}
                              className="h-9 w-9 rounded-full object-cover border border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.06] font-mono font-bold text-white/70 shrink-0">
                              {user.fullName.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate max-w-[160px] group-hover:text-[#ff7a2c] transition">
                              {user.fullName}
                            </p>
                            <p className="font-mono text-[10px] text-white/40 truncate">@{user.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-3">
                        <p className="text-white/80 truncate max-w-[170px]">{user.email}</p>
                        <p className="font-mono text-[10px] text-white/40">{user.phone}</p>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold ${
                            user.role === "ADMIN"
                              ? "border border-[#ff7a2c]/30 bg-[#ff7a2c]/15 text-[#ffb488]"
                              : user.role === "MODERATOR"
                              ? "border border-indigo-500/30 bg-indigo-500/15 text-indigo-300"
                              : user.role === "ARTIST"
                              ? "border border-cyan-500/30 bg-cyan-500/15 text-cyan-300"
                              : "border border-zinc-700 bg-zinc-800/60 text-zinc-300"
                          }`}
                        >
                          {user.role === "ADMIN" && <Shield className="h-2.5 w-2.5" />}
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10px] font-medium ${
                            user.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                              : user.status === "BANNED"
                              ? "bg-rose-500/10 text-rose-300 border border-rose-500/30"
                              : "bg-white/10 text-zinc-300 border border-white/10"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.status === "ACTIVE"
                                ? "bg-emerald-400 animate-pulse"
                                : user.status === "BANNED"
                                ? "bg-rose-400"
                                : "bg-zinc-400"
                            }`}
                          />
                          {user.status === "ACTIVE" ? "Hoạt động" : user.status === "BANNED" ? "Đã khóa" : "Chưa kích hoạt"}
                        </span>
                      </td>

                      {/* Spotify ID / Staff Code */}
                      <td className="py-3 px-3 font-mono text-[10px] text-white/50">
                        {user.artistSpotifyId ? (
                          <span className="text-[#00f2fe] bg-[#00f2fe]/10 px-1.5 py-0.5 rounded border border-[#00f2fe]/20">
                            {user.artistSpotifyId.substring(0, 10)}...
                          </span>
                        ) : user.staffCode ? (
                          <span className="text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                            {user.staffCode}
                          </span>
                        ) : (
                          <span className="text-white/20">-</span>
                        )}
                      </td>

                      {/* Devices */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserForDevices(user);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-xs text-white/70 hover:bg-white/10 hover:text-white transition"
                        >
                          <Smartphone className="h-3.5 w-3.5 text-white/50" />
                          {user.devicesCount} thiết bị
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
                              onClick={() => setSelectedUserForResetPassword(user)}
                              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 font-mono text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
                              title="Đặt lại mật khẩu về 123456"
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

                            {/* Delete User */}
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 transition"
                              title="Xóa tài khoản người dùng"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
                <h3 className="font-graphik text-[18px] font-bold text-white">Hồ Sơ Định Danh IAM</h3>
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
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff7a2c]/15 text-[#ffb488]">
                      {inspectingUser.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata Fields / Edit Form */}
              {isEditProfileMode ? (
                <div className="mt-6 space-y-3 font-mono text-[12px] p-4 rounded-2xl border border-[#ff7a2c]/30 bg-black/40">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="font-bold text-white text-xs">Chỉnh Sửa Hồ Sơ Người Dùng</span>
                    <button
                      type="button"
                      onClick={() => setIsEditProfileMode(false)}
                      className="text-white/40 hover:text-white text-xs"
                    >
                      Hủy
                    </button>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Họ và Tên</label>
                    <input
                      type="text"
                      value={editProfileForm.fullName}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, fullName: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-[#ff7a2c] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Email</label>
                    <input
                      type="email"
                      value={editProfileForm.email}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-[#ff7a2c] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Số điện thoại</label>
                    <input
                      type="text"
                      value={editProfileForm.phone}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-[#ff7a2c] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveProfileEdit}
                    className="w-full mt-2 rounded-xl bg-[#ff7a2c] py-2 text-xs font-bold text-black hover:brightness-110 transition"
                  >
                    Lưu Thay Đổi Hồ Sơ
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
                    <div className="flex justify-between p-3 rounded-[12px] bg-[#00f2fe]/5 border border-[#00f2fe]/20">
                      <span className="text-[#00f2fe]">Spotify Artist ID:</span>
                      <span className="text-white font-bold">{inspectingUser.artistSpotifyId}</span>
                    </div>
                  )}

                  <div className="flex justify-between p-3 rounded-[12px] bg-white/[0.02] border border-white/6">
                    <span className="text-white/40">Lần đăng nhập cuối:</span>
                    <span className="text-white/80">{inspectingUser.lastLoginAt || "Chưa có"}</span>
                  </div>

                  <div className="flex justify-between p-3 rounded-[12px] bg-white/[0.02] border border-white/6">
                    <span className="text-white/40">Ngày tham gia:</span>
                    <span className="text-white/80">{inspectingUser.createdAt}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-white/8 space-y-2.5">
              {!isEditProfileMode && (
                <button
                  type="button"
                  onClick={() => handleStartEditProfile(inspectingUser)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition"
                >
                  <UserCog className="h-4 w-4 text-[#ff7a2c]" /> Chỉnh Sửa Thông Tin Cá Nhân
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedUserForResetPassword(inspectingUser)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-xs font-mono font-bold text-amber-300 hover:bg-amber-500/20 transition"
              >
                <Key className="h-4 w-4" /> Đặt Lại Mật Khẩu (123456)
              </button>

              <button
                type="button"
                onClick={() => {
                  handleOpenRoleModal(inspectingUser);
                }}
                className="w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 py-2.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition"
              >
                Thay Đổi Vai Trò (Role)
              </button>

              {inspectingUser.status !== "BANNED" ? (
                <button
                  type="button"
                  onClick={() => {
                    handleOpenBanModal(inspectingUser);
                  }}
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

              {inspectingUser.username !== "admin01" && (
                <button
                  type="button"
                  onClick={() => handleDeleteUser(inspectingUser)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition"
                >
                  <Trash2 className="h-4 w-4" /> Xóa Vĩnh Viễn Người Dùng Này
                </button>
              )}
            </div>
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

              {/* Ban Duration */}
              <div>
                <label className="block text-[12px] font-medium text-white/70 mb-1.5">Thời hạn khóa</label>
                <div className="grid grid-cols-3 gap-2">
                  {["7 Ngày", "30 Ngày", "Vĩnh viễn"].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setBanDuration(dur)}
                      className={`rounded-[12px] border p-2 text-center text-[12px] font-medium transition ${
                        banDuration === dur
                          ? "border-rose-400 bg-rose-500/20 text-rose-300 font-semibold"
                          : "border-white/8 bg-white/[0.02] text-white/60 hover:bg-white/[0.06]"
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
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
              <h3 className="font-graphik text-[17px] font-semibold text-white">Bổ Nhiệm & Đổi Vai Trò (IAM)</h3>
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
                  {(["USER", "ARTIST", "MODERATOR", "ADMIN"] as AdminUserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTargetRole(r)}
                      className={`rounded-[12px] border p-2.5 text-center text-[12px] font-medium transition ${
                        targetRole === r
                          ? "border-[#ff7a2c] bg-[#ff7a2c]/15 text-[#ffb488] font-semibold"
                          : "border-white/8 bg-white/[0.02] text-white/70 hover:bg-white/[0.06]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {targetRole === "MODERATOR" && (
                <div>
                  <label className="block text-[12px] font-medium text-white/70 mb-1">Mã nhân viên (Staff Code)</label>
                  <input
                    type="text"
                    value={staffCodeInput}
                    onChange={(e) => setStaffCodeInput(e.target.value)}
                    placeholder="VD: STAFF-VN-009"
                    className="w-full rounded-[12px] border border-white/10 bg-black/40 p-2.5 text-[13px] text-white outline-none focus:border-teal-400 font-mono"
                  />
                </div>
              )}

              {targetRole === "ARTIST" && (
                <div>
                  <label className="block text-[12px] font-medium text-white/70 mb-1">Spotify Artist ID liên kết</label>
                  <input
                    type="text"
                    value={artistSpotifyIdInput}
                    onChange={(e) => setArtistSpotifyIdInput(e.target.value)}
                    placeholder="VD: 4OCl7UfKRXLcYouOYa3Bwc"
                    className="w-full rounded-[12px] border border-white/10 bg-black/40 p-2.5 text-[13px] text-white outline-none focus:border-[#00f2fe] font-mono"
                  />
                </div>
              )}
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
                className="rounded-full bg-[#ff7a2c] px-5 py-2 text-[12px] font-semibold text-black shadow-lg shadow-[#ff7a2c]/20 hover:opacity-95"
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
              <h3 className="font-graphik text-[17px] font-semibold text-white">Thiết Bị Nghe Ngoại Tuyến</h3>
              <button
                type="button"
                onClick={() => setSelectedUserForDevices(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-[12px] text-white/50">
              Danh sách thiết bị di động của <strong>{selectedUserForDevices.fullName}</strong> đã kích hoạt nghe offline:
            </p>

            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {userDevices.length === 0 ? (
                <p className="text-center py-6 text-white/30 text-[12px] font-mono">
                  Chưa có thiết bị nào được đăng ký offline.
                </p>
              ) : (
                userDevices.map((dev) => (
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
                        onClick={() => onRevokeDevice(dev.id)}
                        className="font-mono text-[10px] font-semibold text-rose-300 bg-rose-500/15 border border-rose-500/20 px-2.5 py-1 rounded-full hover:bg-rose-500/25"
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

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUserForDevices(null)}
                className="w-full rounded-xl bg-white/10 py-2.5 text-xs font-medium text-white hover:bg-white/15"
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
                <p className="font-mono text-xs text-white/50">Khôi phục mật khẩu mặc định cho người dùng</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-1">
              <p className="font-semibold text-white">{selectedUserForResetPassword.fullName}</p>
              <p className="font-mono text-xs text-white/50">@{selectedUserForResetPassword.username} · {selectedUserForResetPassword.email}</p>
            </div>

            <p className="text-sm text-white/70 leading-relaxed">
              Mật khẩu của tài khoản này sẽ được đặt lại về mật khẩu mặc định của hệ thống:{" "}
              <strong className="text-amber-300 font-mono">123456</strong> (đã được mã hóa an toàn BCrypt trên hệ thống).
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedUserForResetPassword(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/60 hover:bg-white/5"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmResetPassword}
                className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20"
              >
                Xác Nhận Đặt Lại (123456)
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}
      {/* ================= MODAL: CREATE NEW USER ================= */}
      {isCreateUserModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/85 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#0e111a] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ff7a2c]/15 text-[#ff7a2c]">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-graphik text-lg font-bold text-white">Thêm Người Dùng Mới</h3>
                  <p className="font-mono text-xs text-white/50">Cấp mới tài khoản truy cập vào hệ thống</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateUserModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/70 block mb-1 font-semibold">Tên Đăng Nhập (@username) *</label>
                  <input
                    type="text"
                    value={newUserData.username}
                    onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                    placeholder="vidu_user"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-[#ff7a2c] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/70 block mb-1 font-semibold">Họ và Tên Đầy Đủ *</label>
                  <input
                    type="text"
                    value={newUserData.fullName}
                    onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-[#ff7a2c] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/70 block mb-1 font-semibold">Email *</label>
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder="user@moodify.com"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-[#ff7a2c] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/70 block mb-1 font-semibold">Số Điện Thoại</label>
                  <input
                    type="text"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                    placeholder="0912345678"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-[#ff7a2c] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/70 block mb-1 font-semibold">Vai Trò (Role)</label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as AdminUserRole })}
                    className="w-full rounded-xl border border-white/10 bg-[#121622] px-3.5 py-2.5 text-xs text-white focus:border-[#ff7a2c] focus:outline-none"
                  >
                    <option value="USER">Thính giả (USER)</option>
                    <option value="ARTIST">Nghệ sĩ (ARTIST)</option>
                    <option value="MODERATOR">Kiểm duyệt viên (MODERATOR)</option>
                    <option value="ADMIN">Quản trị viên (ADMIN)</option>
                  </select>
                </div>
                <div>
                  <label className="text-white/70 block mb-1 font-semibold">Trạng Thái Ban Đầu</label>
                  <select
                    value={newUserData.status}
                    onChange={(e) => setNewUserData({ ...newUserData, status: e.target.value as AdminUserStatus })}
                    className="w-full rounded-xl border border-white/10 bg-[#121622] px-3.5 py-2.5 text-xs text-white focus:border-[#ff7a2c] focus:outline-none"
                  >
                    <option value="ACTIVE">Kích hoạt ngay (ACTIVE)</option>
                    <option value="INACTIVE">Chưa kích hoạt (INACTIVE)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-white/70 block mb-1 font-semibold">Mật Khẩu Khởi Tạo</label>
                <input
                  type="text"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder="Mặc định: User@123456"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm font-mono text-emerald-400 font-bold focus:border-[#ff7a2c] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsCreateUserModalOpen(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5 transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveCreateUser}
                className="rounded-xl bg-[#ff7a2c] px-5 py-2 text-xs font-bold text-black hover:brightness-110 shadow-lg shadow-[#ff7a2c]/20 transition"
              >
                Tạo Người Dùng
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}

      {/* CONFIRMATION MODAL: DELETE USER */}
      {selectedUserForDelete && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/85 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-rose-500/30 bg-[#0c1017] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="h-6 w-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Xác Nhận Xóa Tài Khoản</h3>
                <p className="text-xs text-rose-400/80 font-mono">Hủy phiên đăng nhập & xóa vĩnh viễn</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản người dùng <strong className="text-white">"{selectedUserForDelete.fullName}"</strong> (@{selectedUserForDelete.username}, vai trò {selectedUserForDelete.role}) khỏi cơ sở dữ liệu?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedUserForDelete(null)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition"
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetId = selectedUserForDelete.id;
                  setSelectedUserForDelete(null);
                  if (inspectingUser?.id === targetId) {
                    setInspectingUser(null);
                  }
                  if (onDeleteUser) {
                    onDeleteUser(targetId);
                  } else {
                    onBanUser(targetId, "Tài khoản bị xóa / hủy bởi Admin", "Vĩnh viễn");
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-900/30 hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                <Trash2 className="h-4 w-4" /> Xác Nhận Xóa Tài Khoản
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}
    </div>
  );
}
