"use client";

import { useState, useEffect } from "react";

export type MascotCategory = "all" | "vip" | "animals" | "people" | "objects";

export interface MascotItem {
  id: string;
  name: string;
  category: "animals" | "people" | "objects";
  icon: string;
  tagline: string;
  isVip?: boolean;
}

export const MASCOTS: MascotItem[] = [
  // ── Động vật (21) ──────────────────────────────────
  { id: "koala",    name: "Gấu Koala",       category: "animals", icon: "🐨", tagline: "Dễ thương & thích chill" },
  { id: "tiger",    name: "Hổ Hoàng Gia",    category: "animals", icon: "🐯", tagline: "Mắt biếc long lanh, chúa tể vương giả", isVip: true },
  { id: "fox",      name: "Cáo Cam Tuyệt Sắc", category: "animals", icon: "🦊", tagline: "Nhanh nhẹn, sành điệu & quý phái", isVip: true },
  { id: "redpanda", name: "Gấu Trúc Đỏ",     category: "animals", icon: "🦊", tagline: "Đuôi xù mềm mại hoàng cung", isVip: true },
  { id: "dino",     name: "Khủng Long Tí Hon", category: "animals", icon: "🦖", tagline: "Bé bự ngộ nghĩnh siêu đáng yêu", isVip: true },
  { id: "cat",      name: "Mèo Mun Quý Tộc", category: "animals", icon: "🐱", tagline: "Mắt to tròn, đáng yêu quý phái", isVip: true },
  { id: "panda",    name: "Gấu Trúc Quốc Bảo", category: "animals", icon: "🐼", tagline: "Trầm ấm, bảo vật hiền lành", isVip: true },
  { id: "owl",      name: "Cú Mèo Dạ Nguyệt", category: "animals", icon: "🦉", tagline: "Cú đêm mê nhạc acoustic", isVip: true },
  { id: "otter",    name: "Rái Cá Thủy Tinh", category: "animals", icon: "🦦", tagline: "Thân thiện, tinh nghịch bơi lội", isVip: true },
  { id: "bunny",    name: "Thỏ Trắng",       category: "animals", icon: "🐰", tagline: "Nhanh nhảu, yêu giai điệu ngọt ngào" },
  { id: "bear",     name: "Gấu Nâu",         category: "animals", icon: "🐻", tagline: "Ấm áp, đáng tin cậy" },
  { id: "frog",     name: "Ếch Cốm",         category: "animals", icon: "🐸", tagline: "Vui nhộn, thích nhảy theo beat" },
  { id: "hamster",  name: "Chuột Hamster",   category: "animals", icon: "🐹", tagline: "Nhỏ nhắn, má phúng phính" },
  { id: "hedgehog", name: "Nhím Xù",         category: "animals", icon: "🦔", tagline: "Dễ gần, gai góc bên ngoài" },
  { id: "penguin",  name: "Chim Cánh Cụt",   category: "animals", icon: "🐧", tagline: "Mặc vest đi nghe nhạc" },
  { id: "pug",      name: "Chó Mặt Xệ Pug",  category: "animals", icon: "🐶", tagline: "Mắt to tròn, đáng yêu" },
  { id: "raccoon",  name: "Gấu Mèo Raccoon", category: "animals", icon: "🦝", tagline: "Thám tử tò mò" },
  { id: "sheep",    name: "Cừu Bông",        category: "animals", icon: "🐑", tagline: "Mơ màng, du dương" },
  { id: "sloth",    name: "Con Lười Sloth",  category: "animals", icon: "🦥", tagline: "Chậm rãi, cực kỳ chill" },
  { id: "deer",     name: "Hươu Sao",        category: "animals", icon: "🦌", tagline: "Thanh lịch, dịu dàng" },
  { id: "mouse",    name: "Chuột Nhắt",      category: "animals", icon: "🐭", tagline: "Tí hon, hoạt bát" },

  // ── Nhân vật & Nghề nghiệp (19) ─────────────────────
  { id: "astronaut",  name: "Phi Hành Gia VIP", category: "people",  icon: "👨‍🚀", tagline: "Bay bổng giữa không gian âm nhạc", isVip: true },
  { id: "wizard",     name: "Phù Thủy Thần Bí", category: "people",  icon: "🧙", tagline: "Phép thuật âm thanh diệu kỳ", isVip: true },
  { id: "skater",     name: "Dân Trượt Ván", category: "people",  icon: "🛹", tagline: "Bụi bặm, đậm chất Hip-Hop" },
  { id: "scientist",  name: "Nhà Khoa Học",  category: "people",  icon: "🔬", tagline: "Khám phá tần số âm nhạc" },
  { id: "chef",       name: "Bếp Trưởng",    category: "people",  icon: "👨‍🍳", tagline: "Nấu những món giai điệu ngon miệng" },
  { id: "pirate",     name: "Cướp Biển",     category: "people",  icon: "🏴‍☠️", tagline: "Săn lùng kho báu âm nhạc" },
  { id: "nurse",      name: "Y Tá Âm Nhạc",  category: "people",  icon: "🩺", tagline: "Chữa lành tâm hồn bằng giai điệu" },
  { id: "ballerina",  name: "Vũ Công Ba Lê", category: "people",  icon: "🩰", tagline: "Thanh tao, uyển chuyển" },
  { id: "builder",    name: "Kỹ Sư Công Trình", category: "people", icon: "👷", tagline: "Xây dựng những bản hit khủng" },
  { id: "glasses",    name: "Kính Cận Thông Thái", category: "people", icon: "👓", tagline: "Phân tích nhạc chuyên sâu" },
  { id: "afro",       name: "Tóc Xù Afro",   category: "people",  icon: "🕺", tagline: "Funky, Disco & tràn đầy năng lượng" },
  { id: "beard",      name: "Quý Ông Râu Quai Nón", category: "people", icon: "🧔", tagline: "Lịch lãm, trầm lắng" },
  { id: "cap",        name: "Mũ Lưỡi Trai",  category: "people",  icon: "🧢", tagline: "Streetwear năng động" },
  { id: "bald",       name: "Đầu Trọc Phong Cách", category: "people", icon: "👨‍🦲", tagline: "Cá tính, không đụng hàng" },
  { id: "grandpa",    name: "Ông Cụ Vui Tính", category: "people", icon: "👴", tagline: "Mê nhạc xưa, trữ tình bất hủ" },
  { id: "granny",     name: "Bà Cụ Hiền Hậu", category: "people", icon: "👵", tagline: "Ấm cúng, ngọt ngào như lời ru" },
  { id: "hijabi",     name: "Cô Gái Hijabi", category: "people",  icon: "🧕", tagline: "Trang nhã & sâu sắc" },
  { id: "kamran",     name: "Kamran",        category: "people",  icon: "🧒", tagline: "Tươi tắn, yêu đời" },
  { id: "sikh",       name: "Chàng Trai Sikh", category: "people", icon: "👳", tagline: "Hào sảng, nhiệt huyết" },

  // ── Robot & Đồ vật (13) ────────────────────────────
  { id: "knight",     name: "Hiệp Sĩ Hoàng Kim", category: "objects", icon: "🛡️", tagline: "Bảo hộ vương triều âm nhạc", isVip: true },
  { id: "robot",      name: "Robot Cyberpunk VIP", category: "objects", icon: "🤖", tagline: "Nhịp đập điện tử, EDM mê say", isVip: true },
  { id: "rocket",     name: "Tên Lửa Siêu Thanh", category: "objects", icon: "🚀", tagline: "Tốc độ drop bùng nổ vũ trụ" },
  { id: "drone",      name: "Drone Bay",     category: "objects", icon: "🛸", tagline: "Góc nhìn âm thanh 360 độ" },
  { id: "crt",        name: "Màn Hình CRT Retro", category: "objects", icon: "🖥️", tagline: "Hơi thở Vaporwave cổ điển" },
  { id: "radio",      name: "Đài Radio Vintage", category: "objects", icon: "📻", tagline: "Lofi vibes & radio cassette" },
  { id: "clockwork",  name: "Đồng Hồ Cơ",    category: "objects", icon: "⚙️", tagline: "Chuẩn xác từng mili-giây beat" },
  { id: "cube",       name: "Khối Lập Phương Cube", category: "objects", icon: "🧊", tagline: "Ảo diệu đa chiều" },
  { id: "lantern",    name: "Đèn Lồng Ấm Áp", category: "objects", icon: "🏮", tagline: "Thắp sáng không gian đêm" },
  { id: "postbot",    name: "Robot Đưa Thư", category: "objects", icon: "📬", tagline: "Chuyển giao những ca khúc mới" },
  { id: "scout",      name: "Robot Thám Hiểm", category: "objects", icon: "🛰️", tagline: "Dò tìm giai điệu độc lạ" },
  { id: "toaster",    name: "Máy Nướng Bánh Toaster", category: "objects", icon: "🍞", tagline: "Nóng hổi, giòn rụm" },
  { id: "tv",         name: "Tivi Cổ Điển",  category: "objects", icon: "📺", tagline: "Chiếu những thước phim MV đẹp mắt" },
];

