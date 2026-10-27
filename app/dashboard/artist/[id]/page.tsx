"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  Play,
  Heart,
  Star,
  CheckCircle2,
  Share2,
  MessageSquare,
  Disc,
  Music2,
  ExternalLink,
  Send,
  CornerDownRight,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  fetchArtistPublicProfile,
  toggleFollowArtist,
  fetchArtistReviews,
  submitArtistReview,
  replyArtistReview,
  fetchLikedTrackIds,
  addToLibrary,
  removeFromLibrary,
  type ArtistPublicProfile,
  type ArtistReview,
  type Track,
} from "@/lib/api-client";
import { usePlayer } from "@/components/dashboard/player-context";
import AlbumCard from "@/components/dashboard/album-card";
import AlbumDetailModal from "@/components/dashboard/album-detail-modal";

export default function ArtistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const artistId = typeof params?.id === "string" ? params.id : "";

  const { playTrack } = usePlayer();

  const [profile, setProfile] = useState<ArtistPublicProfile | null>(null);
  const [reviews, setReviews] = useState<ArtistReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Follow state
  const [isFollowed, setIsFollowed] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowPending, startFollowTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Liked tracks
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set());

  // Review form
  const [myRating, setMyRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);

  // Artist reply input
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<"tracks" | "albums" | "reviews" | "about">("tracks");

  // Selected album for modal
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | number | null>(null);

  useEffect(() => {
    if (!artistId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchArtistPublicProfile(artistId),
      fetchArtistReviews(artistId, 0, 20),
      fetchLikedTrackIds().catch(() => []),
    ])
      .then(([prof, revs, liked]) => {
        if (!isMounted) return;
        setProfile(prof);
        setIsFollowed(prof.isFollowed);
        setFollowersCount(prof.followersCount);
        setReviews(revs.content || []);
        setLikedTrackIds(new Set(liked));
      })
      .catch((err: Error) => {
        if (!isMounted) return;
        setError(err.message || "Không thể tải thông tin nghệ sĩ.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [artistId]);

  const handleToggleFollow = () => {
    const targetId = profile?.artistId || artistId;
    if (!targetId) return;

    const prevFollowed = isFollowed;
    const prevCount = followersCount;
    const nextFollowed = !prevFollowed;
    const nextCount = nextFollowed ? prevCount + 1 : Math.max(0, prevCount - 1);

    // Optimistic UI update
    setIsFollowed(nextFollowed);
    setFollowersCount(nextCount);
    setToastMessage(
      nextFollowed
        ? `Đã thêm ${profile?.name || "nghệ sĩ"} vào Nghệ sĩ yêu thích trong Thư viện`
        : `Đã hủy theo dõi ${profile?.name || "nghệ sĩ"}`
    );
    setTimeout(() => setToastMessage(null), 3500);

    startFollowTransition(async () => {
      try {
        const res = await toggleFollowArtist(targetId);
        setIsFollowed(res.isFollowed);
        setFollowersCount(res.followersCount);
      } catch (err: unknown) {
        // Revert on error
        setIsFollowed(prevFollowed);
        setFollowersCount(prevCount);
        setToastMessage(err instanceof Error ? err.message : "Vui lòng đăng nhập để theo dõi nghệ sĩ");
        setTimeout(() => setToastMessage(null), 4000);
      }
    });
  };

  const handleToggleLikeTrack = async (spotifyId: string) => {
    if (!spotifyId) return;
    const isCurrentlyLiked = likedTrackIds.has(spotifyId);

    // Optimistic
    setLikedTrackIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyLiked) next.delete(spotifyId);
      else next.add(spotifyId);
      return next;
    });

    try {
      if (isCurrentlyLiked) {
        await removeFromLibrary(spotifyId);
      } else {
        await addToLibrary(spotifyId);
      }
    } catch {
      // Revert on error
      setLikedTrackIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyLiked) next.add(spotifyId);
        else next.delete(spotifyId);
        return next;
      });
    }
  };

  const handlePlayTopTracks = () => {
    if (!profile?.topTracks || profile.topTracks.length === 0) return;
    playTrack(profile.topTracks[0], profile.topTracks);
  };

  const handlePlaySingleTrack = (track: Track) => {
    playTrack(track, profile?.topTracks);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistId) return;
    setSubmittingReview(true);
    setReviewMsg(null);

    try {
      const newReview = await submitArtistReview(artistId, myRating, myComment);
      setReviews((prev) => {
        const filtered = prev.filter((r) => r.id !== newReview.id && r.userId !== newReview.userId);
        return [newReview, ...filtered];
      });
      setMyComment("");
      setReviewMsg("Cảm ơn bạn đã gửi đánh giá nghệ sĩ!");
      setTimeout(() => setReviewMsg(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Không thể gửi đánh giá.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReplyReview = async (reviewId: number) => {
    if (!artistId || !replyText.trim()) return;
    setSubmittingReply(true);

    try {
      const updated = await replyArtistReview(artistId, reviewId, replyText);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      setReplyingToId(null);
      setReplyText("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Không thể gửi phản hồi.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const formatFollowers = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toLocaleString("vi-VN");
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-400">Đang tải trang cá nhân nghệ sĩ...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 bg-slate-900/40 rounded-2xl border border-slate-800">
        <Music2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-slate-200 mb-1">Không tìm thấy nghệ sĩ</h2>
        <p className="text-sm text-slate-400 mb-4">{error || "Hồ sơ nghệ sĩ này không tồn tại hoặc đã bị ẩn."}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors cursor-pointer"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-100 pb-24 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 text-cyan-200 shadow-2xl shadow-cyan-950/60 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <Heart className="w-4 h-4 text-rose-400 fill-rose-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. HERO SECTION WITH BANNER & ARTIST BIO                     */}
      {/* ============================================================ */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800/60 shadow-2xl bg-slate-950 mb-8">
        {/* Banner image with overlay */}
        <div className="relative h-64 sm:h-80 md:h-96 w-full">
          <img
            src={profile.bannerUrl || profile.imageUrl || ""}
            alt={profile.name}
            className="w-full h-full object-cover object-center filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-black/30" />
        </div>

        {/* Artist Profile Header Details */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 flex flex-col md:flex-row md:items-end gap-6">
          {/* Avatar with Glow */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-slate-900 shadow-2xl ring-4 ring-cyan-500/30 bg-slate-900">
              <img
                src={profile.imageUrl || ""}
                alt={profile.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            {profile.verified && (
              <div
                className="absolute bottom-1 right-1 bg-cyan-500 text-slate-950 p-1.5 rounded-full shadow-lg border-2 border-slate-950"
                title="Nghệ sĩ đã xác minh"
              >
                <CheckCircle2 className="w-5 h-5 fill-slate-950 text-cyan-400" />
              </div>
            )}
          </div>

          {/* Artist Metadata & Name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Nghệ sĩ Moodify
              </span>
              {profile.genres && profile.genres.map((g) => (
                <span
                  key={g}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50"
                >
                  #{g}
                </span>
              ))}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-3 truncate">
              {profile.name}
            </h1>

            {/* Quick stats & Ratings */}
            <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-300 flex-wrap">
              <div className="flex items-center gap-1.5 font-medium text-white">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>{formatFollowers(followersCount)} người theo dõi</span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1 text-amber-400 font-semibold">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{profile.averageRating.toFixed(1)}</span>
                <span className="text-slate-400 text-xs font-normal">
                  ({profile.reviewsCount} đánh giá)
                </span>
              </div>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{profile.topTracks.length} bài hát nổi bật</span>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={handlePlayTopTracks}
              disabled={profile.topTracks.length === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
              <span>Phát nhạc</span>
            </button>

            <button
              onClick={handleToggleFollow}
              disabled={isFollowPending}
              className={`flex items-center gap-2 px-5 py-3 rounded-full font-semibold transition-all cursor-pointer border ${
                isFollowed
                  ? "bg-slate-800/90 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 text-slate-200 border-slate-700"
                  : "bg-white/10 hover:bg-white/20 text-white border-white/20 hover:scale-105"
              }`}
            >
              <Heart className={`w-4 h-4 ${isFollowed ? "fill-rose-500 text-rose-500" : ""}`} />
              <span>{isFollowed ? "Đang theo dõi" : "Theo dõi"}</span>
            </button>

            {/* Social media links */}
            <div className="flex items-center gap-1.5 ml-2">
              {profile.facebookUrl && (
                <a
                  href={profile.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-full bg-slate-900/80 hover:bg-blue-600/30 hover:text-blue-400 text-slate-400 border border-slate-800 transition-colors"
                  title="Facebook chính thức"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {profile.instagramUrl && (
                <a
                  href={profile.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-full bg-slate-900/80 hover:bg-pink-600/30 hover:text-pink-400 text-slate-400 border border-slate-800 transition-colors"
                  title="Instagram chính thức"
                >
                  <Sparkles className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. NAVIGATION TABS                                           */}
      {/* ============================================================ */}
      <div className="flex items-center border-b border-slate-800 mb-6 gap-2 sm:gap-4 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("tracks")}
          className={`pb-3 px-3 text-sm font-semibold transition-all relative ${
            activeTab === "tracks" ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Bài hát ({profile.topTracks.length})
          {activeTab === "tracks" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}
        </button>

        <button
          onClick={() => setActiveTab("albums")}
          className={`pb-3 px-3 text-sm font-semibold transition-all relative ${
            activeTab === "albums" ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Album ({profile.albums.length})
          {activeTab === "albums" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}
        </button>

        <button
          onClick={() => setActiveTab("reviews")}
          className={`pb-3 px-3 text-sm font-semibold transition-all relative flex items-center gap-1.5 ${
            activeTab === "reviews" ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Đánh giá ({reviews.length})</span>
          {activeTab === "reviews" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}
        </button>

        <button
          onClick={() => setActiveTab("about")}
          className={`pb-3 px-3 text-sm font-semibold transition-all relative ${
            activeTab === "about" ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Tiểu sử & Giới thiệu
          {activeTab === "about" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}
        </button>
      </div>

      {/* ============================================================ */}
      {/* 3. TAB 1: TOP TRACKS                                         */}
      {/* ============================================================ */}
      {activeTab === "tracks" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Music2 className="w-5 h-5 text-cyan-400" />
              <span>Bài hát nổi bật</span>
            </h2>
            <button
              onClick={handlePlayTopTracks}
              className="text-xs text-cyan-400 hover:underline font-medium cursor-pointer"
            >
              Phát tất cả
            </button>
          </div>

          {profile.topTracks.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
              Nghệ sĩ chưa có bài hát nào được đăng tải.
            </div>
          ) : (
            <div className="bg-slate-900/40 rounded-xl border border-slate-800/60 divide-y divide-slate-800/40">
              {profile.topTracks.map((track, idx) => {
                const isLiked = likedTrackIds.has(track.spotifyId);
                return (
                  <div
                    key={track.spotifyId || track.id}
                    className="group flex items-center justify-between p-3.5 hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Rank Index / Play button */}
                      <span className="w-6 text-center text-sm font-semibold text-slate-500 group-hover:hidden">
                        {idx + 1}
                      </span>
                      <button
                        onClick={() => handlePlaySingleTrack(track)}
                        className="hidden group-hover:flex w-6 h-6 items-center justify-center text-cyan-400 cursor-pointer"
                        title="Phát bài này"
                      >
                        <Play className="w-4 h-4 fill-cyan-400" />
                      </button>

                      {/* Track Image */}
                      <img
                        src={track.imageUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100"}
                        alt={track.name}
                        className="w-11 h-11 rounded-lg object-cover bg-slate-800 shrink-0"
                      />

                      {/* Track Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-cyan-400 transition-colors">
                          {track.name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {track.albumName || profile.name}
                        </p>
                      </div>
                    </div>

                    {/* Actions: Duration & Like */}
                    <div className="flex items-center gap-4 shrink-0 pl-3">
                      <span className="text-xs text-slate-500 font-mono">
                        {formatDuration(track.durationMs)}
                      </span>
                      <button
                        onClick={() => handleToggleLikeTrack(track.spotifyId)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title={isLiked ? "Bỏ yêu thích" : "Yêu thích"}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isLiked ? "fill-rose-500 text-rose-500" : "hover:scale-110"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Appears On section */}
          {profile.appearsOn && profile.appearsOn.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Disc className="w-5 h-5 text-purple-400" />
                <span>Góp mặt trong các tác phẩm khác</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {profile.appearsOn.map((track) => (
                  <div
                    key={track.spotifyId || track.id}
                    onClick={() => handlePlaySingleTrack(track)}
                    className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 flex items-center gap-3 cursor-pointer hover:bg-slate-900/60 transition-all"
                  >
                    <img
                      src={track.imageUrl || ""}
                      alt={track.name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{track.name}</p>
                      <p className="text-xs text-slate-400 truncate">Hợp tác: {track.artistName}</p>
                    </div>
                    <Play className="w-4 h-4 text-slate-400 hover:text-cyan-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. TAB 2: ALBUMS                                             */}
      {/* ============================================================ */}
      {activeTab === "albums" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Disc className="w-5 h-5 text-cyan-400" />
            <span>Album & Đĩa đơn phát hành</span>
          </h2>

          {profile.albums.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
              Nghệ sĩ chưa phát hành album công khai nào.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {profile.albums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  onClick={() => setSelectedAlbumId(album.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. TAB 3: FAN REVIEWS & RATINGS                              */}
      {/* ============================================================ */}
      {activeTab === "reviews" && (
        <div className="space-y-8 max-w-3xl">
          {/* Header Score Overview */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Đánh giá từ cộng đồng
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-5xl font-black text-white">{profile.averageRating.toFixed(1)}</span>
                <span className="text-slate-500 text-lg">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(profile.averageRating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-700"
                    }`}
                  />
                ))}
                <span className="text-xs text-slate-400 ml-2">
                  Dựa trên {profile.reviewsCount} nhận xét
                </span>
              </div>
            </div>

            {/* Call to action badge */}
            <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 text-sm text-slate-300">
              <p className="font-semibold text-white">Yêu thích phong cách của {profile.name}?</p>
              <p className="text-xs text-slate-400 mt-1">Hãy để lại đánh giá và nhận xét của bạn bên dưới!</p>
            </div>
          </div>

          {/* Form to Submit Review */}
          <form
            onSubmit={handleSubmitReview}
            className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              <span>Gửi đánh giá của bạn</span>
            </h3>

            {/* Interactive Stars */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 mr-2">Chọn số sao:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setMyRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 hover:scale-125 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= (hoverRating || myRating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-700 hover:text-slate-500"
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-amber-400 ml-2">
                {myRating === 5
                  ? "5 sao - Tuyệt tác!"
                  : myRating === 4
                  ? "4 sao - Rất hay!"
                  : myRating === 3
                  ? "3 sao - Khá ổn"
                  : myRating === 2
                  ? "2 sao - Cần cải thiện"
                  : "1 sao - Chưa ưng ý"}
              </span>
            </div>

            {/* Comment Textarea */}
            <div>
              <textarea
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
                rows={3}
                placeholder={`Chia sẻ cảm nhận của bạn về giọng hát, phong cách hoặc ca khúc của ${profile.name}...`}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>

            <div className="flex items-center justify-between">
              {reviewMsg && <p className="text-xs text-emerald-400 font-medium">{reviewMsg}</p>}
              <div className="ml-auto">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-md shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittingReview ? "Đang gửi..." : "Gửi đánh giá"}</span>
                </button>
              </div>
            </div>
          </form>

          {/* List of Reviews */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">
              Tất cả nhận xét ({reviews.length})
            </h3>

            {reviews.length === 0 ? (
              <div className="text-center py-10 text-slate-500 bg-slate-900/20 rounded-xl border border-slate-800/60">
                Chưa có nhận xét nào. Hãy là người đầu tiên đánh giá!
              </div>
            ) : (
              reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3"
                >
                  {/* User info & Rating */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 border border-slate-700">
                        {rev.userAvatar ? (
                          <img src={rev.userAvatar} alt={rev.userName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                            {rev.userName?.slice(0, 1)?.toUpperCase() || "U"}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{rev.userName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {new Date(rev.createdAt).toLocaleDateString("vi-VN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-800"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  {rev.comment && (
                    <p className="text-sm text-slate-300 leading-relaxed pl-12">
                      {rev.comment}
                    </p>
                  )}

                  {/* Artist Reply */}
                  {rev.artistReply && (
                    <div className="ml-12 mt-3 p-3.5 rounded-xl bg-cyan-950/25 border border-cyan-500/25 flex items-start gap-3">
                      <CornerDownRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-cyan-300">
                            Phản hồi từ {profile.name}
                          </span>
                          <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded text-[10px] font-semibold border border-cyan-500/30">
                            Tác giả
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{rev.artistReply}</p>
                      </div>
                    </div>
                  )}

                  {/* Reply button for Content Lead / Artist */}
                  {!rev.artistReply && replyingToId !== rev.id && (
                    <div className="pl-12 pt-1">
                      <button
                        onClick={() => {
                          setReplyingToId(rev.id);
                          setReplyText("");
                        }}
                        className="text-xs text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <CornerDownRight className="w-3 h-3" />
                        <span>Trả lời nhận xét này</span>
                      </button>
                    </div>
                  )}

                  {/* Inline Reply input form */}
                  {replyingToId === rev.id && (
                    <div className="ml-12 mt-2 space-y-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Trả lời nhận xét của ${rev.userName}...`}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setReplyingToId(null)}
                          className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => handleReplyReview(rev.id)}
                          disabled={submittingReply || !replyText.trim()}
                          className="px-3 py-1 bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-cyan-400 disabled:opacity-50"
                        >
                          {submittingReply ? "Đang gửi..." : "Gửi phản hồi"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. TAB 4: ABOUT & BIO                                        */}
      {/* ============================================================ */}
      {activeTab === "about" && (
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6 max-w-3xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span>Tiểu sử nghệ sĩ</span>
          </h2>

          <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">
            {profile.bio}
          </p>

          <div className="pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-xs text-slate-500 block mb-1">Xác minh danh tính</span>
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Nghệ sĩ chính thức Moodify Verified</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-xs text-slate-500 block mb-1">Cộng đồng thính giả</span>
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>{followersCount.toLocaleString("vi-VN")} người theo dõi</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Album Detail Modal */}
      <AlbumDetailModal
        isOpen={Boolean(selectedAlbumId)}
        albumId={selectedAlbumId}
        onClose={() => setSelectedAlbumId(null)}
      />
    </div>
  );
}
