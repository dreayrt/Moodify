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
  CheckCircle2,
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
      onShowToast("Cập nhật thông tin tài khoản thành công!", "success");
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
      onShowToast("Đã đổi mật khẩu thành công!", "success");
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
      {/* Top Banner: Moderator Badge & Performance Credentials */}
      <div className="relative overflow-hidden rounded-[26px] border border-white/8 bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-transparent p-6 shadow-[0_20px_45px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <img
                src={formData.avatarUrl}
                alt={formData.fullName}
                className="h-20 w-20 rounded-2xl object-cover border-2 border-[#ff7a2c]/50 shadow-[0_8px_24px_rgba(255,122,44,0.25)]"
              />
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-1 -right-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-[#ff7a2c] text-white shadow hover:scale-110 transition"
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
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-white">
                  {formData.fullName}
                </h2>
                <span className="rounded-full border border-[#ff7a2c]/30 bg-[#ff7a2c]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#ffb488]">
                  {formData.staffId}
                </span>
              </div>
              <p className="text-[13px] text-white/60">
                {formData.roleTitle} • {formData.department}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đang trực tuyến (Active Shift)
                </span>
                <span className="text-white/30">•</span>
                <span className="text-[11px] text-white/40">
                  Gia nhập: {formData.joinedDate}
                </span>
              </div>
            </div>
          </div>

          {/* Performance summary pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-center">
              <p className="font-display text-lg font-bold text-white">
                {profile.totalReviewed}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-white/40">
                Tổng bài đã duyệt
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-center">
              <p className="font-display text-lg font-bold text-emerald-400">
                {profile.approvalRate}%
              </p>
              <p className="text-[10px] uppercase tracking-wider text-white/40">
                Tỷ lệ chấp thuận
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-center">
              <p className="font-display text-lg font-bold text-[#ff8b4d]">
                {profile.avgReviewTimeMin}m
              </p>
              <p className="text-[10px] uppercase tracking-wider text-white/40">
                Thời gian TB/bài
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Info Form & Security Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Profile Info Form (7 cols) */}
        <div className="rounded-[26px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl lg:col-span-7">
          <div className="flex items-center gap-2 border-b border-white/8 pb-4">
            <User className="h-5 w-5 text-[#ff8b4d]" />
            <h3 className="font-display text-base font-semibold text-white">
              Thông Tin Định Danh Kiểm Duyệt Viên
            </h3>
          </div>

          <form onSubmit={handleProfileSubmit} className="mt-5 space-y-4">
            <p className="text-[12px] text-white/50">Tên tài khoản và email do quản trị viên quản lý.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[12px] font-medium text-white/70">
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
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white focus:border-[#ff7a2c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-white/70">
                  Tên tài khoản (Username)
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  readOnly
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white focus:border-[#ff7a2c] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[12px] font-medium text-white/70">
                  Email công vụ
                </label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    readOnly
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-3.5 text-[13px] text-white focus:border-[#ff7a2c] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-white/70">
                  Số điện thoại liên hệ
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
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-3.5 text-[13px] text-white focus:border-[#ff7a2c] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[12px] font-medium text-white/70">
                  Chức danh
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.roleTitle}
                  className="mt-1.5 w-full rounded-xl border border-white/8 bg-white/[0.01] px-3.5 py-2.5 text-[13px] text-white/50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-white/70">
                  Phòng ban
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.department}
                  className="mt-1.5 w-full rounded-xl border border-white/8 bg-white/[0.01] px-3.5 py-2.5 text-[13px] text-white/50 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={isSaving || isUploadingAvatar}
                className="flex items-center gap-2 rounded-full bg-[#ff7a2c] px-6 py-2.5 text-[13px] font-medium text-white shadow-[0_4px_16px_rgba(255,122,44,0.3)] transition hover:bg-[#ff8f50] active:scale-95 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Security & Password Form (5 cols) */}
        <div className="rounded-[26px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-white/8 pb-4">
              <KeyRound className="h-5 w-5 text-[#427ddb]" />
              <h3 className="font-display text-base font-semibold text-white">
                Bảo Mật & Mật Khẩu
              </h3>
            </div>

            <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-white/70">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  disabled={isChangingPass}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white focus:border-[#427ddb] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-white/70">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  disabled={isChangingPass}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white focus:border-[#427ddb] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-white/70">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  disabled={isChangingPass}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white focus:border-[#427ddb] focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-[#427ddb]/40 bg-[#427ddb]/15 py-2.5 text-[13px] font-medium text-[#7faaf5] transition hover:bg-[#427ddb]/25 active:scale-95 disabled:opacity-50"
                >
                  <Shield className="h-4 w-4" />
                  <span>
                    {isChangingPass ? "Đang cập nhật..." : "Đổi mật khẩu"}
                  </span>
                </button>
              </div>
            </form>
          </div>

          <div className="mt-8 rounded-2xl border border-white/6 bg-white/[0.02] p-4 text-[12px] text-white/50">
            <p className="font-semibold text-white/80">Xác thực hai lớp (2FA)</p>
            <p className="mt-1">
              Tài khoản kiểm duyệt viên bắt buộc tuân thủ chính sách bảo mật dữ
              liệu âm nhạc độc quyền của Moodify.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
