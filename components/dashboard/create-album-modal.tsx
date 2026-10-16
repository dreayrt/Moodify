"use client";

import { useState } from "react";
import { X, Disc, Sparkles, Image as ImageIcon, Loader2, Globe, Lock } from "lucide-react";
import { createAlbum, type Album } from "@/lib/api-client";

interface CreateAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (album: Album) => void;
}

const PRESET_ALBUM_COVERS = [
  {
    label: "Studio Master",
    url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop",
  },
  {
    label: "Acoustic Warmth",
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop",
  },
  {
    label: "Midnight City",
    url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop",
  },
  {
    label: "Sunset Indie",
    url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&auto=format&fit=crop",
  },
  {
    label: "Cyber Bass",
    url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop",
  },
];

export default function CreateAlbumModal({
  isOpen,
  onClose,
  onCreated,
}: CreateAlbumModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState(PRESET_ALBUM_COVERS[0].url);
  const [customCover, setCustomCover] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Vui lòng nhập tên Album");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newAlbum = await createAlbum({
        title: title.trim(),
        description: description.trim() || undefined,
        coverUrl: coverUrl.trim() || undefined,
        isPublic,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setCoverUrl(PRESET_ALBUM_COVERS[0].url);
      setCustomCover(false);
      setIsPublic(true);

      onCreated(newAlbum);
      onClose();
    } catch (err: any) {
      console.error("Create album error:", err);
      setError(err?.message || "Không thể tạo album, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400">
            <Disc className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Tạo Album Mới</h2>
            <p className="text-xs text-slate-400">
              Phát hành tuyển tập bài hát và chia sẻ đến cộng đồng Moodify
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Album Title */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Tên Album <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Tuyển Tập Ballad Việt 2026, Summer Vibes EP..."
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Mô tả Album (tuỳ chọn)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Đôi dòng giới thiệu về ý tưởng, giai điệu của album..."
              rows={2}
              disabled={loading}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all resize-none"
            />
          </div>

          {/* Visibility toggle */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Chế độ hiển thị
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  isPublic
                    ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300"
                    : "bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">Công khai</div>
                  <div className="text-[10px] text-slate-400">Mọi người đều có thể nghe</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  !isPublic
                    ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300"
                    : "bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">Riêng tư</div>
                  <div className="text-[10px] text-slate-400">Chỉ mình bạn thấy</div>
                </div>
              </button>
            </div>
          </div>

          {/* Cover Art Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                Ảnh bìa Album
              </label>
              <button
                type="button"
                onClick={() => setCustomCover(!customCover)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 underline transition-colors"
              >
                {customCover ? "Chọn ảnh có sẵn" : "Nhập URL ảnh tuỳ chỉnh"}
              </button>
            </div>

            {customCover ? (
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                disabled={loading}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {PRESET_ALBUM_COVERS.map((preset) => {
                  const isSelected = coverUrl === preset.url;
                  return (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setCoverUrl(preset.url)}
                      className={`group relative aspect-square rounded-lg overflow-hidden border transition-all ${
                        isSelected
                          ? "border-cyan-400 ring-2 ring-cyan-400/50 scale-105"
                          : "border-white/10 opacity-70 hover:opacity-100 hover:border-white/30"
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                        <span className="text-[9px] text-white font-medium truncate">
                          {preset.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Tạo Album
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
