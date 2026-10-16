"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { driver, DriveStep } from "driver.js";
import "./user-tour.css";
import type { UserProfileResponse } from "@/lib/auth-client";

interface UserTourGuideProps {
  user: UserProfileResponse | null;
  userLoading: boolean;
}

export function triggerUserTour() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("moodify-start-tour"));
  }
}

export default function UserTourGuide({ user, userLoading }: UserTourGuideProps) {
  const pathname = usePathname();
  const driverInstanceRef = useRef<ReturnType<typeof driver> | null>(null);

  const getStorageKey = useCallback(() => {
    return user ? `moodify_user_tour_completed_${user.id}` : "moodify_user_tour_completed_guest";
  }, [user]);

  const isUserRole = user?.role?.toLowerCase() === "user";
  const isDashboardHome = pathname === "/dashboard" || pathname === "/dashboard/user";

  const runTour = useCallback((force = false) => {
    if (typeof window === "undefined") return;

    const storageKey = getStorageKey();
    if (!force) {
      const alreadyCompleted = localStorage.getItem(storageKey);
      if (alreadyCompleted) return;
    }

    const steps: DriveStep[] = [
      {
        element: "#tour-search-bar",
        popover: {
          title: "🔍 Tìm kiếm theo Tâm trạng & AI",
          description: "Nhập bài hát, ca sĩ hoặc gõ thẳng tâm trạng của bạn (ví dụ: 'buồn muốn khóc', 'chill nhẹ nhàng', 'nạp năng lượng') để Moodify AI gợi ý danh sách nhạc phù hợp.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-vibe-filter",
        popover: {
          title: "🎧 Bộ lọc Vibe Thể loại",
          description: "Chuyển nhanh giữa các thể loại thịnh hành: Tất cả, V-Pop, Hip-Hop, Indie, Remix/EDM.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-hero-player",
        popover: {
          title: "💿 Sân khấu Âm nhạc & Đĩa than",
          description: "Bấm phát nhạc nhanh, thưởng thức đĩa than chuyển động sống động và chế độ Lời bài hát Karaoke (Realtime Lyrics) chạy đồng bộ theo từng câu hát.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#tour-sidebar-nav",
        popover: {
          title: "🧭 Menu Điều hướng Chính",
          description: "Dễ dàng chuyển đổi giữa Trang chủ, Khám phá tìm kiếm chuyên sâu và Thư viện cá nhân.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#tour-playlist-section",
        popover: {
          title: "➕ Quản lý Danh sách phát",
          description: "Bấm 'Mới' để tự tạo những playlist theo phong cách riêng của bạn và lưu lại các bài hát yêu thích.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#tour-mascot-profile",
        popover: {
          title: "✨ Linh vật Đồng hành & Tài khoản",
          description: "Gặp gỡ bé linh vật Moodify, đổi giao diện phát sáng VIP, mở cài đặt hoặc bấm xem lại Hướng dẫn bất kỳ lúc nào tại đây.",
          side: "bottom",
          align: "end",
        },
      },
    ];

    // Filter only steps whose elements currently exist in DOM
    const validSteps = steps.filter((s) => {
      if (typeof s.element === "string") {
        return Boolean(document.querySelector(s.element));
      }
      return true;
    });

    if (validSteps.length === 0) return;

    // Destroy any existing tour
    if (driverInstanceRef.current) {
      driverInstanceRef.current.destroy();
    }

    const driverObj = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      overlayColor: "#000000",
      overlayOpacity: 0.8,
      stagePadding: 8,
      stageRadius: 16,
      popoverClass: "moodify-tour-popover",
      progressText: "{{current}} / {{total}}",
      nextBtnText: "Tiếp tục →",
      prevBtnText: "← Quay lại",
      doneBtnText: "Khám phá ngay ✨",
      steps: validSteps,
      onDestroyed: () => {
        try {
          localStorage.setItem(storageKey, "true");
        } catch (_) {}
      },
    });

    driverInstanceRef.current = driverObj;
    driverObj.drive();
  }, [getStorageKey]);

  useEffect(() => {
    // Listen for manual trigger (e.g. from Help button)
    const handleStartTour = () => {
      runTour(true);
    };

    window.addEventListener("moodify-start-tour", handleStartTour);
    return () => {
      window.removeEventListener("moodify-start-tour", handleStartTour);
    };
  }, [runTour]);

  useEffect(() => {
    // Auto start on first visit if user is 'user' role
    if (userLoading || !user) return;
    if (!isUserRole || !isDashboardHome) return;

    const storageKey = getStorageKey();
    if (localStorage.getItem(storageKey)) return;

    // Small delay to allow DOM to finish layout and images/fonts to paint
    const timer = setTimeout(() => {
      runTour(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [userLoading, user, isUserRole, isDashboardHome, getStorageKey, runTour]);

  return null;
}
