import Link from "next/link";
import { ArrowRight, Headphones, Mic2, Sparkles, UsersRound } from "lucide-react";
import styles from "./karaoke-room-page.module.css";

export default function KaraokeHomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.pageGlow} aria-hidden="true" />
      <section className={styles.intro} aria-labelledby="karaoke-title">
        <div>
          <div className={styles.eyebrow}><span className={styles.eyebrowLine} /> MOODIFY KARAOKE <span className={styles.eyebrowLine} /></div>
          <h1 id="karaoke-title">Bạn muốn hát thế nào?<span className={styles.titlePeriod}>.</span></h1>
          <p>Chọn không gian phù hợp rồi bắt đầu cất giọng.</p>
        </div>
      </section>

      <div className={styles.previewBanner} role="note">
        <Sparkles size={18} aria-hidden="true" />
        <span><strong>Giao diện xem trước.</strong> Phát nhạc, micro và kết nối phòng trực tuyến sẽ được triển khai sau.</span>
      </div>

      <section className={styles.choiceGrid} aria-label="Chọn chế độ hát">
        <Link href="/dashboard/karaoke/solo" className={styles.choiceCard + " " + styles.choiceSolo}>
          <span className={styles.choiceIcon}><Mic2 size={27} /></span>
          <span className={styles.choiceBadge}>KHÔNG GIAN RIÊNG</span>
          <h2>Hát một mình</h2>
          <p>Chọn bài và hát theo lời trên sân khấu cá nhân của bạn.</p>
          <span className={styles.choiceAction}>Vào hát một mình <ArrowRight size={17} /></span>
          <Headphones className={styles.choiceDecoration} size={102} aria-hidden="true" />
        </Link>

        <Link href="/dashboard/karaoke/rooms" className={styles.choiceCard + " " + styles.choiceTogether}>
          <span className={styles.choiceIcon}><UsersRound size={27} /></span>
          <span className={styles.choiceBadge}>CÙNG BẠN BÈ</span>
          <h2>Hát cùng nhau</h2>
          <p>Vào một phòng đang mở hoặc tạo phòng riêng để hát theo lượt và song ca.</p>
          <span className={styles.choiceAction}>Chọn phòng hát <ArrowRight size={17} /></span>
          <UsersRound className={styles.choiceDecoration} size={112} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
