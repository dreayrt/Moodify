export type KaraokeRoom = {
  id: string;
  name: string;
  host: string;
  song: string;
  memberCount: number;
  maxMembers: number;
  status: "Đang hát" | "Sắp bắt đầu";
  visibility: "Công khai" | "Riêng tư";
};

export const KARAOKE_ROOM_STORAGE_KEY = "moodify-karaoke-demo-rooms";

export const DEFAULT_KARAOKE_ROOMS: KaraokeRoom[] = [
  { id: "room-chill", name: "Chill cùng nhau", host: "Lan Chi", song: "Nơi ánh đèn dừng lại", memberCount: 4, maxMembers: 8, status: "Đang hát", visibility: "Công khai" },
  { id: "room-acoustic", name: "Acoustic cuối tuần", host: "Gia Huy", song: "Giữa những vì sao", memberCount: 3, maxMembers: 6, status: "Sắp bắt đầu", visibility: "Công khai" },
  { id: "room-friends", name: "Góc nhỏ bạn bè", host: "Thảo Vy", song: "Chưa chọn bài", memberCount: 2, maxMembers: 5, status: "Sắp bắt đầu", visibility: "Công khai" },
];
