"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AudioLines,
  Check,
  ChevronRight,
  Clock3,
  Headphones,
  Mic2,
  Music2,
  Plus,
  Sparkles,
  UsersRound,
  Volume2,
  X,
} from "lucide-react";
import { usePlayer } from "@/components/dashboard/player-context";
import { DEFAULT_KARAOKE_ROOMS } from "../data/rooms";
import styles from "./karaoke-room-page.module.css";

type Mode = "solo" | "duet";

type DemoSong = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  cover: string;
  initials: string;
};

type QueueItem = {
  id: string;
  songId: string;
  singers: string[];
  mode: Mode;
  isMine?: boolean;
};

const SONGS: DemoSong[] = [
  { id: "song-1", title: "Chạm vào mùa hạ", artist: "An Nhiên", duration: "03:48", cover: "linear-gradient(140deg, #9b4c79, #452b61 58%, #1c2546)", initials: "MH" },
  { id: "song-2", title: "Nơi ánh đèn dừng lại", artist: "Lâm Kha", duration: "04:12", cover: "linear-gradient(140deg, #6e4166, #353761 57%, #192f44)", initials: "AD" },
  { id: "song-3", title: "Một ngày thật khác", artist: "Hạ Vy", duration: "03:26", cover: "linear-gradient(140deg, #516e76, #35455f 55%, #25284d)", initials: "NK" },
  { id: "song-4", title: "Giữa những vì sao", artist: "Mộc & Minh", duration: "04:01", cover: "linear-gradient(140deg, #77537f, #4b3b74 56%, #242c56)", initials: "VS" },
  { id: "song-5", title: "Cứ hát lên", artist: "Kai Trần", duration: "03:35", cover: "linear-gradient(140deg, #a75c70, #75406b 54%, #30335e)", initials: "HL" },
  { id: "song-6", title: "Sau cơn mưa", artist: "Tú Anh", duration: "03:54", cover: "linear-gradient(140deg, #527984, #3c596f 54%, #29365c)", initials: "CM" },
];

const INITIAL_QUEUE: QueueItem[] = [
  { id: "demo-1", songId: "song-2", singers: ["Lan Chi"], mode: "solo" },
  { id: "demo-2", songId: "song-4", singers: ["Gia Huy", "Thảo Vy"], mode: "duet" },
];

const MEMBERS = [
  { id: "lan", name: "Lan Chi", initials: "LC", color: "#c180b2" },
  { id: "huy", name: "Gia Huy", initials: "GH", color: "#7f9bd1" },
  { id: "vy", name: "Thảo Vy", initials: "TV", color: "#a794d7" },
  { id: "khanh", name: "Khánh Linh", initials: "KL", color: "#d1978e" },
];

function getSong(songId: string): DemoSong {
  return SONGS.find((song) => song.id === songId) ?? SONGS[0];
}

function Cover({ song, small = false }: { song: DemoSong; small?: boolean }) {
  return (
    <div className={`${styles.cover} ${small ? styles.coverSmall : ""}`} style={{ background: song.cover }} aria-hidden="true">
      <span className={styles.coverDisc} />
      <span className={styles.coverInitials}>{song.initials}</span>
    </div>
  );
}

