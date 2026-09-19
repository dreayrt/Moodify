"use client";

import { useState } from "react";
import { X, Music2, Sparkles, Image as ImageIcon, Loader2 } from "lucide-react";
import { createPlaylist, type Playlist } from "@/lib/api-client";

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (playlist: Playlist) => void;
}

const PRESET_COVERS = [
  {
    label: "Chill Lo-Fi",
    url: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop",
  },
  {
    label: "Neon Beats",
    url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop",
  },
  {
    label: "Acoustic Warmth",
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop",
  },
  {
    label: "Late Night City",
    url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop",
  },
  {
    label: "Sunset Indie",
    url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&auto=format&fit=crop",
  },
];

export default function CreatePlaylistModal({
  isOpen,
  onClose,
  onCreated,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState(PRESET_COVERS[0].url);
  const [customCover, setCustomCover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên danh sách phát");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newPlaylist = await createPlaylist({
        name: name.trim(),
        description: description.trim() || undefined,
        coverUrl: coverUrl.trim() || undefined,
      });

      // Reset form
      setName("");
      setDescription("");
      setCoverUrl(PRESET_COVERS[0].url);
      setCustomCover(false);

      onCreated(newPlaylist);
      onClose();
    } catch (err: any) {
      console.error("Create playlist error:", err);
      setError(err?.message || "Không thể tạo playlist, vui lòng thử lại");
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
          <div className="p-3 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400">
            <Music2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Tạo danh sách phát mới</h2>
            <p className="text-xs text-slate-400">
              Tạo không gian âm nhạc theo sở thích và tâm trạng của bạn
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
          {/* Playlist Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Tên playlist <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Giai Điệu Mùa Mưa, Gym Hype..."
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Mô tả (tuỳ chọn)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chia sẻ đôi nét về playlist này..."
              rows={2}
              disabled={loading}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all resize-none"
            />
          </div>

          {/* Cover Art Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                Ảnh bìa playlist
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
                {PRESET_COVERS.map((preset) => {
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
              disabled={loading || !name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Tạo Playlist
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
