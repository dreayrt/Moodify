"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  DoorOpen,
  LockKeyhole,
  Plus,
  RefreshCw,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import {
  createKaraokeRoom,
  fetchKaraokeRooms,
  type KaraokeRoomCreated,
  type KaraokeRoomSummary,
  type KaraokeRoomVisibility,
} from "@/lib/api-client";
import { useKaraokeRoomLive } from "../hooks/use-karaoke-room-live";
import styles from "./karaoke-room-page.module.css";

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Không thể tải danh sách phòng.";
}

export default function KaraokeRoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<KaraokeRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdRoom, setCreatedRoom] = useState<KaraokeRoomCreated | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [maxMembers, setMaxMembers] = useState(6);
  const [visibility, setVisibility] = useState<KaraokeRoomVisibility>("PUBLIC");

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setRooms(await fetchKaraokeRooms());
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadRooms(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadRooms]);

  const handleLiveEvent = useCallback(() => {
    void loadRooms();
  }, [loadRooms]);
  useKaraokeRoomLive({
    scope: "rooms",
    enabled: true,
    onEvent: handleLiveEvent,
  });

  const openRoom = (roomId: number) =>
    router.push(`/dashboard/karaoke/rooms/${roomId}`);

  const createRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = roomName.trim();
    if (!trimmedName || creating) return;
    setCreating(true);
    setCreateError("");
    try {
      const created = await createKaraokeRoom({
        name: trimmedName,
        maxMembers,
        visibility,
      });
      setIsCreateOpen(false);
      setRoomName("");
      if (created.visibility === "PRIVATE" && created.inviteCode) {
        setCreatedRoom(created);
      } else {
        openRoom(created.id);
      }
      void loadRooms();
    } catch (error) {
      setCreateError(errorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const copyInviteCode = async () => {
    if (!createdRoom?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(createdRoom.inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCreateError(
        "Trình duyệt không cho phép sao chép. Bạn có thể chọn và sao chép mã thủ công.",
      );
    }
  };

  const inviteLink =
    createdRoom && typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/karaoke/rooms/${createdRoom.id}`
      : "";

  return (
    <main className={styles.page}>
      <div className={styles.pageGlow} aria-hidden="true" />
      <Link href="/dashboard/karaoke" className={styles.backLink}>
        <ArrowLeft size={16} /> Quay lại chọn chế độ
      </Link>

      <section className={styles.intro} aria-labelledby="rooms-title">
        <div>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowLine} /> MOODIFY KARAOKE{" "}
            <span className={styles.eyebrowLine} />
          </div>
          <h1 id="rooms-title">
            Chọn phòng hát<span className={styles.titlePeriod}>.</span>
          </h1>
        </div>
        <button
          type="button"
          className={styles.createRoomButton}
          onClick={() => {
            setCreateError("");
            setIsCreateOpen(true);
          }}
        >
          <Plus size={18} /> Tạo phòng mới
        </button>
      </section>

      <section
        className={styles.roomsSection}
        aria-labelledby="rooms-list-title"
      >
        <div className={styles.roomsSectionHeader}>
          <div>
            <span className={styles.sectionKicker}>CỘNG ĐỒNG KARAOKE</span>
            <h2 id="rooms-list-title">Phòng đang mở</h2>
          </div>
          <span className={styles.countBadge}>{rooms.length} phòng</span>
        </div>

        {loadError ? (
          <div className={styles.roomsMessage} role="alert">
            <strong>Không tải được phòng</strong>
            <span>{loadError}</span>
            <button
              type="button"
              className={styles.roomRetryButton}
              onClick={() => void loadRooms()}
            >
              <RefreshCw size={14} /> Thử lại
            </button>
          </div>
        ) : loading && rooms.length === 0 ? (
          <div className={styles.roomsMessage} role="status">
            Đang tải phòng…
          </div>
        ) : rooms.length ? (
          <div className={styles.roomGrid}>
            {rooms.map((room) => (
              <article
                className={`${styles.roomCard} ${room.visibility === "PRIVATE" ? styles.privateRoomCard : ""}`}
                key={room.id}
              >
                <div className={styles.roomCardTop}>
                  <span
                    className={`${styles.roomCardIcon} ${room.visibility === "PRIVATE" ? styles.privateRoomIcon : ""}`}
                  >
                    {room.visibility === "PRIVATE" ? (
                      <LockKeyhole size={19} />
                    ) : (
                      <UsersRound size={20} />
                    )}
                  </span>
                  {room.visibility === "PRIVATE" ? (
                    <span className={styles.roomStatusPrivate}>
                      <LockKeyhole size={11} /> Cần mã mời
                    </span>
                  ) : (
                    <span className={styles.roomStatusWaiting}>
                      <i /> Đang mở
                    </span>
                  )}
                </div>
                <h3>{room.name}</h3>
                <p className={styles.roomHost}>
                  Chủ phòng: <strong>{room.hostName}</strong>
                </p>
                <div
                  className={`${styles.roomSong} ${room.visibility === "PRIVATE" ? styles.privateRoomAccess : ""}`}
                >
                  <span>
                    {room.visibility === "PRIVATE"
                      ? "QUYỀN TRUY CẬP"
                      : "SÂN KHẤU"}
                  </span>
                  <strong>
                    {room.visibility === "PRIVATE"
                      ? "Khóa bằng mã mời"
                      : "Chưa phát trực tuyến"}
                  </strong>
                </div>
                <div className={styles.roomMetaRow}>
                  <span>
                    <UsersRound size={14} /> {room.memberCount}/
                    {room.maxMembers} người
                  </span>
                  {room.visibility === "PRIVATE" ? (
                    <span>
                      <LockKeyhole size={13} /> Riêng tư
                    </span>
                  ) : (
                    <span>
                      <DoorOpen size={14} /> Công khai
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className={`${styles.roomJoinButton} ${room.visibility === "PRIVATE" ? styles.privateRoomJoinButton : ""}`}
                  onClick={() => openRoom(room.id)}
                  aria-label={
                    room.visibility === "PRIVATE"
                      ? `Nhập mã mời để vào ${room.name}`
                      : `Vào ${room.name}`
                  }
                >
                  {room.visibility === "PRIVATE" ? (
                    <>
                      <LockKeyhole size={14} /> Nhập mã mời
                    </>
                  ) : (
                    <>
                      Vào phòng <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.roomsEmpty}>
            <UsersRound size={27} />
            <strong>Chưa có phòng nào</strong>
            <span>Tạo phòng mới để bắt đầu.</span>
          </div>
        )}
      </section>

      {isCreateOpen && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creating)
              setIsCreateOpen(false);
          }}
        >
          <form
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-room-title"
            onSubmit={createRoom}
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.sectionKicker}>TẠO KHÔNG GIAN MỚI</span>
                <h2 id="create-room-title">Tạo phòng karaoke</h2>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setIsCreateOpen(false)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <label className={styles.fieldLabel} htmlFor="new-room-name">
              Tên phòng
            </label>
            <input
              id="new-room-name"
              className={styles.roomTextInput}
              maxLength={40}
              required
              autoFocus
              placeholder="Ví dụ: Tối thứ sáu vui vẻ"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
            />

            <label className={styles.fieldLabel} htmlFor="new-room-capacity">
              Số thành viên tham gia
            </label>
            <select
              id="new-room-capacity"
              className={styles.songSelect}
              value={maxMembers}
              onChange={(event) => setMaxMembers(Number(event.target.value))}
              aria-describedby="new-room-capacity-help"
            >
              {Array.from({ length: 6 }, (_, index) => index + 1).map(
                (count) => (
                  <option key={count} value={count}>
                    {count} người
                  </option>
                ),
              )}
            </select>

            <span className={styles.fieldLabel}>Quyền vào phòng</span>
            <div className={styles.roomVisibilityOptions}>
              {(["PUBLIC", "PRIVATE"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={
                    styles.visibilityChoice +
                    (visibility === item ? " " + styles.visibilitySelected : "")
                  }
                  aria-pressed={visibility === item}
                  onClick={() => setVisibility(item)}
                >
                  {item === "PUBLIC" ? (
                    <DoorOpen size={16} />
                  ) : (
                    <LockKeyhole size={16} />
                  )}
                  {item === "PUBLIC" ? "Công khai" : "Riêng tư"}
                  {visibility === item && <Check size={15} />}
                </button>
              ))}
            </div>

            {createError && (
              <p className={styles.formError} role="alert">
                {createError}
              </p>
            )}

            <button
              type="submit"
              className={`${styles.modalSubmit} ${styles.createRoomSubmit}`}
              disabled={!roomName.trim() || creating}
            >
              {creating ? "Đang tạo phòng…" : "Tạo phòng và vào phòng"}{" "}
              <ArrowRight size={17} />
            </button>
          </form>
        </div>
      )}

      {createdRoom && (
        <div className={styles.modalBackdrop}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-room-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.sectionKicker}>PHÒNG RIÊNG ĐÃ TẠO</span>
                <h2 id="invite-room-title">{createdRoom.name}</h2>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setCreatedRoom(null)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
            <p className={styles.inviteHelp}>
              Gửi đường dẫn và mã mời này cho bạn bè. Mã chỉ hiển thị trong lần
              tạo phòng này.
            </p>
            <label className={styles.fieldLabel}>Đường dẫn phòng</label>
            <div className={styles.inviteValue}>{inviteLink}</div>
            <label className={styles.fieldLabel}>Mã mời</label>
            <div className={styles.inviteCodeRow}>
              <code className={styles.inviteCode}>
                {createdRoom.inviteCode}
              </code>
              <button
                type="button"
                className={styles.roomRetryButton}
                onClick={() => void copyInviteCode()}
              >
                <Copy size={14} />
                {copied ? "Đã sao chép" : "Sao chép"}
              </button>
            </div>
            {createError && (
              <p className={styles.formError} role="alert">
                {createError}
              </p>
            )}
            <button
              type="button"
              className={styles.modalSubmit}
              onClick={() => openRoom(createdRoom.id)}
            >
              Vào phòng <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