export const MASCOT_STORAGE_KEY = "moodify.mascot.selected";
export const DEFAULT_MASCOT_ID = "koala";

/**
 * Returns the CDN sprite URLs for a given mascot id.
 * Format on koboyo.com:
 * https://koboyo.com/page-mascot/mascots/[id]-directions.webp
 * https://koboyo.com/page-mascot/mascots/[id]-reactions.webp
 */
export function getMascotUrls(mascotId: string) {
  // If koala exists in public/mascots, we can use local, or use koboyo.com CDN directly
  const safeId = MASCOTS.some((m) => m.id === mascotId) ? mascotId : DEFAULT_MASCOT_ID;
  return {
    directions: `https://koboyo.com/page-mascot/mascots/${safeId}-directions.webp`,
    reactions: `https://koboyo.com/page-mascot/mascots/${safeId}-reactions.webp`,
  };
}

export function getMascotById(id: string): MascotItem {
  return MASCOTS.find((m) => m.id === id) || MASCOTS[0];
}

export function getSelectedMascotId(): string {
  if (typeof window === "undefined") return DEFAULT_MASCOT_ID;
  return localStorage.getItem(MASCOT_STORAGE_KEY) || DEFAULT_MASCOT_ID;
}

export function setSelectedMascotId(mascotId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MASCOT_STORAGE_KEY, mascotId);
  window.dispatchEvent(new CustomEvent("moodify-mascot-changed", { detail: mascotId }));
}

/**
 * React hook to listen to mascot changes and keep components reactive
 */
export function useCurrentMascot() {
  const [mascotId, setMascotId] = useState<string>(DEFAULT_MASCOT_ID);

  useEffect(() => {
    setMascotId(getSelectedMascotId());

    const handleMascotChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setMascotId(customEvent.detail);
      } else {
        setMascotId(getSelectedMascotId());
      }
    };

    window.addEventListener("moodify-mascot-changed", handleMascotChange);
    return () => {
      window.removeEventListener("moodify-mascot-changed", handleMascotChange);
    };
  }, []);

  const mascot = getMascotById(mascotId);
  const urls = getMascotUrls(mascotId);

  return {
    mascot,
    mascotId,
    urls,
    setMascot: (id: string) => setSelectedMascotId(id),
  };
}
