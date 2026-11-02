"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
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

function getStoredUser(): { id?: number; role?: string; username?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("moodify.auth.user");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        id: parsed.id ?? parsed.userId,
        role: parsed.role,
        username: parsed.username,
      };
    }
  } catch {}
  return null;
}

export default function UserTourGuide({ user, userLoading }: UserTourGuideProps) {
  const pathname = usePathname();
  const router = useRouter();
  const driverInstanceRef = useRef<ReturnType<typeof driver> | null>(null);
  const isCompletedRef = useRef(false);
  const isTourActiveRef = useRef(false);

  const getEffectiveUser = useCallback(() => {
    if (user?.id) return user;
    const stored = getStoredUser();
    if (stored?.id) return stored as UserProfileResponse;
    return user;
  }, [user]);

  const getStorageKey = useCallback(() => {
    const u = getEffectiveUser();
    const id = u?.id;
    return id ? `moodify_user_tour_completed_${id}` : null;
  }, [getEffectiveUser]);

  const isTourCompleted = useCallback(() => {
    if (typeof window === "undefined") return false;
    const storageKey = getStorageKey();
    if (!storageKey) return false;
    return Boolean(localStorage.getItem(storageKey));
  }, [getStorageKey]);

  const startDriverTour = useCallback(function startTour(force = false) {
    if (typeof window === "undefined") return;

    const storageKey = getStorageKey();
    if (!storageKey) {
      console.log("[MoodifyTour] User ID not resolved yet, waiting to start tour.");
      return;
    }

    if (!force && localStorage.getItem(storageKey)) {
      console.log(`[MoodifyTour] Tour already marked completed for ${storageKey}.`);
      return;
    }

    // Do not disrupt if tour is currently active and user hasn't explicitly clicked 'Help'
    if (isTourActiveRef.current && driverInstanceRef.current?.isActive() && !force) {
      return;
    }

    if (force && driverInstanceRef.current) {
      try {
        driverInstanceRef.current.destroy();
      } catch {}
    }

    // Define all steps
    const rawSteps: DriveStep[] = [
      {
        popover: {
          title: "Chào mừng đến với Moodify",
          description: "Âm nhạc hợp tâm trạng, trải nghiệm theo cách của bạn. Dành 30 giây khám phá những điều thú vị đang chờ bạn nhé!",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#tour-hero-player",
        popover: {
          title: "Sân khấu âm nhạc của bạn",
          description: "Bấm 'Nghe ngay', thưởng thức đĩa than chuyển động sống động và chế độ Lời bài hát Karaoke (Realtime Lyrics) chạy đồng bộ theo từng câu hát.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#tour-vibe-filter",
        popover: {
          title: "Chọn vibe, tìm đúng gu",
          description: "Lựa chọn nhanh các thể loại âm nhạc phù hợp với tâm trạng: Tất cả, V-Pop, Hip-Hop, Indie, Remix/EDM.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-search-bar",
        popover: {
          title: "Tìm nhạc theo cảm xúc",
          description: "Nhập bài hát, ca sĩ hoặc gõ thẳng tâm trạng của bạn (ví dụ: 'buồn muốn khóc', 'chill nhẹ nhàng', 'nạp năng lượng') để Moodify AI gợi ý danh sách nhạc phù hợp.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-sidebar-nav",
        popover: {
          title: "Mọi thứ trong tầm tay",
          description: "Dễ dàng chuyển đổi giữa Trang chủ, Khám phá tìm kiếm chuyên sâu và Thư viện cá nhân của bạn.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#tour-playlist-section",
        popover: {
          title: "Bộ sưu tập của riêng bạn",
          description: "Tự do tạo danh sách phát của riêng bạn, thêm bài hát yêu thích và cài đặt Công khai hoặc Riêng tư.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#tour-mascot-profile",
        popover: {
          title: "Góc nhỏ mang dấu ấn bạn",
          description: "Gặp gỡ bé linh vật Moodify, đổi giao diện phát sáng VIP, mở cài đặt cá nhân hoặc xem lại hướng dẫn bất cứ lúc nào.",
          side: "bottom",
          align: "end",
        },
      },
      {
        popover: {
          title: "Sẵn sàng tìm giai điệu của bạn?",
          description: "Mọi thứ đã sẵn sàng. Hãy để Moodify đồng hành cùng cảm xúc của bạn, bắt đầu từ bài hát đầu tiên.",
          side: "top",
          align: "center",
        },
      },
    ];

    // Filter valid steps: Center popovers (no element) are always kept; Elements must exist and be visible
    const validSteps = rawSteps.filter((s) => {
      if (!s.element) return true;
      if (typeof s.element === "string") {
        const el = document.querySelector(s.element) as HTMLElement | null;
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== "none";
      }
      return true;
    });

    if (validSteps.length === 0) return;

    isCompletedRef.current = false;
    isTourActiveRef.current = true;
    console.log(`[MoodifyTour] Launching tour with ${validSteps.length} steps for storageKey=${storageKey}`);

    const finishTour = (tour: ReturnType<typeof driver>) => {
      // Remember both completion and skipping so the tour does not reopen.
      isCompletedRef.current = true;
      try {
        localStorage.setItem(storageKey, "true");
      } catch {}
      tour.destroy();
    };

    const driverObj = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      overlayColor: "#000000",
      overlayOpacity: 0.76,
      stagePadding: 8,
      stageRadius: 16,
      allowClose: false, // Use the explicit skip button to dismiss the tour.
      overlayClickBehavior: "none",
      disableActiveInteraction: true,
      popoverClass: "moodify-tour-popover",
      progressText: "Bước {{current}} / {{total}}",
      nextBtnText: "Tiếp tục →",
      prevBtnText: "← Quay lại",
      doneBtnText: "Khám phá ngay →",
      steps: validSteps,
      onPopoverRender: (popover, opts) => {
        const currentIndex = opts.driver.getActiveIndex() ?? 0;
        const header = document.createElement("div");
        header.className = "moodify-tour-header";
        const label = document.createElement("span");
        label.className = "moodify-tour-label";
        label.textContent = "MOODIFY · HƯỚNG DẪN";

        const skipButton = document.createElement("button");
        skipButton.type = "button";
        skipButton.className = "moodify-tour-skip-btn";
        skipButton.textContent = "Bỏ qua";
        skipButton.setAttribute("aria-label", "Bỏ qua hướng dẫn");
        skipButton.addEventListener("click", () => finishTour(opts.driver));
        header.append(label, skipButton);

        const icon = document.createElement("div");
        icon.className = "moodify-tour-icon";
        icon.setAttribute("aria-hidden", "true");
        for (let i = 0; i < 5; i++) {
          icon.appendChild(document.createElement("span"));
        }
        popover.wrapper.insertBefore(header, popover.title);
        popover.wrapper.insertBefore(icon, popover.title);

        const progressTrack = document.createElement("div");
        progressTrack.className = "moodify-tour-progress-track";
        progressTrack.setAttribute("aria-hidden", "true");
        for (let i = 0; i < validSteps.length; i++) {
          const segment = document.createElement("span");
          segment.className = i <= currentIndex ? "is-complete" : "";
          progressTrack.appendChild(segment);
        }

        const progressDetails = document.createElement("div");
        progressDetails.className = "moodify-tour-progress-details";
        const progressCaption = document.createElement("span");
        progressCaption.textContent = opts.driver.isLastStep()
          ? "Bắt đầu hành trình của bạn"
          : "Làm quen với Moodify";
        progressDetails.append(progressCaption, popover.progress);
        popover.footer.prepend(progressDetails, progressTrack);
        // The first step has one clear action; later steps retain back navigation.
        popover.previousButton.hidden = opts.driver.isFirstStep();
        if (opts.driver.isFirstStep()) {
          popover.nextButton.textContent = "Bắt đầu khám phá →";
        }
      },
      onDestroyStarted: (_el, _step, opts) => {
        if (opts.driver.isLastStep()) {
          finishTour(opts.driver);
        }
      },
      onDestroyed: () => {
        isTourActiveRef.current = false;
        // Nếu đóng dở dang khi chưa hoàn thành: tự động bật lại sau 600ms
        if (!isCompletedRef.current) {
          const completed = localStorage.getItem(storageKey);
          if (!completed) {
            setTimeout(() => {
              if (!isCompletedRef.current && !localStorage.getItem(storageKey)) {
                startTour(false);
              }
            }, 600);
          }
        }
      },
    });

    driverInstanceRef.current = driverObj;
    driverObj.drive();
  }, [getStorageKey]);

  // Handle manual trigger (Help button) and expose reset helper in console
  useEffect(() => {
    const handleStartTour = () => {
      startDriverTour(true);
    };

    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__moodifyResetTour = () => {
        const u = getEffectiveUser();
        if (u?.id) {
          localStorage.removeItem(`moodify_user_tour_completed_${u.id}`);
          console.log(`[MoodifyTour] Cleared tour flag for user ${u.id}. Starting tour now...`);
          startDriverTour(true);
        } else {
          console.log("[MoodifyTour] No current user found to reset.");
        }
      };
    }

    window.addEventListener("moodify-start-tour", handleStartTour);
    return () => {
      window.removeEventListener("moodify-start-tour", handleStartTour);
    };
  }, [startDriverTour, getEffectiveUser]);

  // Main Effect: Watch for page ready and automatically start tutorial
  useEffect(() => {
    const effectiveUser = getEffectiveUser();
    if (userLoading && !effectiveUser) return;

    const role = (effectiveUser?.role || "").toUpperCase();
    // Only for standard USER role
    if (role && role !== "USER") return;

    const storageKey = getStorageKey();
    if (!storageKey) return; // Wait until user ID is known

    // Check if already completed
    if (isTourCompleted()) return;

    const isDashboard = pathname === "/dashboard" || pathname === "/dashboard/user";
    if (!isDashboard) {
      // If user tries to visit other pages before finishing tutorial, redirect back
      router.replace("/dashboard/user");
      return;
    }

    // Polling: wait until page layout is ready
    let isCancelled = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 * 200ms = 6 seconds

    const pollInterval = setInterval(() => {
      if (isCancelled || isTourActiveRef.current) return;
      attempts++;

      const heroEl = document.querySelector("#tour-hero-player");
      if (heroEl || attempts >= maxAttempts) {
        clearInterval(pollInterval);
        if (!isCancelled && !isTourCompleted() && !isTourActiveRef.current) {
          startDriverTour(false);
        }
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
    };
  }, [user, userLoading, pathname, isTourCompleted, getEffectiveUser, getStorageKey, router, startDriverTour]);

  return null;
}
