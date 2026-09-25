"use client";

import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  UploadCloud,
  X,
  Check,
  Globe2,
  Lock,
  EyeOff,
  FileAudio,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Trash2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  Sparkles,
  Info,
  Loader2,
} from "lucide-react";
import { uploadArtistTrack } from "@/lib/auth/auth-client";
import {
  ArtistTrack,
  LicenseStatus,
  LicenseType,
  SongLicense,
  TrackStatus,
  TrackVisibility,
} from "../types";

type TrackUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newTrack: ArtistTrack) => void;
};

const GRADIENT_PALETTES = [
  "linear-gradient(135deg, #ff7a2c, #7a5cff)",
  "linear-gradient(135deg, #5cffd1, #2c2c52)",
  "linear-gradient(135deg, #ff8fbf, #7a1c4a)",
  "linear-gradient(135deg, #bff0d8, #3da080)",
  "linear-gradient(135deg, #ffae5a, #9a4d2a)",
  "linear-gradient(135deg, #a0b0ff, #1f1f3f)",
];

const LICENSE_TYPES: Array<{
  value: LicenseType;
  label: string;
  desc: string;
  badge: string;
}> = [
  {
    value: "DIGITAL_STREAMING",
    label: "Digital Streaming",
    desc: "Bản quyền phát trực tuyến kỹ thuật số cho các nền tảng streaming âm nhạc",
    badge: "Phổ biến nhất",
  },
  {
    value: "MASTER_LICENSE",
    label: "Master License",
    desc: "Quyền sở hữu bản ghi âm gốc (Master Recording Rights)",
    badge: "Bản ghi gốc",
  },
  {
    value: "DIRECT_LICENSE",
    label: "Direct License",
    desc: "Cấp phép trực tiếp từ nghệ sĩ độc lập (Independent Creator)",
    badge: "Nghệ sĩ tự do",
  },
  {
    value: "STREAMING_PENDING",
    label: "Streaming Pending",
    desc: "Đang trong tiến trình chờ xét duyệt hồ sơ cấp phép phát hành",
    badge: "Chờ xét duyệt",
  },
];

const DISTRIBUTOR_OPTIONS = [
  { id: "", name: "Không qua đơn vị phân phối (Tự phát hành độc lập)", share: "100%" },
  { id: "1", name: "Moodify Direct Distribution (Nội bộ)", share: "85%" },
  { id: "2", name: "DistroKid Music Group", share: "Đối tác" },
  { id: "3", name: "TuneCore Digital Media", share: "Đối tác" },
  { id: "4", name: "Universal / Sony Music Publishing", share: "Hãng đĩa" },
];

