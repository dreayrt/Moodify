"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AudioLines, Headphones, Mic2, Music2, Sparkles } from "lucide-react";
import { usePlayer } from "@/components/dashboard/player-context";
import styles from "./karaoke-room-page.module.css";

const SOLO_SONGS = [
  { id: "summer", title: "Chạm vào mùa hạ", artist: "An Nhiên", duration: "03:48" },
  { id: "lights", title: "Nơi ánh đèn dừng lại", artist: "Lâm Kha", duration: "04:12" },
  { id: "stars", title: "Giữa những vì sao", artist: "Mộc & Minh", duration: "04:01" },
];

export default function KaraokeSoloPage() {
  const { pause } = usePlayer();
  const [songId, setSongId] = useState(SOLO_SONGS[0].id);
  const song = SOLO_SONGS.find((item) => item.id === songId) ?? SOLO_SONGS[0];

  useEffect(() => pause(), [pause]);

  return (
    <main className={styles.page}>
      <div className={styles.pageGlow} aria-hidden="true" />
      <Link href="/dashboard/karaoke" className={styles.backLink}><ArrowLeft size={16} /> Quay lại chọn chế độ</Link>

      <section className={styles.intro} aria-labelledby="solo-title">
        <div>
          <div className={styles.eyebrow}><span className={styles.eyebrowLine} /> MOODIFY KARAOKE <span className={styles.eyebrowLine} /></div>
          <h1 id="solo-title">Sân khấu của riêng bạn<span className={styles.titlePeriod}>.</span></h1>
          <p>Chọn một bài hát và tận hưởng khoảnh khắc của riêng mình.</p>
        </div>
        <div className={styles.roomChip}>
          <span className={styles.roomChipIcon}><Mic2 size={18} /></span>
          <span><strong>Hát một mình</strong><small>Giao diện xem trước</small></span>
        </div>
      </section>

      <div className={styles.previewBanner} role="note">
        <Sparkles size={18} aria-hidden="true" />
        <span><strong>Bản xem trước giao diện.</strong> Tên bài và lời hát bên dưới là dữ liệu minh họa. Phát nhạc và micro sẽ được kết nối sau.</span>
      </div>

      <section className={styles.soloStage} aria-labelledby="solo-stage-heading">
        <div className={styles.stageAura} aria-hidden="true" />
        <div className={styles.stageTopline}>
          <span className={styles.stageTag}><AudioLines size={13} /> SÂN KHẤU CỦA BẠN</span>
          <span className={styles.stageRoom}>HÁT MỘT MÌNH</span>
        </div>

        <div className={styles.stagePerformer}>
          <div className={styles.performerAvatar}><span>BẠN</span><span className={styles.avatarMic}><Mic2 size={13} /></span></div>
          <div className={styles.performerCaption}>Vị trí của bạn</div>
          <h2 id="solo-stage-heading">Sẵn sàng cất giọng?</h2>
          <div className={styles.performerType}><span /> HÁT MỘT MÌNH</div>
        </div>

        <div className={styles.stageSong}>
          <Music2 size={16} aria-hidden="true" />
          <span><strong>{song.title}</strong><small>{song.artist}</small></span>
        </div>

        <div className={styles.lyrics} aria-label="Lời bài hát minh họa">
          <p className={styles.lyricFaded}>Có một giai điệu len qua ô cửa</p>
          <p className={styles.lyricActive}>Mình cùng hát giữa chiều rất xanh</p>
          <p className={styles.lyricFaded}>Để những điều chưa nói hóa thành âm thanh</p>
        </div>

        <div className={styles.stageProgress} aria-label="Thanh tiến trình minh họa">
          <span>00:00</span><div className={styles.progressTrack}><span /></div><span>{song.duration}</span>
        </div>
      </section>

      <section className={styles.deviceCard + " " + styles.soloControls} aria-labelledby="device-heading">
        <div className={styles.deviceArtwork}><Headphones size={26} /><span className={styles.deviceWave} aria-hidden="true"><i /><i /><i /><i /></span></div>
        <div className={styles.deviceCopy}>
          <span className={styles.sectionKicker}>BÀI HÁT CỦA BẠN</span>
          <h2 id="device-heading">Chọn bài để hát theo</h2>
          <p>Dùng tai nghe để lời bài hát rõ hơn. Danh sách mẫu sẽ được thay bằng kho nhạc khi kết nối dữ liệu.</p>
        </div>
        <label className={styles.soloSongPicker}>
          <span>Bài hát</span>
          <select className={styles.songSelect} value={songId} onChange={(event) => setSongId(event.target.value)}>
            {SOLO_SONGS.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.artist}</option>)}
          </select>
        </label>
        <button type="button" className={styles.disabledButton} disabled title="Chức năng kiểm tra micro sẽ có khi kết nối phòng">
          <Mic2 size={16} /> Kiểm tra micro
        </button>
      </section>
    </main>
  );
}
