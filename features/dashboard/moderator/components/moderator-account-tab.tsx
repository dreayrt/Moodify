"use client";

import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Shield,
  KeyRound,
  Camera,
  Save,
} from "lucide-react";
import { changePassword, getValidAccessToken, updateCurrentUserProfile, uploadAvatar, type UserProfileResponse } from "@/lib/auth/auth-client";
import { ModeratorProfile } from "../types";

type ModeratorAccountTabProps = {
  profile: ModeratorProfile;
  onUpdateProfile: (updated: ModeratorProfile) => void;
  onShowToast: (message: string, type: "success" | "info" | "error") => void;
};

function accountError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (error.message === "Failed to fetch" || error.name === "TimeoutError" || error.name === "AbortError") {
      return "Không nhận được phản hồi từ máy chủ. Vui lòng kiểm tra kết nối và thử lại.";
    }
    return error.message;
  }
  return fallback;
}

export function ModeratorAccountTab({
  profile,
  onUpdateProfile,
  onShowToast,
}: ModeratorAccountTabProps) {
  const [draft, setDraft] = useState<Partial<Pick<ModeratorProfile, "fullName" | "phone">>>({});
  const formData = { ...profile, ...draft };
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const initials = (formData.fullName || "K")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const applySavedProfile = (saved: UserProfileResponse) => {
    const updated = {
      ...profile,
      id: String(saved.id),
      fullName: saved.fullName,
      username: saved.username,
      email: saved.email,
      phone: saved.phone || "",
      avatarUrl: saved.avatarUrl || profile.avatarUrl,
    };
    setDraft({});
    onUpdateProfile(updated);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isUploadingAvatar) return;
    if (!formData.fullName.trim()) {
      onShowToast("Vui lòng nhập họ và tên.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const saved = await updateCurrentUserProfile({ fullName: formData.fullName, phone: formData.phone });
      applySavedProfile(saved);
      onShowToast("Đã lưu thông tin tài khoản.", "success");
    } catch (error) {
      onShowToast(accountError(error, "Không thể lưu thông tin tài khoản."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChangingPass) return;
    if (!currentPassword) {
      onShowToast("Vui lòng nhập mật khẩu hiện tại.", "error");
      return;
    }
    if (newPassword.length < 6) {
      onShowToast("Mật khẩu mới phải có ít nhất 6 ký tự.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      onShowToast("Mật khẩu xác nhận không trùng khớp.", "error");
      return;
    }

    setIsChangingPass(true);
    try {
      await changePassword(currentPassword, newPassword);
      onShowToast("Đã đổi mật khẩu.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      onShowToast(
        accountError(err, "Đổi mật khẩu thất bại. Vui lòng thử lại."),
        "error"
      );
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || isUploadingAvatar || isSaving) return;
    if (!file.type.startsWith("image/")) {
      onShowToast("Vui lòng chọn tệp hình ảnh.", "error");
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const token = await getValidAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const saved = await uploadAvatar(token, file);
      const savedAvatarUrl = saved.avatarUrl || profile.avatarUrl;
      onUpdateProfile({ ...profile, avatarUrl: savedAvatarUrl });
      onShowToast("Đã lưu ảnh đại diện mới.", "success");
    } catch (error) {
      onShowToast(accountError(error, "Không thể lưu ảnh đại diện."), "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative group">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt={formData.fullName}
                  className="h-20 w-20 rounded-2xl object-cover border border-white/15"
                />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-2xl border border-white/15 bg-white/[0.06] text-xl font-bold text-white">
                  {initials}
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-1 -right-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-[#ff5500] text-white shadow hover:scale-110 transition"
                title="Thay ảnh đại diện"
              >
                <Camera className="h-3.5 w-3.5" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  disabled={isUploadingAvatar || isSaving}
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-white">
                {formData.fullName}
              </h2>
              <p className="text-sm text-white/60">
                {formData.roleTitle}
                {formData.username ? ` · @${formData.username}` : ""}
              </p>
              {formData.email && (
                <p className="mt-1 text-xs text-white/45">{formData.email}</p>
              )}
            </div>
          </div>

          {/* Summary metrics from real history */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-center">
              <p className="font-display text-lg font-bold text-white tabular-nums">
                {profile.totalReviewed}
              </p>
              <p className="text-[11px] text-white/45">
                Bài đã duyệt
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-center">
              <p className="font-display text-lg font-bold text-emerald-400 tabular-nums">
                {profile.totalReviewed > 0 ? `${profile.approvalRate}%` : "—"}
              </p>
              <p className="text-[11px] text-white/45">
                Tỷ lệ duyệt
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-center">
              <p className="font-display text-lg font-bold text-[#ff8b4d] tabular-nums">
                {profile.avgReviewTimeMin > 0 ? `${profile.avgReviewTimeMin} phút` : "—"}
              </p>
              <p className="text-[11px] text-white/45">
                Thời gian TB/bài
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Info Form & Security Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Profile Info Form (7 cols) */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-6 lg:col-span-7">
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-4">
            <User className="h-5 w-5 text-[#ff8b4d]" />
            <h3 className="font-display text-base font-semibold text-white">
              Thông tin tài khoản
            </h3>
          </div>

          <form onSubmit={handleProfileSubmit} className="mt-5 space-y-4">
            <p className="text-xs text-white/50">Tên đăng nhập và email do quản trị viên quản lý.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-white/70">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  disabled={isSaving}
                  onChange={(e) =>
                    setDraft((previous) => ({ ...previous, fullName: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white focus:border-[#ff5500] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70">
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  readOnly
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white/60 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-white/70">
                  Email
                </label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    readOnly
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-3.5 text-[13px] text-white/60 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70">
                  Số điện thoại
                </label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={formData.phone}
                    disabled={isSaving}
                    onChange={(e) =>
                      setDraft((previous) => ({ ...previous, phone: e.target.value }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-3.5 text-[13px] text-white focus:border-[#ff5500] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={isSaving || isUploadingAvatar}
                className="flex items-center gap-2 rounded-full bg-[#ff5500] px-6 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#ff6a1a] active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Security & Password Form (5 cols) */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#12141c] p-6 lg:col-span-5">
          <div>
            <div className="flex items-center gap-2 border-b border-white/[0.08] pb-4">
              <KeyRound className="h-5 w-5 text-sky-400" />
              <h3 className="font-display text-base font-semibold text-white">
                Đổi mật khẩu
              </h3>
            </div>

            <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/70">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  disabled={isChangingPass}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white focus:border-[#ff5500] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  disabled={isChangingPass}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white focus:border-[#ff5500] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  disabled={isChangingPass}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white focus:border-[#ff5500] focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-sky-500/35 bg-sky-500/15 py-2.5 text-[13px] font-medium text-sky-300 transition hover:bg-sky-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Shield className="h-4 w-4" />
                  <span>
                    {isChangingPass ? "Đang cập nhật..." : "Đổi mật khẩu"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
