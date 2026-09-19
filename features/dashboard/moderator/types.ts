export type ModerationStatus = "pending" | "approved" | "rejected" | "needs_revision";

export type ModerationPriority = "urgent" | "high" | "normal";

export type ViolationCategory =
  | "copyright_infringement"
  | "hate_speech_offensive"
  | "poor_audio_quality"
  | "metadata_mismatch"
  | "unauthorized_sample"
  | "explicit_unlabeled"
  | "other";

export type AudioSpec = {
  format: string; // e.g. "FLAC 24-bit" | "MP3 320kbps"
  sampleRate: string; // e.g. "44.1 kHz" | "48.0 kHz"
  bitrate: string; // e.g. "320 kbps" | "1411 kbps"
  peakDb: number; // e.g. -0.2 dB
  durationSec: number;
};

export type AiSafetyAssessment = {
  riskScore: number; // 0-100 (high = risky)
  copyrightMatchPercent: number; // 0-100%
  explicitLyricsDetected: boolean;
  flaggedKeywords: string[];
  audioQualityScore: number; // 0-100
  notes?: string;
};

export type ModerationTrack = {
  id: string;
  title: string;
  artist: string;
  artistEmail?: string;
  artistAvatarUrl?: string;
  genre: string;
  duration: string;
  durationSec: number;
  coverUrl?: string;
  audioUrl?: string;
  waveform: number[]; // Amplitude points (e.g. 40-60 values between 0.1 and 1.0)
  submittedAt: string;
  priority: ModerationPriority;
  status: ModerationStatus;
  isrcCode?: string;
  label?: string;
  releaseType: "Single" | "EP Track" | "Album Track";
  explicitFlagByArtist: boolean;
  lyricsPlain?: string;
  audioSpec: AudioSpec;
  aiAssessment: AiSafetyAssessment;
  // Song license details from MySQL
  licenseType?: string;
  copyrightOwner?: string;
  distributorId?: number;
  distributionContractId?: number;
  issueDate?: string;
  expiryDate?: string;
  licenseStatus?: string;
  licenseDocumentUrl?: string;
};

export type ModerationHistoryItem = {
  id: string;
  trackId: string;
  trackTitle: string;
  artistName: string;
  genre: string;
  coverUrl?: string;
  reviewedAt: string;
  reviewerId: string;
  reviewerName: string;
  decision: "approved" | "rejected" | "needs_revision";
  violationCategory?: ViolationCategory;
  rejectionReason?: string;
  internalNote?: string;
  reviewDurationSec: number; // Thời gian thẩm định (giây)
  assignedExplicitTag?: boolean;
};

export type ModeratorProfile = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  avatarUrl: string;
  roleTitle: string;
  badge: string;
  staffId: string;
  department: string;
  joinedDate: string;
  totalReviewed: number;
  approvalRate: number;
  avgReviewTimeMin: number;
  preferences: {
    autoPlayOnSelect: boolean;
    defaultPlaybackRate: number;
    volumeLevel: number;
    urgentNotifications: boolean;
  };
};

export type ModerationStats = {
  pendingCount: number;
  urgentCount: number;
  approvedToday: number;
  rejectedToday: number;
  avgReviewTimeMinutes: number;
  approvalPercentage: number;
  shiftTarget: number;
  shiftCompleted: number;
  violationsDistribution: {
    category: string;
    label: string;
    percentage: number;
    count: number;
  }[];
};

export type ToastMessage = {
  id: string;
  type: "success" | "info" | "warning" | "error";
  message: string;
};