export default function KaraokeRoomPage({ roomId, roomName }: { roomId: string; roomName?: string }) {
  const { pause } = usePlayer();
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(SONGS[0].id);
  const [mode, setMode] = useState<Mode>("solo");
  const [partnerId, setPartnerId] = useState("");
  const [showAllLyrics, setShowAllLyrics] = useState(false);
  const [notice, setNotice] = useState("");
  const resolvedRoomName = roomName ?? DEFAULT_KARAOKE_ROOMS.find((item) => item.id === roomId)?.name ?? "Phòng karaoke";

  // The regular music player must not keep playing behind the karaoke preview.
  useEffect(() => pause(), [pause]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!isRequestOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsRequestOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRequestOpen]);

  const selectedSong = getSong(selectedSongId);
  const myQueueItem = queue.find((item) => item.isMine);
  const partner = MEMBERS.find((member) => member.id === partnerId);

  const openRequest = (songId = SONGS[0].id) => {
    setSelectedSongId(songId);
    setMode("solo");
    setPartnerId("");
    setIsRequestOpen(true);
  };

  const addRequest = () => {
    if (myQueueItem || (mode === "duet" && !partner)) return;
    const singers = mode === "duet" && partner ? ["Bạn", partner.name] : ["Bạn"];
    setQueue((items) => [...items, { id: `preview-${Date.now()}`, songId: selectedSongId, singers, mode, isMine: true }]);
    setIsRequestOpen(false);
    setNotice("Đã thêm lượt hát vào hàng đợi xem trước. Dữ liệu chưa được gửi lên phòng thật.");
  };

  const removeRequest = () => {
    setQueue((items) => items.filter((item) => !item.isMine));
    setNotice("Đã xóa lượt hát của bạn khỏi hàng đợi xem trước.");
  };

  return (
    <main className={styles.page}>
      <div className={styles.pageGlow} aria-hidden="true" />
      <Link href="/dashboard/karaoke/rooms" className={styles.backLink}><ArrowLeft size={16} /> Quay lại danh sách phòng</Link>

      <section className={styles.intro} aria-labelledby="karaoke-title">
        <div>
          <div className={styles.eyebrow}><span className={styles.eyebrowLine} /> MOODIFY KARAOKE <span className={styles.eyebrowLine} /></div>
          <h1 id="karaoke-title">{resolvedRoomName}<span className={styles.titlePeriod}>.</span></h1>
          <p>Một sân khấu chung để thay phiên nhau hát và song ca.</p>
        </div>
        <div className={styles.roomChip}>
          <span className={styles.roomChipIcon}><UsersRound size={18} /></span>
          <span><strong>Phòng hát cùng nhau</strong><small>Giao diện xem trước</small></span>
        </div>
      </section>

      <div className={styles.previewBanner} role="note">
        <Sparkles size={18} aria-hidden="true" />
        <span><strong>Bản xem trước giao diện.</strong> Bài hát, người tham gia và hàng đợi bên dưới là dữ liệu mẫu. Chưa có phát nhạc, micro hay kết nối phòng trực tuyến.</span>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.leftColumn}>
          <section className={styles.stage} aria-labelledby="stage-heading">
            <div className={styles.stageAura} aria-hidden="true" />
            <div className={styles.stageTopline}>
              <span className={styles.stageTag}><AudioLines size={13} /> SÂN KHẤU MẪU</span>
              <span className={styles.stageRoom}>PHÒNG 01 <span aria-hidden="true">/</span> HÁT THEO LƯỢT</span>
            </div>

            <div className={styles.stagePerformer}>
              <div className={styles.performerAvatar}><span>MA</span><span className={styles.avatarMic}><Mic2 size={13} /></span></div>
              <div className={styles.performerCaption}>Vị trí người đang hát</div>
              <h2 id="stage-heading">Minh Anh</h2>
              <div className={styles.performerType}><span /> HÁT ĐƠN</div>
            </div>

            <div className={styles.stageSong}>
              <Music2 size={16} aria-hidden="true" />
              <span><strong>{SONGS[0].title}</strong><small>{SONGS[0].artist}</small></span>
            </div>

            <div className={styles.lyrics} aria-label="Lời bài hát minh họa">
              {showAllLyrics && <p className={styles.lyricFaded}>Đường phố dịu đi khi nắng vừa tắt</p>}
              <p className={styles.lyricFaded}>Có một giai điệu len qua ô cửa</p>
              <p className={styles.lyricActive}>Mình cùng hát giữa chiều rất xanh</p>
              <p className={styles.lyricFaded}>Để những điều chưa nói hóa thành âm thanh</p>
              {showAllLyrics && <p className={styles.lyricFaded}>Và ngày mai sẽ sáng lên từ đây</p>}
              <button type="button" className={styles.lyricToggle} onClick={() => setShowAllLyrics((value) => !value)}>
                {showAllLyrics ? "Thu gọn lời mẫu" : "Xem thêm lời mẫu"} <ChevronRight size={14} className={showAllLyrics ? styles.rotateIcon : ""} />
              </button>
            </div>

            <div className={styles.stageProgress} aria-label="Thanh tiến trình minh họa">
              <span>01:18</span><div className={styles.progressTrack}><span /></div><span>03:48</span>
            </div>
          </section>

          <section className={styles.deviceCard} aria-labelledby="device-heading">
            <div className={styles.deviceArtwork}><Headphones size={26} /><span className={styles.deviceWave} aria-hidden="true"><i /><i /><i /><i /></span></div>
            <div className={styles.deviceCopy}>
              <span className={styles.sectionKicker}>TRƯỚC KHI LÊN SÂN KHẤU</span>
              <h2 id="device-heading">Sẵn sàng để cất giọng?</h2>
              <p>Kiểm tra micro và dùng tai nghe để có trải nghiệm hát tốt hơn. Thiết lập thiết bị sẽ xuất hiện khi phòng trực tuyến được kết nối.</p>
            </div>
            <button type="button" className={styles.disabledButton} disabled title="Chức năng kiểm tra micro sẽ có khi kết nối phòng">
              <Mic2 size={16} /> Kiểm tra micro
            </button>
          </section>
        </div>

        <aside className={styles.rightColumn} aria-label="Thông tin phòng karaoke">
          <section className={styles.queueCard} aria-labelledby="queue-heading">
            <div className={styles.cardHeader}>
              <div><span className={styles.sectionKicker}>TIẾP THEO TRÊN SÂN KHẤU</span><h2 id="queue-heading">Hàng đợi</h2></div>
              <span className={styles.countBadge}>{queue.length} lượt</span>
            </div>
            <div className={styles.queueList}>
              {queue.map((item, index) => {
                const song = getSong(item.songId);
                return (
                  <div key={item.id} className={`${styles.queueItem} ${item.isMine ? styles.myQueueItem : ""}`}>
                    <span className={styles.queueNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <Cover song={song} small />
                    <div className={styles.queueInfo}>
                      <strong>{song.title}</strong>
                      <span>{item.singers.join(" & ")} <span aria-hidden="true">·</span> {item.mode === "duet" ? "Song ca" : "Hát đơn"}</span>
                    </div>
                    {item.isMine && <span className={styles.mineBadge}>Bạn</span>}
                  </div>
                );
              })}
            </div>
            {myQueueItem ? (
              <button type="button" className={styles.removeButton} onClick={removeRequest}>Xóa lượt hát của tôi <X size={15} /></button>
            ) : (
              <button type="button" className={styles.primaryButton} onClick={() => openRequest()}><Plus size={18} /> Đăng ký lượt hát <ChevronRight size={16} /></button>
            )}
            <p className={styles.queueNote}><Clock3 size={14} /> Lượt đăng ký tại đây chỉ được lưu tạm trên trang xem trước.</p>
          </section>

          <section className={styles.membersCard} aria-labelledby="members-heading">
            <div className={styles.cardHeader}>
              <div><span className={styles.sectionKicker}>CÙNG CHUNG GIAI ĐIỆU</span><h2 id="members-heading">Trong phòng</h2></div>
              <span className={styles.memberCount}>4 người mẫu</span>
            </div>
            <div className={styles.memberList}>
              {MEMBERS.map((member) => (
                <div key={member.id} className={styles.member}>
                  <span className={styles.memberAvatar} style={{ backgroundColor: member.color }}>{member.initials}</span>
                  <span>{member.name}</span>
                  <span className={styles.memberDot} aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {notice && <div className={styles.toast} role="status"><Check size={17} />{notice}<button type="button" onClick={() => setNotice("")} aria-label="Đóng thông báo"><X size={15} /></button></div>}

      {isRequestOpen && (
        <div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setIsRequestOpen(false); }}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="request-title">
            <div className={styles.modalHeader}><div><span className={styles.sectionKicker}>ĐĂNG KÝ LƯỢT HÁT MẪU</span><h2 id="request-title">Bài hát của bạn</h2></div><button type="button" className={styles.modalClose} onClick={() => setIsRequestOpen(false)} aria-label="Đóng"><X size={20} /></button></div>
            <div className={styles.modalSong}><Cover song={selectedSong} small /><div><strong>{selectedSong.title}</strong><span>{selectedSong.artist} · {selectedSong.duration}</span></div></div>
            <label className={styles.fieldLabel} htmlFor="karaoke-song-select">Đổi bài hát</label>
            <select id="karaoke-song-select" className={styles.songSelect} value={selectedSongId} onChange={(event) => setSelectedSongId(event.target.value)}>{SONGS.map((song) => <option value={song.id} key={song.id}>{song.title} — {song.artist}</option>)}</select>
            <div className={styles.fieldLabel}>Kiểu trình diễn</div>
            <div className={styles.modeGrid}>
              <button type="button" className={`${styles.modeButton} ${mode === "solo" ? styles.modeSelected : ""}`} aria-pressed={mode === "solo"} onClick={() => setMode("solo")}><Mic2 size={20} /><strong>Hát đơn</strong><small>Một mình trên sân khấu</small></button>
              <button type="button" className={`${styles.modeButton} ${mode === "duet" ? styles.modeSelected : ""}`} aria-pressed={mode === "duet"} onClick={() => setMode("duet")}><UsersRound size={20} /><strong>Song ca</strong><small>Cùng một người khác</small></button>
            </div>
            {mode === "duet" && <div className={styles.partnerField}><div className={styles.fieldLabel}>Chọn bạn hát cùng (dữ liệu mẫu)</div><div className={styles.partnerGrid}>{MEMBERS.map((member) => <button key={member.id} type="button" className={`${styles.partnerButton} ${partnerId === member.id ? styles.partnerSelected : ""}`} aria-pressed={partnerId === member.id} onClick={() => setPartnerId(member.id)}><span className={styles.memberAvatar} style={{ backgroundColor: member.color }}>{member.initials}</span>{member.name}{partnerId === member.id && <Check size={15} />}</button>)}</div></div>}
            <div className={styles.modalNotice}><Volume2 size={16} />Đây là thao tác mô phỏng. Chưa gửi yêu cầu đến phòng karaoke thật.</div>
            <button type="button" className={styles.modalSubmit} onClick={addRequest} disabled={Boolean(myQueueItem) || (mode === "duet" && !partner)}>{myQueueItem ? "Bạn đã có một lượt chờ" : mode === "duet" && !partner ? "Chọn người song ca" : "Thêm vào hàng đợi mẫu"}<ChevronRight size={17} /></button>
          </div>
        </div>
      )}
    </main>
  );
}
