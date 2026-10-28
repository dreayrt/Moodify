"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, DoorOpen, LockKeyhole, Plus, Sparkles, UsersRound, X } from "lucide-react";
import { DEFAULT_KARAOKE_ROOMS, KARAOKE_ROOM_STORAGE_KEY, type KaraokeRoom } from "../data/rooms";
import styles from "./karaoke-room-page.module.css";

export default function KaraokeRoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<KaraokeRoom[]>(DEFAULT_KARAOKE_ROOMS);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [maxMembers, setMaxMembers] = useState("8");
  const [visibility, setVisibility] = useState<KaraokeRoom["visibility"]>("Công khai");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(KARAOKE_ROOM_STORAGE_KEY);
        if (!saved) return;
        const savedRooms = JSON.parse(saved) as KaraokeRoom[];
        if (Array.isArray(savedRooms)) setRooms([...savedRooms, ...DEFAULT_KARAOKE_ROOMS]);
      } catch {
        // The sample rooms remain available when browser storage cannot be read.
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isCreateOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsCreateOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCreateOpen]);

  const openRoom = (room: KaraokeRoom) => router.push("/dashboard/karaoke/rooms/" + room.id + "?name=" + encodeURIComponent(room.name));

  const createRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = roomName.trim();
    if (!trimmedName) return;

    const room: KaraokeRoom = {
      id: "room-" + Date.now().toString(36),
      name: trimmedName,
      host: "Bạn",
      song: "Chưa chọn bài",
      memberCount: 1,
      maxMembers: Number(maxMembers),
      status: "Sắp bắt đầu",
      visibility,
    };
    const savedRooms = rooms.filter((item) => !DEFAULT_KARAOKE_ROOMS.some((defaultRoom) => defaultRoom.id === item.id));
    const nextRooms = [room, ...savedRooms];
    try {
      window.localStorage.setItem(KARAOKE_ROOM_STORAGE_KEY, JSON.stringify(nextRooms));
    } catch {
      // Keep the prototype usable for this visit when browser storage is unavailable.
    }
    setRooms([room, ...rooms]);
    setIsCreateOpen(false);
    openRoom(room);
  };

  return (
    <main className={styles.page}>
      <div className={styles.pageGlow} aria-hidden="true" />
      <Link href="/dashboard/karaoke" className={styles.backLink}><ArrowLeft size={16} /> Quay lại chọn chế độ</Link>

      <section className={styles.intro} aria-labelledby="rooms-title">
        <div>
          <div className={styles.eyebrow}><span className={styles.eyebrowLine} /> MOODIFY KARAOKE <span className={styles.eyebrowLine} /></div>
          <h1 id="rooms-title">Chọn phòng hát<span className={styles.titlePeriod}>.</span></h1>
          <p>Vào một phòng đang mở hoặc tạo không gian riêng cho bạn bè.</p>
        </div>
        <button type="button" className={styles.createRoomButton} onClick={() => setIsCreateOpen(true)}><Plus size={18} /> Tạo phòng mới</button>
      </section>

      <div className={styles.previewBanner} role="note">
        <Sparkles size={18} aria-hidden="true" />
        <span><strong>Phòng mẫu để xem giao diện.</strong> Phòng bạn tạo được lưu tạm trong trình duyệt; kết nối nhiều người sẽ được triển khai sau.</span>
      </div>

      <section className={styles.roomsSection} aria-labelledby="rooms-list-title">
        <div className={styles.roomsSectionHeader}>
          <div><span className={styles.sectionKicker}>CỘNG ĐỒNG KARAOKE</span><h2 id="rooms-list-title">Phòng đang mở</h2></div>
          <span className={styles.countBadge}>{rooms.length} phòng</span>
        </div>

        {rooms.length ? (
          <div className={styles.roomGrid}>
            {rooms.map((room) => (
              <article className={styles.roomCard} key={room.id}>
                <div className={styles.roomCardTop}>
                  <span className={styles.roomCardIcon}><UsersRound size={20} /></span>
                  <span className={room.status === "Đang hát" ? styles.roomStatusLive : styles.roomStatusWaiting}><i />{room.status}</span>
                </div>
                <h3>{room.name}</h3>
                <p className={styles.roomHost}>Chủ phòng: <strong>{room.host}</strong></p>
                <div className={styles.roomSong}><span>ĐANG PHÁT</span><strong>{room.song}</strong></div>
                <div className={styles.roomMetaRow}>
                  <span><UsersRound size={14} /> {room.memberCount}/{room.maxMembers} người</span>
                  <span>{room.visibility === "Riêng tư" ? <LockKeyhole size={13} /> : <DoorOpen size={14} />}{room.visibility}</span>
                </div>
                <button type="button" className={styles.roomJoinButton} onClick={() => openRoom(room)}>Vào phòng <ArrowRight size={16} /></button>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.roomsEmpty}><UsersRound size={27} /><strong>Chưa có phòng nào</strong><span>Tạo phòng mới để bắt đầu.</span></div>
        )}
      </section>

      {isCreateOpen && (
        <div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCreateOpen(false); }}>
          <form className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="create-room-title" onSubmit={createRoom}>
            <div className={styles.modalHeader}>
              <div><span className={styles.sectionKicker}>TẠO KHÔNG GIAN MỚI</span><h2 id="create-room-title">Tạo phòng karaoke</h2></div>
              <button type="button" className={styles.modalClose} onClick={() => setIsCreateOpen(false)} aria-label="Đóng"><X size={20} /></button>
            </div>

            <label className={styles.fieldLabel} htmlFor="new-room-name">Tên phòng</label>
            <input id="new-room-name" className={styles.roomTextInput} maxLength={40} required autoFocus placeholder="Ví dụ: Tối thứ sáu vui vẻ" value={roomName} onChange={(event) => setRoomName(event.target.value)} />

            <label className={styles.fieldLabel} htmlFor="new-room-capacity">Số người tối đa</label>
            <select id="new-room-capacity" className={styles.songSelect} value={maxMembers} onChange={(event) => setMaxMembers(event.target.value)}>
              <option value="4">4 người</option>
              <option value="6">6 người</option>
              <option value="8">8 người</option>
              <option value="12">12 người</option>
            </select>

            <span className={styles.fieldLabel}>Quyền vào phòng</span>
            <div className={styles.roomVisibilityOptions}>
              {(["Công khai", "Riêng tư"] as const).map((item) => (
                <button key={item} type="button" className={styles.visibilityChoice + (visibility === item ? " " + styles.visibilitySelected : "")} aria-pressed={visibility === item} onClick={() => setVisibility(item)}>
                  {item === "Công khai" ? <DoorOpen size={16} /> : <LockKeyhole size={16} />}{item}{visibility === item && <Check size={15} />}
                </button>
              ))}
            </div>

            <div className={styles.modalNotice}><Sparkles size={16} />Phòng được lưu ở trình duyệt này để bạn xem trước luồng sử dụng.</div>
            <button type="submit" className={styles.modalSubmit} disabled={!roomName.trim()}>Tạo phòng và vào phòng <ArrowRight size={17} /></button>
          </form>
        </div>
      )}
    </main>
  );
}
