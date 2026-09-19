import {
  ModerationHistoryItem,
  ModerationStats,
  ModerationTrack,
  ModeratorProfile,
} from "./types";

export const INITIAL_MODERATOR_PROFILE: ModeratorProfile = {
  id: "mod-01",
  fullName: "Kiểm Duyệt Viên",
  username: "moderator.moodify",
  email: "moderator@moodify.audio",
  phone: "0908 000 000",
  avatarUrl:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
  roleTitle: "Content Reviewer",
  badge: "Moderator Level 1",
  staffId: "MOD-VN-01",
  department: "Âm Nhạc & Tiêu Chuẩn Bản Quyền",
  joinedDate: "01/01/2026",
  totalReviewed: 0,
  approvalRate: 100,
  avgReviewTimeMin: 0,
  preferences: {
    autoPlayOnSelect: false,
    defaultPlaybackRate: 1.0,
    volumeLevel: 80,
    urgentNotifications: true,
  },
};

export const INITIAL_MODERATOR_STATS: ModerationStats = {
  pendingCount: 0,
  urgentCount: 0,
  approvedToday: 0,
  rejectedToday: 0,
  avgReviewTimeMinutes: 0,
  approvalPercentage: 100,
  shiftTarget: 50,
  shiftCompleted: 0,
  violationsDistribution: [],
};

// Cleaned: Danh sách bài hát chờ duyệt mặc định sạch
export const INITIAL_PENDING_TRACKS: ModerationTrack[] = [];

// Cleaned: Lịch sử kiểm duyệt mặc định sạch
export const INITIAL_MODERATION_HISTORY: ModerationHistoryItem[] = [];