function createTrackId(counter: number): string {
  return `trk-${counter}`;
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultExpiryDateString(): string {
  const now = new Date();
  const year = now.getFullYear() + 1;
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function TrackUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: TrackUploadModalProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const licenseDocInputRef = useRef<HTMLInputElement>(null);
  const trackCounterRef = useRef<number>(100);

  // Wizard Step State: 1 = Track Info, 2 = License & Copyright
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [stepError, setStepError] = useState<string | null>(null);

  // File objects for multipart upload
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [licenseDocFile, setLicenseDocFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Audio file states
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");

  // Cover image states
  const [coverUrl, setCoverUrl] = useState<string>("");

  // Step 1: Track Metadata matching MongoDB track schema
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Pop");
  const [featuredArtists, setFeaturedArtists] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [explicit, setExplicit] = useState(false);
  const status: TrackStatus = "draft";
  const [visibility, setVisibility] = useState<TrackVisibility>("public");
  const [lyrics, setLyrics] = useState("");
  const [description, setDescription] = useState("");

  // Step 2: License Metadata matching MySQL `song_licenses` table
  const [licenseType, setLicenseType] = useState<LicenseType>("DIGITAL_STREAMING");
  const [copyrightOwner, setCopyrightOwner] = useState("Independent Artist");
  const [distributorId, setDistributorId] = useState<string>("");
  const [distributionContractId, setDistributionContractId] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>(getTodayDateString());
  const [expiryDate, setExpiryDate] = useState<string>(getDefaultExpiryDateString());
  const [isPerpetual, setIsPerpetual] = useState<boolean>(false);
  const [licenseStatus] = useState<LicenseStatus>("PENDING");
  const [licenseDocName, setLicenseDocName] = useState<string>("");
  const [licenseDocSize, setLicenseDocSize] = useState<string>("");
  const [licenseDocUrl, setLicenseDocUrl] = useState<string>("");

  // UI helpers
  const [isDragging, setIsDragging] = useState(false);
  const [isDocDragging, setIsDocDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const handleAudioFile = (file: File) => {
    setAudioFile(file);
    setSelectedFileName(file.name);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    setFileSize(`${sizeInMB} MB`);
    setStepError(null);

    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    if (!title || title.trim() === "") {
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleCoverFile = (file: File) => {
    setCoverFile(file);
    const objectUrl = URL.createObjectURL(file);
    setCoverUrl(objectUrl);
  };

  const handleLicenseDocFile = (file: File) => {
    setLicenseDocFile(file);
    setLicenseDocName(file.name);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    setLicenseDocSize(`${sizeInMB} MB`);
    const objectUrl = URL.createObjectURL(file);
    setLicenseDocUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAudioFile(e.dataTransfer.files[0]);
    }
  };

  const handleDocDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDocDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLicenseDocFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleAudioFile(e.target.files[0]);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleCoverFile(e.target.files[0]);
    }
  };

  const handleLicenseDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleLicenseDocFile(e.target.files[0]);
    }
  };

  const handleNextStep = (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    if (!title || title.trim() === "") {
      setTitle(selectedFileName ? selectedFileName.replace(/\.[^/.]+$/, "") : "Bản phối mới (New Track)");
    }
    setStepError(null);
    setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setStepError(null);
    setCurrentStep(1);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!audioFile && !selectedFileName) {
      setStepError("Vui lòng chọn tệp âm thanh trước khi gửi yêu cầu.");
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    setStepError(null);

    const finalTitle = title.trim() || selectedFileName || "Untitled Track";

    try {
      const formData = new FormData();
      if (audioFile) {
        formData.append("audioFile", audioFile);
      }
      if (coverFile) {
        formData.append("coverFile", coverFile);
      }
      if (licenseDocFile) {
        formData.append("licenseDocFile", licenseDocFile);
      }

      formData.append("title", finalTitle);
      formData.append("genre", genre.trim() || "Pop");
      formData.append("featuredArtists", featuredArtists.trim());
      formData.append("albumName", albumName.trim());
      formData.append("status", status);
      formData.append("visibility", visibility);
      formData.append("explicit", String(explicit));
      formData.append("lyricsPlain", lyrics.trim());
      formData.append("description", description.trim());

      // License Info
      formData.append("licenseType", licenseType);
      if (distributorId && distributorId !== "0") {
        formData.append("distributorId", distributorId);
        if (distributionContractId.trim()) {
          const cleanContractId = distributionContractId.replace(/\D/g, "");
          if (cleanContractId) formData.append("distributionContractId", cleanContractId);
        }
      } else {
        formData.append("copyrightOwner", copyrightOwner.trim() || "Independent Artist");
      }
      formData.append("issueDate", issueDate);
      if (!isPerpetual && expiryDate) {
        formData.append("expiryDate", expiryDate);
      }
      formData.append("isPerpetual", String(isPerpetual));

      // Call Backend API to save Track in MongoDB and SongLicense in MySQL
      const savedResponse = await uploadArtistTrack(formData);

      const songLicense: SongLicense = {
        id: `lic-${savedResponse.id}`,
        trackId: savedResponse.id,
        distributorId: distributorId ? Number(distributorId) : null,
        distributionContractId: distributionContractId.trim()
          ? Number(distributionContractId.replace(/\D/g, "")) || 1
          : null,
        licenseType,
        copyrightOwner: copyrightOwner.trim() || "Independent Artist",
        issueDate: issueDate || null,
        expiryDate: isPerpetual ? null : expiryDate || null,
        status: "PENDING",
        documentUrl: licenseDocUrl || savedResponse.coverUrl || undefined,
        documentName: licenseDocName || "Chung_nhan_ban_quyen.pdf",
      };

      const newTrack: ArtistTrack = {
        id: savedResponse.id,
        title: savedResponse.title || finalTitle,
        artist: savedResponse.artist || "You (Content Lead)",
        genre: savedResponse.genre || genre.trim() || "Pop",
        duration: savedResponse.duration || "0:00",
        status: (savedResponse.status as TrackStatus) || "draft",
        visibility: (savedResponse.visibility as TrackVisibility) || "private",
        plays: 0,
        likes: 0,
        commentsCount: 0,
        coverUrl: savedResponse.coverUrl || coverUrl || undefined,
        audioUrl: savedResponse.audioUrl || undefined,
        albumName: albumName.trim() || undefined,
        featuredArtists: featuredArtists.trim() || undefined,
        explicit,
        lyricsPlain: lyrics.trim() || undefined,
        description: description.trim() || undefined,
        license: songLicense,
        moderationStatus: "pending",
        updatedAt: "Vừa xong",
        createdAt: new Date().toISOString().split("T")[0],
      };

      onUploadSuccess(newTrack);
      handleReset();
      onClose();
    } catch (err: any) {
      console.error("Failed to upload track and submit license:", err);
      // Fallback optimistic mode if offline or backend connection error so user is never blocked
      if (err.message && err.message.includes("Failed to fetch")) {
        setStepError("Không thể kết nối đến máy chủ backend. Vui lòng kiểm tra backend đang chạy.");
      } else {
        setStepError(err.message || "Gửi yêu cầu kiểm duyệt thất bại. Vui lòng thử lại!");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setStepError(null);
    setIsSubmitting(false);
    setAudioFile(null);
    setCoverFile(null);
    setLicenseDocFile(null);
    setSelectedFileName("");
    setFileSize("");
    setCoverUrl("");
    setTitle("");
    setGenre("Pop");
    setFeaturedArtists("");
    setAlbumName("");
    setExplicit(false);
    setVisibility("public");
    setLyrics("");
    setDescription("");
    setShowAdvanced(false);

    // Reset license states
    setLicenseType("DIGITAL_STREAMING");
    setCopyrightOwner("Independent Artist");
    setDistributorId("1");
    setDistributionContractId("");
    setIssueDate(getTodayDateString());
    setExpiryDate(getDefaultExpiryDateString());
    setIsPerpetual(false);
    setLicenseDocName("");
    setLicenseDocSize("");
    setLicenseDocUrl("");
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={handleModalClose}
      />

      {/* Modal Container: Studio 2-Column Wide Layout */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[28px] border border-white/12 bg-[#121318] shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header with Step Indicator */}
        <div className="flex flex-col border-b border-white/8 shrink-0 bg-[#121318]">
          <div className="flex items-center justify-between px-6 sm:px-8 py-3.5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-[#ff7a2c] to-[#ffb488] text-black shadow-[0_6px_18px_rgba(255,122,44,0.3)]">
                {currentStep === 1 ? (
                  <UploadCloud className="h-5 w-5" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="font-graphik text-[18px] sm:text-[20px] font-semibold text-white">
                  {currentStep === 1
                    ? t("dashboard.artist.trackCatalog.modal.uploadTitle")
                    : "Khai báo bản quyền & Giấy phép bài hát"}
                </h3>
                <p className="text-[12px] text-white/50">
                  {currentStep === 1
                    ? t("dashboard.artist.trackCatalog.modal.uploadSubtitle")
                    : "Đăng ký thông tin quyền tác giả (song_licenses) để bảo vệ bản quyền phát hành"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleModalClose}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.1] hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step Wizard Progress Bar */}
          <div className="grid grid-cols-2 bg-white/[0.02] border-t border-white/5 text-[12px]">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 font-medium transition border-b-2 ${
                currentStep === 1
                  ? "border-[#ff7a2c] text-[#ffb488] bg-[#ff7a2c]/5"
                  : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${
                  currentStep === 1
                    ? "bg-[#ff7a2c] text-black"
                    : "bg-white/10 text-white/70"
                }`}
              >
                1
              </span>
              <span>1. Thông tin bài hát</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStepError(null);
                setCurrentStep(2);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 font-medium transition border-b-2 ${
                currentStep === 2
                  ? "border-[#ff7a2c] text-[#ffb488] bg-[#ff7a2c]/5"
                  : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${
                  currentStep === 2
                    ? "bg-[#ff7a2c] text-black"
                    : "bg-white/10 text-white/70"
                }`}
              >
                2
              </span>
              <span>2. Bản quyền & Giấy phép (song_licenses)</span>
            </button>
          </div>
        </div>

        {/* Hidden inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*,video/mp4,.mp3,.wav,.flac,.aac,.m4a,.mp4"
          className="hidden"
        />
        <input
          type="file"
          ref={coverInputRef}
          onChange={handleCoverChange}
          accept="image/*,.png,.jpg,.jpeg,.webp"
          className="hidden"
        />
        <input
          type="file"
          ref={licenseDocInputRef}
          onChange={handleLicenseDocChange}
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          className="hidden"
        />

        {/* Error banner if any */}
        {stepError && (
          <div className="mx-6 sm:mx-8 mt-3 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-[12px] text-rose-300 animate-in fade-in">
            <Info className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{stepError}</span>
          </div>
        )}

        {/* ================= STEP 1: Track Information Form ================= */}
        {currentStep === 1 && (
          <form onSubmit={handleNextStep} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5 scrollbar-thin scrollbar-thumb-white/10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN: Media & Artwork (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Audio Upload Dropzone */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-2">
                      Tệp âm thanh <span className="text-[#ff7a2c]">*</span>
                    </label>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-all flex flex-col justify-center items-center min-h-[160px] ${
                        isDragging
                          ? "border-[#ff7a2c] bg-[#ff7a2c]/10 scale-[1.01]"
                          : selectedFileName
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
                      }`}
                    >
                      {selectedFileName ? (
                        <div className="flex flex-col items-center gap-2 text-emerald-300">
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
                            <FileAudio className="h-6 w-6" />
                          </div>
                          <div className="text-center px-2">
                            <p className="text-[13px] font-medium text-white truncate max-w-[220px]">
                              {selectedFileName}
                            </p>
                            <p className="text-[11px] text-emerald-400/80 mt-0.5">
                              {fileSize} • Sẵn sàng tải lên
                            </p>
                          </div>
                          <span className="text-[10px] text-white/40 hover:text-white underline mt-1">
                            Nhấn để đổi file khác
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.06] text-white/80 mb-2">
                            <UploadCloud className="h-5 w-5" />
                          </div>
                          <p className="text-[12px] font-medium text-white/90">
                            {t("dashboard.artist.trackCatalog.modal.uploadDropzone")}
                          </p>
                          <p className="mt-1 text-[10px] text-white/40">
                            Hỗ trợ MP3, WAV, FLAC, AAC, MP4 tối đa 100MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Cover Artwork Box */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-2">
                      {t("dashboard.artist.trackCatalog.modal.coverDropzone")}
                    </label>
                    <div
                      onClick={() => coverInputRef.current?.click()}
                      className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] p-3.5 flex items-center gap-3.5 transition"
                    >
                      <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-white/[0.05] border border-white/10 flex items-center justify-center">
                        {coverUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={coverUrl}
                              alt="Cover preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCoverUrl("");
                              }}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <ImageIcon className="h-6 w-6 text-white/30 group-hover:text-[#ff7a2c] transition" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[12px] font-medium text-white/90">
                          {coverUrl ? "Đã chọn ảnh bìa" : t("dashboard.artist.trackCatalog.modal.coverDropzone")}
                        </p>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {coverUrl ? "Bấm để thay đổi" : t("dashboard.artist.trackCatalog.modal.coverDropzoneHint")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Track Metadata & Settings (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Track Title */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                      {t("dashboard.artist.trackCatalog.modal.trackName")}{" "}
                      <span className="text-[#ff7a2c]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (e.target.value.trim()) setStepError(null);
                      }}
                      placeholder={t(
                        "dashboard.artist.trackCatalog.modal.trackNamePlaceholder"
                      )}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 focus:bg-white/[0.07] transition"
                    />
                  </div>

                  {/* Genre & Featured Artists */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                        {t("dashboard.artist.trackCatalog.modal.genre")}
                      </label>
                      <input
                        type="text"
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        placeholder={t(
                          "dashboard.artist.trackCatalog.modal.genrePlaceholder"
                        )}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                        {t("dashboard.artist.trackCatalog.modal.featuredArtists")}
                      </label>
                      <input
                        type="text"
                        value={featuredArtists}
                        onChange={(e) => setFeaturedArtists(e.target.value)}
                        placeholder={t(
                          "dashboard.artist.trackCatalog.modal.featuredArtistsPlaceholder"
                        )}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 transition"
                      />
                    </div>
                  </div>

                  {/* Album */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                      {t("dashboard.artist.trackCatalog.modal.album")}
                    </label>
                    <input
                      type="text"
                      value={albumName}
                      onChange={(e) => setAlbumName(e.target.value)}
                      placeholder={t(
                        "dashboard.artist.trackCatalog.modal.albumPlaceholder"
                      )}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 transition"
                    />
                  </div>

                  {/* Visibility (Full Width for all 3 buttons) */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                      {t("dashboard.artist.trackCatalog.modal.visibility")}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "public" as TrackVisibility, labelKey: "public", icon: Globe2 },
                        { key: "private" as TrackVisibility, labelKey: "private", icon: Lock },
                        { key: "unlisted" as TrackVisibility, labelKey: "unlisted", icon: EyeOff },
                      ].map(({ key: visKey, labelKey, icon: Icon }) => (
                        <button
                          key={visKey}
                          type="button"
                          onClick={() => setVisibility(visKey)}
                          className={`flex items-center justify-center gap-2 rounded-xl border py-2 px-2 text-[12px] font-medium whitespace-nowrap transition ${
                            visibility === visKey
                              ? "border-[#ff8b4d]/40 bg-[#ff8b4d]/10 text-[#ffb488]"
                              : "border-white/8 bg-white/[0.02] text-white/50 hover:text-white/80"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span>{t(`dashboard.artist.trackCatalog.visibilities.${labelKey}`)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Explicit 18+ Row */}
                  <div>
                    <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-xl border border-white/8 bg-white/[0.02] p-2 hover:border-white/15 transition">
                      <input
                        type="checkbox"
                        checked={explicit}
                        onChange={(e) => setExplicit(e.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-white/10 text-[#ff7a2c] focus:ring-0 accent-[#ff7a2c]"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-grid h-3.5 w-3.5 place-items-center rounded bg-white/15 text-[8px] font-bold text-white">
                            E
                          </span>
                          <span className="text-[11px] font-medium text-white/90">
                            {t("dashboard.artist.trackCatalog.modal.explicit")}
                          </span>
                        </div>
                        <span className="text-[10px] text-white/40">
                          ({t("dashboard.artist.trackCatalog.modal.explicitDesc")})
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Collapsible Lyrics & Description (Advanced) */}
                  <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full flex items-center justify-between px-3.5 py-2 text-[11px] font-medium text-white/60 hover:text-white hover:bg-white/[0.02] transition"
                    >
                      <span>{t("dashboard.artist.trackCatalog.modal.advancedOptions")}</span>
                      {showAdvanced ? (
                        <ChevronUp className="h-3.5 w-3.5 text-white/40" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-white/40" />
                      )}
                    </button>

                    {showAdvanced && (
                      <div className="p-3 pt-0 space-y-2.5 border-t border-white/6 animate-in fade-in duration-200">
                        <div>
                          <label className="block text-[10px] font-medium text-white/50 mb-1">
                            {t("dashboard.artist.trackCatalog.modal.lyrics")}
                          </label>
                          <textarea
                            rows={2}
                            value={lyrics}
                            onChange={(e) => setLyrics(e.target.value)}
                            placeholder={t("dashboard.artist.trackCatalog.modal.lyricsPlaceholder")}
                            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-[11px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-white/50 mb-1">
                            {t("dashboard.artist.trackCatalog.modal.description")}
                          </label>
                          <textarea
                            rows={1}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t("dashboard.artist.trackCatalog.modal.descriptionPlaceholder")}
                            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-[11px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 transition"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Bar - STEP 1 */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-3.5 border-t border-white/8 bg-[#121318] shrink-0">
              <div className="text-[11px] text-white/40">
                {selectedFileName ? (
                  <span className="text-emerald-400 font-medium">✓ Đã sẵn sàng bước tiếp theo</span>
                ) : (
                  <span>Vui lòng chọn file âm thanh để tiếp tục</span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] text-white/70 hover:bg-white/[0.08] hover:text-white transition"
                >
                  {t("dashboard.artist.trackCatalog.modal.cancel")}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff7a2c] to-[#ff9e64] px-5 py-2 text-[12px] font-semibold text-black shadow-[0_8px_20px_rgba(255,122,44,0.3)] hover:brightness-110 active:scale-95 transition"
                >
                  <span>Tiếp theo</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ================= STEP 2: Song License & Copyright Form (Compact 2-Column Layout, No Scroll) ================= */}
        {currentStep === 2 && (
          <form onSubmit={handleFinalSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 px-6 sm:px-8 py-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN: License Document Dropzone & Legal Badge (5 cols) */}
                <div className="lg:col-span-5 space-y-3.5">
                  {/* License Document Upload */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-2">
                      Tài liệu / Hợp đồng đính kèm
                    </label>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDocDragging(true);
                      }}
                      onDragLeave={() => setIsDocDragging(false)}
                      onDrop={handleDocDrop}
                      onClick={() => licenseDocInputRef.current?.click()}
                      className={`cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-all flex flex-col justify-center items-center min-h-[160px] ${
                        isDocDragging
                          ? "border-[#ff7a2c] bg-[#ff7a2c]/10"
                          : licenseDocName
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : "border-white/12 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
                      }`}
                    >
                      {licenseDocName ? (
                        <div className="flex flex-col items-center gap-2 text-emerald-300">
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="text-center px-2">
                            <p className="text-[13px] font-medium text-white truncate max-w-[220px]">
                              {licenseDocName}
                            </p>
                            <p className="text-[11px] text-emerald-400/80 mt-0.5">
                              {licenseDocSize} • Đã đính kèm tệp
                            </p>
                          </div>
                          <span className="text-[10px] text-white/40 hover:text-white underline mt-1">
                            Nhấn để đổi tệp khác
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.06] text-white/80 mb-2">
                            <FileText className="h-5 w-5" />
                          </div>
                          <p className="text-[12px] font-medium text-white/90">
                            Tải lên giấy phép / hợp đồng bản quyền
                          </p>
                          <p className="mt-1 text-[10px] text-white/40">
                            Hỗ trợ PDF, Scan, PNG, JPG tối đa 15MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: License Metadata Fields (7 cols) */}
                <div className="lg:col-span-7 space-y-3.5">
                  
                  {/* License Type Selector (Dropdown) */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                      Loại bản quyền / Giấy phép (<span className="text-[#ffb488] font-mono">license_type</span>) <span className="text-[#ff7a2c]">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={licenseType}
                        onChange={(e) => setLicenseType(e.target.value as LicenseType)}
                        className="w-full appearance-none rounded-xl border border-white/10 bg-[#17181f] px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-[#ff8b4d]/50 transition cursor-pointer"
                      >
                        {LICENSE_TYPES.map((type) => (
                          <option key={type.value} value={type.value} className="bg-[#121318] text-white">
                            {type.value} — {type.label} ({type.badge})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-3 h-4 w-4 pointer-events-none text-white/40" />
                    </div>
                  </div>

                  {/* Copyright Owner */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                      Chủ sở hữu quyền tác giả (<span className="text-[#ffb488] font-mono">copyright_owner</span>) <span className="text-[#ff7a2c]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={copyrightOwner}
                      onChange={(e) => setCopyrightOwner(e.target.value)}
                      placeholder="Ví dụ: Independent Artist hoặc Tên nghệ sĩ / Label..."
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 focus:bg-white/[0.07] transition"
                    />
                  </div>

                  {/* Distributor & Distribution Contract ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Distributor */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                        Đơn vị phân phối (<span className="text-[#ffb488] font-mono">distributor_id</span>)
                      </label>
                      <div className="relative">
                        <select
                          value={distributorId}
                          onChange={(e) => setDistributorId(e.target.value)}
                          className="w-full appearance-none rounded-xl border border-white/10 bg-[#17181f] px-3 py-2 text-[13px] text-white outline-none focus:border-[#ff8b4d]/50 transition cursor-pointer"
                        >
                          {DISTRIBUTOR_OPTIONS.map((dist) => (
                            <option key={dist.id} value={dist.id} className="bg-[#121318] text-white">
                              #{dist.id} - {dist.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 pointer-events-none text-white/40" />
                      </div>
                    </div>

                    {/* Distribution Contract ID */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                        Mã hợp đồng (<span className="text-[#ffb488] font-mono">contract_id</span>)
                      </label>
                      <input
                        type="text"
                        value={distributionContractId}
                        onChange={(e) => setDistributionContractId(e.target.value)}
                        placeholder="Ví dụ: CTR-2026-088"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[#ff8b4d]/50 transition"
                      />
                    </div>
                  </div>

                  {/* Issue Date & Expiry Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Issue Date */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-1.5">
                        Ngày cấp / Bắt đầu (<span className="text-[#ffb488] font-mono">issue_date</span>)
                      </label>
                      <input
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[13px] text-white outline-none focus:border-[#ff8b4d]/50 transition [color-scheme:dark]"
                      />
                    </div>

                    {/* Expiry Date */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
                          Ngày hết hạn (<span className="text-[#ffb488] font-mono">expiry_date</span>)
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-white/70 select-none">
                          <input
                            type="checkbox"
                            checked={isPerpetual}
                            onChange={(e) => setIsPerpetual(e.target.checked)}
                            className="h-3 w-3 rounded border-white/20 bg-white/10 text-[#ff7a2c] accent-[#ff7a2c]"
                          />
                          <span>Vô thời hạn</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        disabled={isPerpetual}
                        value={isPerpetual ? "" : expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className={`w-full rounded-xl border border-white/10 px-3 py-1.5 text-[13px] outline-none transition [color-scheme:dark] ${
                          isPerpetual
                            ? "bg-white/[0.02] text-white/30 cursor-not-allowed border-dashed"
                            : "bg-white/[0.04] text-white focus:border-[#ff8b4d]/50"
                        }`}
                      />
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* Footer Bar - STEP 2 */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-3.5 border-t border-white/8 bg-[#121318] shrink-0">
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] text-white/80 hover:bg-white/[0.08] hover:text-white transition"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Quay lại</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] text-white/70 hover:bg-white/[0.08] hover:text-white transition"
                >
                  {t("dashboard.artist.trackCatalog.modal.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff7a2c] to-[#ff9e64] px-5 py-2 text-[12px] font-semibold text-black shadow-[0_8px_20px_rgba(255,122,44,0.3)] hover:brightness-110 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang gửi yêu cầu...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Gửi yêu cầu kiểm duyệt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
