"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { LogoMark, BrandLogo } from "@/components/shared/logo-mark";
import {
  clearAuthSession,
  getCurrentUser,
  getStoredAuthSession,
  getValidAccessToken,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  saveAuthSession,
  uploadAvatar,
  type UserProfileResponse,
} from "@/lib/auth/auth-client";

type HeroSlide = {
  id: number;
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  artist: string;
  role: string;
  image: string;
  artPrompt: string;
};

type SignInCredentials = {
  username: string;
  password: string;
};

type CreateAccountForm = {
  fullName: string;
  stageName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: "USER" | "CONTENT_LEAD" | "ARTIST";
  genres: string[];
  genresRaw: string[];
};

const SUGGESTED_GENRES = [
  "V-Pop",
  "Pop",
  "Ballad",
  "R&B",
  "Hip-Hop",
  "Indie",
  "EDM",
  "Rock",
  "Lo-Fi",
  "Acoustic",
  "Rap",
  "Jazz",
  "Soul",
];

const PRESET_AVATARS = [
  {
    id: "neon-indie",
    name: "Neon Indie",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80",
  },
  {
    id: "urban-acoustic",
    name: "Urban Acoustic",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80",
  },
  {
    id: "electro-beats",
    name: "Electro Beats",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80",
  },
  {
    id: "retro-vinyl",
    name: "Retro Vinyl",
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80",
  },
  {
    id: "synth-wave",
    name: "Synth Wave",
    url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=240&auto=format&fit=crop&q=80",
  },
  {
    id: "ambient-soul",
    name: "Ambient Soul",
    url: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=240&auto=format&fit=crop&q=80",
  },
];

const heroSlides: HeroSlide[] = [
  {
    id: 1,
    eyebrow: "Moodify Originals",
    title: "Find It.\nFeel It.",
    description:
      "A cinematic first impression for listeners who want fresh releases, deep cuts and a mood-driven way to explore.",
    primaryCta: "Get started",
    secondaryCta: "See releases",
    artist: "NOVA / Mirage Set",
    role: "Late-night electronic feature",
    image:
      "/banners/1789366525227_3773179866591870151_3773179866591870151_6b435752096885913fd1d8c6101dd3e5.jpg",
    artPrompt:
      "Editorial music campaign banner, moody spotlight, dark olive and warm beige tones, premium streaming landing page, cinematic fashion photography energy, left side clean for headline, no text",
  },
  {
    id: 2,
    eyebrow: "Artist Uploads",
    title: "Turn Up\nYour Own Wave.",
    description:
      "Use this slide for creator campaigns, upload flows or premium plans without losing the strong visual style of the homepage.",
    primaryCta: "Upload now",
    secondaryCta: "Artist Pro",
    artist: "AERA / Signal Bloom",
    role: "Independent artist spotlight",
    image:
      "/banners/1789389359586_3773179866591870151_3773179866591870151_5e9ef505ae90da88386d273daac0c0fc.jpg",
    artPrompt:
      "Independent artist hero banner, cool blue sky, oversized silhouette, contemporary music platform, premium minimalist composition, crisp editorial lighting, left side empty for typography, no text",
  },
  {
    id: 3,
    eyebrow: "Scene Radar",
    title: "Every Scene\nLives Here.",
    description:
      "A collage-driven slide works well for trending genres, community stories and discovery features across the product.",
    primaryCta: "Explore now",
    secondaryCta: "Browse scenes",
    artist: "Collective / Aftertone",
    role: "Community discovery campaign",
    image:
      "/banners/1789389360187_3773179866591870151_3773179866591870151_b7492bff6fbaa28d69a7e0a8ade7b36d.jpg",
    artPrompt:
      "Music culture collage banner with multiple panels, underground artists, warm flash photography, black background, luxury streaming platform, dramatic contrast, composition leaves room for text on left, no text",
  },
];

const emptyCreateAccountForm: CreateAccountForm = {
  fullName: "",
  stageName: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: "USER",
  genres: [],
  genresRaw: [],
};

const HOME_ROUTE = "/";
const USER_DASHBOARD_ROUTE = "/dashboard/user";
const CONTENT_LEAD_DASHBOARD_ROUTE = "/dashboard/content-lead";
const ARTIST_DASHBOARD_ROUTE = "/dashboard/content-lead";
const MODERATOR_DASHBOARD_ROUTE = "/dashboard/moderator";
const ADMIN_DASHBOARD_ROUTE = "/dashboard/admin";

function getDashboardPathForRole(role: string) {
  const normalizedRole = role.trim().toLowerCase();

  if (normalizedRole === "content_lead" || normalizedRole === "artist") {
    return CONTENT_LEAD_DASHBOARD_ROUTE;
  }

  if (normalizedRole === "moderator") {
    return MODERATOR_DASHBOARD_ROUTE;
  }

  if (normalizedRole === "admin") {
    return ADMIN_DASHBOARD_ROUTE;
  }

  return USER_DASHBOARD_ROUTE;
}

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [authUser, setAuthUser] = useState<UserProfileResponse | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [showCreateFields, setShowCreateFields] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [createAccountError, setCreateAccountError] = useState<string | null>(
    null,
  );
  const [isSubmittingSignIn, setIsSubmittingSignIn] = useState(false);
  const [isSubmittingCreateAccount, setIsSubmittingCreateAccount] =
    useState(false);
  const [isHydratingSession, setIsHydratingSession] = useState(true);
  const [credentials, setCredentials] = useState<SignInCredentials>({
    username: "",
    password: "",
  });

  // State for multi-step signup and avatar selection
  const [createAccountStep, setCreateAccountStep] = useState<1 | 2>(1);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [selectedPresetAvatar, setSelectedPresetAvatar] = useState<string | null>(null);

  const [createAccountForm, setCreateAccountForm] = useState<CreateAccountForm>(
    emptyCreateAccountForm,
  );

  const router = useRouter();

  useEffect(() => {
    router.prefetch(USER_DASHBOARD_ROUTE);
    router.prefetch(ARTIST_DASHBOARD_ROUTE);
    router.prefetch(MODERATOR_DASHBOARD_ROUTE);
    router.prefetch(ADMIN_DASHBOARD_ROUTE);
  }, [router]);

  const [isHovered, setIsHovered] = useState(false);

  const prevSlide = () => {
    setActiveIndex((current) => (current - 1 + heroSlides.length) % heroSlides.length);
  };

  const nextSlide = () => {
    setActiveIndex((current) => (current + 1) % heroSlides.length);
  };

  const advanceSlide = useEffectEvent(() => {
    if (!isHovered) {
      setActiveIndex((current) => (current + 1) % heroSlides.length);
    }
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      advanceSlide();
    }, 5500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const hydrateUser = async () => {
      const token = await getValidAccessToken();

      if (!token) {
        if (!isCancelled) {
          setIsHydratingSession(false);
        }
        return;
      }

      try {
        const user = await getCurrentUser(token);
        if (!isCancelled) {
          setAuthUser(user);
        }
      } catch (err) {
        if (!isCancelled) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg.includes("401") || errMsg.toLowerCase().includes("unauthorized")) {
            clearAuthSession();
            setAuthUser(null);
          }
        }
      } finally {
        if (!isCancelled) {
          setIsHydratingSession(false);
        }
      }
    };

    void hydrateUser();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSignInOpen && !isCreateAccountOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSignInOpen(false);
        closeCreateAccount();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSignInOpen, isCreateAccountOpen]);

  const handleCredentialsChange = ({
    target,
  }: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = target;
    setCredentials((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleCreateAccountChange = ({
    target,
  }: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = target;
    setCreateAccountForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleRoleChange = (role: "USER" | "CONTENT_LEAD" | "ARTIST") => {
    setCreateAccountForm((current) => ({
      ...current,
      role,
    }));
  };

  const handleAddGenre = (rawTag: string) => {
    const trimmed = rawTag.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    setCreateAccountForm((current) => {
      if (current.genres.includes(lower)) {
        return current;
      }
      return {
        ...current,
        genres: [...current.genres, lower],
        genresRaw: [...current.genresRaw, trimmed],
      };
    });
  };

  const handleRemoveGenre = (genreToRemove: string) => {
    setCreateAccountForm((current) => {
      const idx = current.genres.findIndex(
        (g) => g === genreToRemove.toLowerCase(),
      );
      if (idx === -1) return current;
      const nextGenres = [...current.genres];
      const nextGenresRaw = [...current.genresRaw];
      nextGenres.splice(idx, 1);
      nextGenresRaw.splice(idx, 1);
      return {
        ...current,
        genres: nextGenres,
        genresRaw: nextGenresRaw,
      };
    });
  };

  const handleToggleSuggestedGenre = (genre: string) => {
    const lower = genre.trim().toLowerCase();
    if (createAccountForm.genres.includes(lower)) {
      handleRemoveGenre(lower);
    } else {
      handleAddGenre(genre);
    }
  };

  const handleAvatarFileSelect = (file: File) => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setSelectedPresetAvatar(null);
  };

  const handleClearAvatar = () => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    setSelectedPresetAvatar(null);
  };

  const handlePresetAvatarSelect = (url: string) => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(null);
    }
    setAvatarFile(null);
    setSelectedPresetAvatar(url);
  };

  const handleSignInSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignInError(null);
    setAuthMessage(null);

    const submitSignIn = async () => {
      setIsSubmittingSignIn(true);

      try {
        const auth = await loginRequest({
          identifier: credentials.username.trim(),
          password: credentials.password,
        });

        saveAuthSession(auth);
        const currentUser = await getCurrentUser(auth.accessToken);
        setAuthUser(currentUser);
        setCredentials({
          username: "",
          password: "",
        });
        setIsSignInOpen(false);

        router.push(getDashboardPathForRole(currentUser.role));
      } catch (error) {
        setSignInError(
          error instanceof Error ? error.message : "Đăng nhập thất bại",
        );
      } finally {
        setIsSubmittingSignIn(false);
      }
    };

    void submitSignIn();
  };

  // Step 1 -> Step 2 validation
  const handleProceedToAvatarStep = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateAccountError(null);

    if (!createAccountForm.fullName.trim()) {
      setCreateAccountError("Vui lòng nhập họ và tên.");
      return;
    }
    if (createAccountForm.role === "CONTENT_LEAD" || createAccountForm.role === "ARTIST") {
      if (!createAccountForm.stageName.trim()) {
        setCreateAccountError("Vui lòng nhập nghệ danh hoặc tên hiển thị của bạn.");
        return;
      }
      if (createAccountForm.stageName.trim().length < 2) {
        setCreateAccountError("Nghệ danh phải có ít nhất 2 ký tự.");
        return;
      }
    }
    if (createAccountForm.username.trim().length < 4) {
      setCreateAccountError("Tên đăng nhập phải có ít nhất 4 ký tự.");
      return;
    }
    if (!createAccountForm.phone.trim()) {
      setCreateAccountError("Vui lòng nhập số điện thoại.");
      return;
    }
    if (!createAccountForm.email.trim() || !createAccountForm.email.includes("@")) {
      setCreateAccountError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }
    if (createAccountForm.password.length < 6) {
      setCreateAccountError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (createAccountForm.password !== createAccountForm.confirmPassword) {
      setCreateAccountError("Xác nhận mật khẩu không khớp.");
      return;
    }

    setCreateAccountStep(2);
  };

  const handleBackToInfoStep = () => {
    setCreateAccountError(null);
    setCreateAccountStep(1);
  };

  // Final submit at Step 2 (or Skip)
  const handleFinalCreateAccountSubmit = async () => {
    setCreateAccountError(null);
    setAuthMessage(null);
    setIsSubmittingCreateAccount(true);

    try {
      const finalPresetUrl = avatarFile ? undefined : (selectedPresetAvatar ?? undefined);

      const rawList =
        createAccountForm.genresRaw.length > 0
          ? createAccountForm.genresRaw
          : createAccountForm.genres;

      const normalizedGenres = rawList
        .map((g) => g.trim().toLowerCase())
        .filter(Boolean);
      const rawGenres = rawList.map((g) => g.trim()).filter(Boolean);

      const auth = await registerRequest({
        fullName: createAccountForm.fullName.trim(),
        stageName:
          createAccountForm.role === "CONTENT_LEAD" || createAccountForm.role === "ARTIST"
            ? createAccountForm.stageName.trim()
            : undefined,
        phone: createAccountForm.phone.trim(),
        email: createAccountForm.email.trim(),
        username: createAccountForm.username.trim(),
        password: createAccountForm.password,
        confirmPassword: createAccountForm.confirmPassword,
        role: createAccountForm.role,
        avatarUrl: finalPresetUrl,
        genres: normalizedGenres,
        genresRaw: rawGenres,
      });

      saveAuthSession(auth);

      // If user uploaded a local image file, upload it now
      if (avatarFile) {
        try {
          await uploadAvatar(auth.accessToken, avatarFile);
        } catch (uploadError) {
          console.warn("Avatar upload failed after register:", uploadError);
        }
      }

      const currentUser = await getCurrentUser(auth.accessToken);
      setAuthUser(currentUser);

      closeCreateAccount();

      router.push(getDashboardPathForRole(currentUser.role));
    } catch (error) {
      setCreateAccountError(
        error instanceof Error ? error.message : "Tạo tài khoản thất bại",
      );
    } finally {
      setIsSubmittingCreateAccount(false);
    }
  };

  const openSignIn = () => {
    setIsCreateAccountOpen(false);
    setShowCreateFields(false);
    setCreateAccountError(null);
    setSignInError(null);
    setIsSignInOpen(true);
  };

  const openCreateAccount = () => {
    setIsSignInOpen(false);
    setSignInError(null);
    setCreateAccountError(null);
    setIsCreateAccountOpen(true);
  };

  const closeSignIn = () => {
    setIsSignInOpen(false);
    setSignInError(null);
  };

  const closeCreateAccount = () => {
    setIsCreateAccountOpen(false);
    setShowCreateFields(false);
    setCreateAccountStep(1);
    setCreateAccountError(null);
    setCreateAccountForm(emptyCreateAccountForm);
    setAvatarFile(null);
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(null);
    }
    setSelectedPresetAvatar(null);
  };

  const handleLogout = () => {
    const submitLogout = async () => {
      const session = getStoredAuthSession();

      if (session) {
        try {
          await logoutRequest(session.refreshToken);
        } catch {
          // Stateless backend may already consider the client logged out.
        }
      }

      clearAuthSession();
      setAuthUser(null);
      setAuthMessage("Bạn đã đăng xuất.");
    };

    void submitLogout();
  };

  const isSignInComplete =
    credentials.username.trim().length > 0 &&
    credentials.password.trim().length > 0;

  return (
    <section className="space-y-4">
      <div
        className="group relative w-full aspect-[2/1] sm:aspect-[2.4/1] lg:aspect-[3.03/1] min-h-[300px] sm:min-h-[360px] lg:min-h-[420px] overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 bg-[#090909] shadow-[0_25px_80px_rgba(0,0,0,0.55)]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Navigation Header overlay with subtle top shadow */}
        <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6 bg-gradient-to-b from-black/60 via-black/20 to-transparent">
          <Link
            aria-label="Moodify Home"
            className="group flex items-center transition-transform duration-200 hover:scale-[1.03]"
            href={HOME_ROUTE}
          >
            <BrandLogo
              variant="horizontal"
              className="h-9 sm:h-10 w-auto drop-shadow-[0_4px_20px_rgba(122,92,255,0.45)]"
              priority
            />
          </Link>

          <div className="flex items-center gap-3">
            {isHydratingSession ? (
              <span className="h-10 w-28 animate-pulse rounded-full border border-white/10 bg-white/5" />
            ) : authUser ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/14 bg-white/10 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md transition duration-300 hover:border-white/28 hover:bg-white/16"
                  href={getDashboardPathForRole(authUser.role)}
                >
                  Dashboard
                </Link>
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-black/40 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/78 backdrop-blur-md transition duration-300 hover:border-white/24 hover:bg-white/10 hover:text-white"
                  onClick={handleLogout}
                  type="button"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/14 bg-white/10 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md transition duration-300 hover:border-white/28 hover:bg-white/16"
                  onClick={openSignIn}
                  type="button"
                >
                  Log in
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full bg-white px-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#0d0d11] transition duration-300 hover:scale-105 hover:bg-white/90"
                  onClick={openCreateAccount}
                  type="button"
                >
                  Join now
                </button>
              </div>
            )}
          </div>
        </header>

        {authMessage ? (
          <div className="absolute inset-x-6 top-20 z-30 flex justify-center">
            <p className="rounded-full border border-white/14 bg-black/70 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-md shadow-lg">
              {authMessage}
            </p>
          </div>
        ) : null}

        {/* Clean Banner Carousel without overlay text/gradients */}
        {heroSlides.map((slide, index) => {
          const isActive = index === activeIndex;

          return (
            <article
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
              key={slide.id}
            >
              <Image
                alt={slide.title.replace("\n", " ")}
                className="object-cover object-center"
                fill
                priority={index === 0}
                quality={95}
                sizes="(max-width: 768px) 100vw, 1280px"
                src={slide.image}
              />
            </article>
          );
        })}

        {/* Previous Button */}
        <button
          aria-label="Banner trước"
          className="absolute left-3 sm:left-5 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/70 hover:border-white/40 opacity-0 group-hover:opacity-100 sm:opacity-60 sm:hover:opacity-100 focus:opacity-100 cursor-pointer shadow-lg"
          onClick={prevSlide}
          type="button"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Next Button */}
        <button
          aria-label="Banner tiếp theo"
          className="absolute right-3 sm:right-5 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/70 hover:border-white/40 opacity-0 group-hover:opacity-100 sm:opacity-60 sm:hover:opacity-100 focus:opacity-100 cursor-pointer shadow-lg"
          onClick={nextSlide}
          type="button"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {/* Dot Pagination Indicator */}
        <div className="absolute bottom-3 sm:bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/14 bg-black/50 px-3.5 py-1.5 backdrop-blur-md shadow-md">
          {heroSlides.map((_, dotIndex) => (
            <button
              aria-label={`Chuyển đến banner ${dotIndex + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                dotIndex === activeIndex
                  ? "w-8 bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                  : "w-2 bg-white/40 hover:bg-white/70"
              }`}
              key={dotIndex}
              onClick={() => setActiveIndex(dotIndex)}
              type="button"
            />
          ))}
        </div>
      </div>

      {isSignInOpen ? (
        <SignInModal
          credentials={credentials}
          errorMessage={signInError}
          isFormComplete={isSignInComplete}
          isSubmitting={isSubmittingSignIn}
          onChange={handleCredentialsChange}
          onClose={closeSignIn}
          onSubmit={handleSignInSubmit}
        />
      ) : null}

      {isCreateAccountOpen ? (
        <CreateAccountModal
          form={createAccountForm}
          step={createAccountStep}
          errorMessage={createAccountError}
          isSubmitting={isSubmittingCreateAccount}
          avatarFile={avatarFile}
          avatarPreviewUrl={avatarPreviewUrl}
          selectedPresetAvatar={selectedPresetAvatar}
          onChange={handleCreateAccountChange}
          onRoleChange={handleRoleChange}
          onAvatarFileSelect={handleAvatarFileSelect}
          onClearAvatar={handleClearAvatar}
          onPresetAvatarSelect={handlePresetAvatarSelect}
          onNextStep={handleProceedToAvatarStep}
          onBackStep={handleBackToInfoStep}
          onFinalSubmit={handleFinalCreateAccountSubmit}
          onClose={closeCreateAccount}
          onAddGenre={handleAddGenre}
          onRemoveGenre={handleRemoveGenre}
          onToggleSuggestedGenre={handleToggleSuggestedGenre}
          onOpenSignIn={openSignIn}
        />
      ) : null}
    </section>
  );
}

type SignInModalProps = {
  credentials: SignInCredentials;
  errorMessage: string | null;
  isFormComplete: boolean;
  isSubmitting: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

type CreateAccountModalProps = {
  form: CreateAccountForm;
  step: 1 | 2;
  errorMessage: string | null;
  isSubmitting: boolean;
  avatarFile: File | null;
  avatarPreviewUrl: string | null;
  selectedPresetAvatar: string | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRoleChange: (role: "USER" | "CONTENT_LEAD" | "ARTIST") => void;
  onAvatarFileSelect: (file: File) => void;
  onClearAvatar: () => void;
  onPresetAvatarSelect: (url: string) => void;
  onNextStep: (event: FormEvent<HTMLFormElement>) => void;
  onBackStep: () => void;
  onFinalSubmit: () => void;
  onClose: () => void;
  onAddGenre: (genre: string) => void;
  onRemoveGenre: (genre: string) => void;
  onToggleSuggestedGenre: (genre: string) => void;
  onOpenSignIn: () => void;
};

function SignInModal({
  credentials,
  errorMessage,
  isFormComplete,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
}: SignInModalProps) {
  const accountId = useId();
  const passwordId = useId();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <button
        aria-label={"Đóng modal đăng nhập"}
        className="modal-backdrop absolute inset-0 bg-[rgba(4,4,7,0.78)] backdrop-blur-[10px]"
        onClick={onClose}
        type="button"
      />

      <div className="modal-panel relative z-10 w-full max-w-[500px] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,22,0.98),rgba(10,10,13,0.98))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.55)] sm:p-7">
        <div className="modal-orb absolute left-[-12%] top-[-10%] h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(255,124,56,0.18),rgba(255,124,56,0.02)_58%,transparent_72%)]" />
        <div className="modal-orb absolute bottom-[-18%] right-[-16%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(134,157,255,0.12),rgba(134,157,255,0.02)_56%,transparent_74%)] [animation-delay:0.4s]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(255,124,56,0.22),transparent_72%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_24%,transparent_72%,rgba(255,255,255,0.03))]" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="modal-item">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/45">
              {"Đăng nhập"}
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold uppercase tracking-[-0.025em] leading-[1.05] text-white sm:text-[3rem]">
              Moodify
            </h2>
            <div className="mt-4 h-px w-20 bg-[linear-gradient(90deg,rgba(255,124,56,0.65),rgba(255,255,255,0.06))]" />
          </div>

          <button
            aria-label={"Đóng"}
            className="modal-close inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="relative mt-8 space-y-5">
          <div className="modal-item modal-surface rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 [animation-delay:0.08s]">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-white/78"
                  htmlFor={accountId}
                >
                  {"Tài khoản"}
                </label>
                <input
                  className="modal-input w-full rounded-2xl border border-white/10 bg-[#101116] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-white/22 focus:bg-[#14161c]"
                  id={accountId}
                  name="username"
                  onChange={onChange}
                  placeholder={
                    "Nhập email hoặc tên tài khoản"
                  }
                  type="text"
                  value={credentials.username}
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-white/78"
                  htmlFor={passwordId}
                >
                  {"Mật khẩu"}
                </label>
                <input
                  className="modal-input w-full rounded-2xl border border-white/10 bg-[#101116] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-white/22 focus:bg-[#14161c]"
                  id={passwordId}
                  name="password"
                  onChange={onChange}
                  placeholder={"Nhập mật khẩu"}
                  type="password"
                  value={credentials.password}
                />
              </div>

              <button
                className="modal-primary-button w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#111111] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:bg-white/18 disabled:text-white/38 disabled:hover:scale-100"
                disabled={!isFormComplete || isSubmitting}
                type="submit"
              >
                {isSubmitting
                  ? "Đang đăng nhập..."
                  : "Đăng nhập"}
              </button>
            </form>

            {errorMessage ? (
              <p className="mt-4 rounded-2xl border border-[#ff8b8b]/20 bg-[#ff8b8b]/8 px-4 py-3 text-sm text-[#ffb1b1]">
                {errorMessage}
              </p>
            ) : null}
          </div>

          <div className="modal-item flex items-center gap-3 px-1 [animation-delay:0.14s]">
            <div className="h-px flex-1 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.1),rgba(255,255,255,0.06))]" />
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-white/34">
              {"Hoặc"}
            </span>
            <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.1),transparent)]" />
          </div>

          <div className="modal-item modal-surface rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 [animation-delay:0.2s]">
            <div className="mt-1 flex flex-col gap-3">
              <button
                className="modal-google-button flex w-full items-center justify-center gap-3 rounded-[1.2rem] border border-white/12 bg-[#121318] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#191b22]"
                type="button"
              >
                <GoogleIcon />
                {"Đăng nhập bằng Google"}
              </button>

              <button
                className="modal-facebook-button flex w-full items-center justify-center gap-3 rounded-[1.2rem] border border-white/12 bg-[linear-gradient(180deg,#1c56d8,#1846af)] px-4 py-3.5 text-sm font-semibold text-white transition hover:brightness-110"
                type="button"
              >
                <FacebookIcon />
                {"Đăng nhập bằng Facebook"}
              </button>
            </div>
          </div>

          <div className="modal-item flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-white/64 [animation-delay:0.28s]">
            <Link
              href={HOME_ROUTE}
              className="modal-link transition hover:text-white"
            >
              {"Đăng ký tài khoản"}
            </Link>
            <Link
              href={HOME_ROUTE}
              className="modal-link transition hover:text-white"
            >
              {"Quên mật khẩu"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateAccountModal({
  form,
  step,
  errorMessage,
  isSubmitting,
  avatarFile,
  avatarPreviewUrl,
  selectedPresetAvatar,
  onChange,
  onRoleChange,
  onAvatarFileSelect,
  onClearAvatar,
  onPresetAvatarSelect,
  onNextStep,
  onBackStep,
  onFinalSubmit,
  onClose,
  onAddGenre,
  onRemoveGenre,
  onToggleSuggestedGenre,
  onOpenSignIn,
}: CreateAccountModalProps) {
  const fullNameId = useId();
  const stageNameId = useId();
  const usernameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const genreInputId = useId();

  const [genreInput, setGenreInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeAvatarSrc = avatarPreviewUrl || selectedPresetAvatar;
  const displayName =
    (form.role === "CONTENT_LEAD" || form.role === "ARTIST") && form.stageName.trim()
      ? form.stageName.trim()
      : form.fullName || form.username || "Tài khoản Moodify";

  const userInitials = (
    (form.role === "CONTENT_LEAD" || form.role === "ARTIST") && form.stageName.trim()
      ? form.stageName
      : form.fullName || form.username || "M"
  )
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onAvatarFileSelect(files[0]);
    }
  };

  const handleGenreKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (genreInput.trim()) {
        onAddGenre(genreInput);
        setGenreInput("");
      }
    }
  };

  const handleAddGenreButtonClick = () => {
    if (genreInput.trim()) {
      onAddGenre(genreInput);
      setGenreInput("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      <button
        aria-label="Đóng modal tạo tài khoản"
        className="modal-backdrop absolute inset-0 bg-[rgba(4,4,7,0.85)] backdrop-blur-md"
        onClick={onClose}
        type="button"
      />

      <div className="modal-panel relative z-10 flex max-h-[92vh] w-full max-w-[1000px] flex-col overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(18,19,26,0.98),rgba(10,10,14,0.99))] shadow-[0_35px_120px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        {/* Background glow effects */}
        <div className="modal-orb absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,124,56,0.22),rgba(255,124,56,0.03)_60%,transparent_74%)]" />
        <div className="modal-orb absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(122,92,255,0.18),rgba(122,92,255,0.02)_60%,transparent_74%)] [animation-delay:0.4s]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(255,124,56,0.15),transparent_70%)]" />

        {/* Modal Top Bar */}
        <div className="relative flex items-center justify-between border-b border-white/8 px-6 py-4">
          <div className="flex items-center gap-3">
            {step === 2 ? (
              <button
                type="button"
                onClick={onBackStep}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/14 bg-white/5 text-white/70 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                title="Quay lại bước 1"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>
            ) : (
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#ff7c38] shadow-[0_0_8px_#ff7c38]" />
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.28em] text-[#ff7c38]">
                {step === 1 ? "Bước 1/2 • Thông tin tài khoản" : "Bước 2/2 • Ảnh đại diện"}
              </span>
            </div>
          </div>

          {/* Stepper indicator pills */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
            <span
              className={`flex h-5 items-center justify-center rounded-full px-2 text-[11px] font-semibold transition ${
                step === 1
                  ? "bg-[#ff7c38] text-white"
                  : "bg-emerald-500/20 text-emerald-400"
              }`}
            >
              {step > 1 ? "✓ Thông tin" : "1. Thông tin"}
            </span>
            <span className="text-white/20">→</span>
            <span
              className={`flex h-5 items-center justify-center rounded-full px-2 text-[11px] font-semibold transition ${
                step === 2
                  ? "bg-[#ff7c38] text-white"
                  : "text-white/40"
              }`}
            >
              2. Ảnh đại diện
            </span>
          </div>

          <button
            aria-label="Đóng"
            className="modal-close inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Modal Main Body */}
        {step === 1 ? (
          /* STEP 1: TWO-COLUMN STUDIO LAYOUT */
          <div className="relative flex flex-1 flex-col md:flex-row overflow-hidden">
            {/* LEFT COLUMN: Role selection & Branding & Quick Access */}
            <div className="w-full md:w-[340px] lg:w-[360px] shrink-0 border-b md:border-b-0 md:border-r border-white/8 bg-white/[0.015] p-5 sm:p-6 flex flex-col justify-between gap-5 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff7c38]/30 bg-[#ff7c38]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ff9359]">
                    Moodify Studio Pass
                  </span>
                  <h2 className="font-display mt-2 text-2xl font-bold uppercase tracking-[-0.02em] leading-tight text-white sm:text-3xl">
                    Join Moodify
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                    Chọn vai trò để mở khóa các đặc quyền âm nhạc riêng biệt trên Moodify.
                  </p>
                </div>

                {/* Role Selection Cards */}
                <div className="space-y-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                    Chọn vai trò của bạn:
                  </p>

                  {/* Listener Role Card */}
                  <button
                    type="button"
                    onClick={() => onRoleChange("USER")}
                    className={`group w-full text-left rounded-2xl border p-3.5 transition-all duration-200 cursor-pointer ${
                      form.role === "USER"
                        ? "border-white/30 bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.3)] ring-1 ring-white/20"
                        : "border-white/8 bg-white/[0.02] hover:border-white/16 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                            form.role === "USER"
                              ? "bg-white text-black font-bold shadow-md"
                              : "border border-white/10 bg-white/5 text-white/70 group-hover:text-white"
                          }`}
                        >
                          <UserRoleIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white">
                              Người nghe
                            </span>
                            <span className="rounded-full bg-white/15 px-2 py-0.2 text-[10px] font-medium text-white/80">
                              Free
                            </span>
                          </div>
                          <span className="text-[11px] text-white/50">User / Listener</span>
                        </div>
                      </div>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-black transition ${
                          form.role === "USER"
                            ? "bg-white text-black"
                            : "border border-white/20 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/55">
                      Khám phá âm nhạc theo tâm trạng, tạo playlist cá nhân & theo dõi các nghệ sĩ yêu thích.
                    </p>
                  </button>

                  {/* Content Lead Role Card */}
                  <button
                    type="button"
                    onClick={() => onRoleChange("CONTENT_LEAD")}
                    className={`group w-full text-left rounded-2xl border p-3.5 transition-all duration-200 cursor-pointer ${
                      form.role === "CONTENT_LEAD" || form.role === "ARTIST"
                        ? "border-[#ff7c38]/60 bg-gradient-to-br from-[#ff7c38]/18 to-[#ff5722]/10 shadow-[0_8px_30px_rgba(255,124,56,0.2)] ring-1 ring-[#ff7c38]/40"
                        : "border-white/8 bg-white/[0.02] hover:border-white/16 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                            form.role === "CONTENT_LEAD" || form.role === "ARTIST"
                              ? "bg-gradient-to-r from-[#ff7c38] to-[#ff5722] text-white font-bold shadow-[0_0_15px_rgba(255,124,56,0.4)]"
                              : "border border-white/10 bg-white/5 text-white/70 group-hover:text-white"
                          }`}
                        >
                          <ArtistRoleIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white">
                              Content Lead
                            </span>
                            <span className="rounded-full bg-[#ff7c38]/25 border border-[#ff7c38]/40 px-2 py-0.2 text-[10px] font-bold text-[#ff985f]">
                              Content Hub
                            </span>
                          </div>
                          <span className="text-[11px] text-white/50">Phụ trách Nội dung</span>
                        </div>
                      </div>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-black transition ${
                          form.role === "CONTENT_LEAD" || form.role === "ARTIST"
                            ? "bg-[#ff7c38] text-white shadow-[0_0_8px_#ff7c38]"
                            : "border border-white/20 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/60">
                      Đăng tải tác phẩm lossless, thiết lập thông tin hiển thị, quản lý bài hát & tiếp cận cộng đồng người nghe.
                    </p>
                  </button>
                </div>
              </div>

              {/* Quick social sign-up & Sign in link */}
              <div className="space-y-3 pt-2 border-t border-white/8">
                <div className="flex items-center justify-between text-[11px] text-white/45">
                  <span>Hoặc đăng ký nhanh với:</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="modal-google-button flex h-9 items-center justify-center gap-2 rounded-xl border border-white/12 bg-[#121318] px-3 text-xs font-semibold text-white transition hover:bg-[#191b22]"
                    type="button"
                  >
                    <GoogleIcon />
                    <span>Google</span>
                  </button>
                  <button
                    className="modal-facebook-button flex h-9 items-center justify-center gap-2 rounded-xl border border-white/12 bg-[linear-gradient(180deg,#1c56d8,#1846af)] px-3 text-xs font-semibold text-white transition hover:brightness-110"
                    type="button"
                  >
                    <FacebookIcon />
                    <span>Facebook</span>
                  </button>
                </div>

                <div className="text-center pt-1">
                  <span className="text-xs text-white/50">Đã có tài khoản? </span>
                  <button
                    type="button"
                    onClick={onOpenSignIn}
                    className="text-xs font-bold text-[#ff7c38] hover:underline"
                  >
                    Đăng nhập ngay
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Direct form input with Genres / GenresRaw field */}
            <div className="flex-1 p-5 sm:p-6 md:p-7 overflow-y-auto max-h-[calc(100vh-8rem)] md:max-h-[660px] custom-scrollbar flex flex-col justify-between">
              <form className="space-y-4" onSubmit={onNextStep}>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Thông tin hồ sơ & Đăng nhập
                  </h3>
                  <p className="text-xs text-white/55">
                    Điền đầy đủ các thông tin bên dưới để tiếp tục sang bước chọn ảnh đại diện.
                  </p>
                </div>

                {/* 2-Column Grid of Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-semibold text-white/80"
                      htmlFor={fullNameId}
                    >
                      Họ và tên <span className="text-[#ff7c38]">*</span>
                    </label>
                    <input
                      className="modal-input w-full rounded-xl border border-white/10 bg-[#101116] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none placeholder:text-white/28 focus:border-[#ff7c38]/60 focus:bg-[#13151c]"
                      id={fullNameId}
                      name="fullName"
                      onChange={onChange}
                      placeholder="Nguyễn Văn A"
                      type="text"
                      value={form.fullName}
                      required
                    />
                  </div>

                  {/* Username */}
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-semibold text-white/80"
                      htmlFor={usernameId}
                    >
                      Tên đăng nhập <span className="text-[#ff7c38]">*</span>
                    </label>
                    <input
                      className="modal-input w-full rounded-xl border border-white/10 bg-[#101116] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none placeholder:text-white/28 focus:border-[#ff7c38]/60 focus:bg-[#13151c]"
                      id={usernameId}
                      name="username"
                      onChange={onChange}
                      placeholder="moodify_user"
                      type="text"
                      value={form.username}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-semibold text-white/80"
                      htmlFor={emailId}
                    >
                      Địa chỉ Email <span className="text-[#ff7c38]">*</span>
                    </label>
                    <input
                      className="modal-input w-full rounded-xl border border-white/10 bg-[#101116] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none placeholder:text-white/28 focus:border-[#ff7c38]/60 focus:bg-[#13151c]"
                      id={emailId}
                      name="email"
                      onChange={onChange}
                      placeholder="ban@example.com"
                      type="email"
                      value={form.email}
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-semibold text-white/80"
                      htmlFor={phoneId}
                    >
                      Số điện thoại <span className="text-[#ff7c38]">*</span>
                    </label>
                    <input
                      className="modal-input w-full rounded-xl border border-white/10 bg-[#101116] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none placeholder:text-white/28 focus:border-[#ff7c38]/60 focus:bg-[#13151c]"
                      id={phoneId}
                      name="phone"
                      onChange={onChange}
                      placeholder="0987654321"
                      type="tel"
                      value={form.phone}
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-semibold text-white/80"
                      htmlFor={passwordId}
                    >
                      Mật khẩu <span className="text-[#ff7c38]">*</span>
                    </label>
                    <input
                      className="modal-input w-full rounded-xl border border-white/10 bg-[#101116] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none placeholder:text-white/28 focus:border-[#ff7c38]/60 focus:bg-[#13151c]"
                      id={passwordId}
                      name="password"
                      onChange={onChange}
                      placeholder="Tối thiểu 6 ký tự"
                      type="password"
                      value={form.password}
                      required
                    />
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-semibold text-white/80"
                      htmlFor={confirmPasswordId}
                    >
                      Xác nhận mật khẩu <span className="text-[#ff7c38]">*</span>
                    </label>
                    <input
                      className="modal-input w-full rounded-xl border border-white/10 bg-[#101116] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none placeholder:text-white/28 focus:border-[#ff7c38]/60 focus:bg-[#13151c]"
                      id={confirmPasswordId}
                      name="confirmPassword"
                      onChange={onChange}
                      placeholder="Nhập lại mật khẩu"
                      type="password"
                      value={form.confirmPassword}
                      required
                    />
                  </div>
                </div>

                {/* CONTENT LEAD EXCLUSIVE SECTION: STAGE NAME & GENRES / GENRES RAW */}
                {form.role === "CONTENT_LEAD" || form.role === "ARTIST" ? (
                  <div className="rounded-2xl border border-[#ff7c38]/35 bg-gradient-to-b from-[#ff7c38]/[0.08] to-[#ff7c38]/[0.02] p-3.5 sm:p-4 space-y-3.5 transition-all">
                    {/* Stage Name */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          className="text-xs font-bold text-white flex items-center gap-1.5"
                          htmlFor={stageNameId}
                        >
                          <ArtistRoleIcon className="h-3.5 w-3.5 text-[#ff7c38]" />
                          Nghệ danh / Tên hiển thị đại diện <span className="text-[#ff7c38]">*</span>
                        </label>
                        <span className="rounded-full bg-[#ff7c38]/20 px-2 py-0.5 text-[10px] font-bold text-[#ff985f] border border-[#ff7c38]/30">
                          Bắt buộc cho Content Lead
                        </span>
                      </div>
                      <input
                        className="modal-input w-full rounded-xl border border-[#ff7c38]/35 bg-[#101116] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none placeholder:text-white/30 focus:border-[#ff7c38] focus:bg-[#14161f]"
                        id={stageNameId}
                        name="stageName"
                        onChange={onChange}
                        placeholder="VD: Sơn Tùng M-TP, Đen Vâu, Suboi, Vũ..."
                        type="text"
                        value={form.stageName}
                        required={form.role === "CONTENT_LEAD" || form.role === "ARTIST"}
                      />
                    </div>

                    {/* GENRES & GENRES RAW FIELD */}
                    <div className="space-y-2 pt-1 border-t border-[#ff7c38]/20">
                      <div className="flex items-center justify-between">
                        <label
                          className="text-xs font-bold text-white flex items-center gap-1.5"
                          htmlFor={genreInputId}
                        >
                          <svg
                            className="h-3.5 w-3.5 text-[#ff7c38]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                            />
                          </svg>
                          Thể loại âm nhạc sở trường
                        </label>
                        <span className="text-[10px] text-white/50">
                          Đồng bộ <code className="text-[#ff985f]">genres</code> & <code className="text-[#ff985f]">genresRaw</code>
                        </span>
                      </div>

                      {/* Tag Input and Add Button */}
                      <div className="flex gap-2">
                        <input
                          className="modal-input flex-1 rounded-xl border border-white/12 bg-[#101116] px-3.5 py-2 text-xs sm:text-sm text-white outline-none placeholder:text-white/30 focus:border-[#ff7c38] focus:bg-[#14161f]"
                          id={genreInputId}
                          onChange={(e) => setGenreInput(e.target.value)}
                          onKeyDown={handleGenreKeyDown}
                          placeholder="Nhập thể loại (VD: Pop, R&B, Ballad, Indie, Rap...) rồi nhấn Enter"
                          type="text"
                          value={genreInput}
                        />
                        <button
                          type="button"
                          onClick={handleAddGenreButtonClick}
                          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#ff7c38] to-[#ff5722] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:brightness-110 active:scale-95 cursor-pointer shrink-0"
                        >
                          + Thêm
                        </button>
                      </div>

                      {/* Selected Genres Chips Display */}
                      {form.genresRaw && form.genresRaw.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-medium text-white/60 mr-1">
                            Đã chọn ({form.genresRaw.length}):
                          </span>
                          {form.genresRaw.map((rawGenre, idx) => (
                            <span
                              key={`${rawGenre}-${idx}`}
                              className="group inline-flex items-center gap-1.5 rounded-full border border-[#ff7c38]/50 bg-[#ff7c38]/15 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#ff7c38]/25"
                            >
                              <span>{rawGenre}</span>
                              <button
                                type="button"
                                onClick={() => onRemoveGenre(rawGenre)}
                                className="h-3.5 w-3.5 rounded-full text-white/60 hover:text-white hover:bg-white/20 inline-flex items-center justify-center transition"
                                title={`Gỡ thể loại ${rawGenre}`}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-white/45 italic">
                          Chưa có thể loại nào được chọn. Nhập ở trên hoặc chọn nhanh từ danh sách đề xuất bên dưới:
                        </p>
                      )}

                      {/* Quick Suggestions Pills */}
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                          Gợi ý phổ biến (bấm để thêm/bỏ):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {SUGGESTED_GENRES.map((suggested) => {
                            const isSelected = form.genres.includes(
                              suggested.toLowerCase(),
                            );
                            return (
                              <button
                                key={suggested}
                                type="button"
                                onClick={() => onToggleSuggestedGenre(suggested)}
                                className={`rounded-lg px-2 py-1 text-[11px] font-medium transition cursor-pointer ${
                                  isSelected
                                    ? "bg-[#ff7c38] text-white font-bold shadow-[0_0_10px_rgba(255,124,56,0.3)] ring-1 ring-white/20"
                                    : "border border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                {isSelected ? `✓ ${suggested}` : `+ ${suggested}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* USER GU ÂM NHẠC (OPTIONAL) */
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/75">
                        Gu âm nhạc yêu thích (Tùy chọn)
                      </span>
                      <span className="text-[10px] text-white/40">
                        Cá nhân hóa playlist
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTED_GENRES.slice(0, 8).map((suggested) => {
                        const isSelected = form.genres.includes(
                          suggested.toLowerCase(),
                        );
                        return (
                          <button
                            key={suggested}
                            type="button"
                            onClick={() => onToggleSuggestedGenre(suggested)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                              isSelected
                                ? "bg-white text-black font-bold shadow-md"
                                : "border border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {isSelected ? `✓ ${suggested}` : `+ ${suggested}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Error message notification */}
                {errorMessage ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                ) : null}

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    className="modal-primary-button w-full rounded-xl bg-gradient-to-r from-white via-white to-white/90 py-3.5 text-xs sm:text-sm font-bold text-[#0c0d12] shadow-lg transition hover:scale-[1.005] hover:brightness-105 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                    type="submit"
                  >
                    <span>Tiếp tục: Chọn ảnh đại diện</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* STEP 2: AVATAR SELECTION (TWO-COLUMN STUDIO LAYOUT) */
          <div className="relative flex flex-1 flex-col md:flex-row overflow-hidden">
            {/* Left Preview Box */}
            <div className="w-full md:w-[320px] shrink-0 border-b md:border-b-0 md:border-r border-white/8 bg-white/[0.015] p-6 flex flex-col items-center justify-center text-center gap-4">
              <div className="relative">
                <div className="relative h-28 w-28 sm:h-32 sm:w-32 overflow-hidden rounded-full border-2 border-white/20 bg-[#14161f] shadow-[0_0_40px_rgba(255,124,56,0.25)] ring-4 ring-[#ff7c38]/30">
                  {activeAvatarSrc ? (
                    <img
                      alt="Ảnh đại diện đã chọn"
                      className="h-full w-full object-cover"
                      src={activeAvatarSrc}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2a1b4e] via-[#1a1c2e] to-[#ff7c38]/30 text-2xl font-black uppercase text-white/90">
                      {userInitials}
                    </div>
                  )}
                </div>

                {activeAvatarSrc ? (
                  <button
                    type="button"
                    onClick={onClearAvatar}
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-[#16171d] text-white/80 shadow-md transition hover:bg-red-500/20 hover:text-red-400 cursor-pointer"
                    title="Gỡ ảnh đại diện"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div>
                <p className="text-base font-bold text-white">
                  {displayName}
                </p>
                {form.role === "CONTENT_LEAD" || form.role === "ARTIST" ? (
                  <p className="text-xs text-white/50 mt-0.5">
                    Họ tên: {form.fullName}
                  </p>
                ) : null}
                <p className="text-xs text-white/40 mt-0.5">
                  @{form.username || "username"}
                </p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    form.role === "CONTENT_LEAD" || form.role === "ARTIST"
                      ? "bg-gradient-to-r from-[#ff7c38]/20 to-[#ff5722]/20 text-[#ff8e52] border border-[#ff7c38]/30"
                      : "bg-white/10 text-white/80 border border-white/12"
                  }`}
                >
                  {form.role === "CONTENT_LEAD" || form.role === "ARTIST" ? (
                    <>
                      <ArtistRoleIcon className="h-3 w-3" />
                      Content Lead
                    </>
                  ) : (
                    <>
                      <UserRoleIcon className="h-3 w-3" />
                      Người nghe
                    </>
                  )}
                </span>
                {form.genresRaw && form.genresRaw.length > 0
                  ? form.genresRaw.slice(0, 3).map((g, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/60 border border-white/10"
                      >
                        {g}
                      </span>
                    ))
                  : null}
              </div>
            </div>

            {/* Right Options Box */}
            <div className="flex-1 p-6 md:p-7 overflow-y-auto max-h-[calc(100vh-8rem)] md:max-h-[660px] custom-scrollbar flex flex-col justify-between gap-5">
              <div className="space-y-4">
                {/* Upload from device */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <input
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInputChange}
                    ref={fileInputRef}
                    type="file"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">
                        Tải ảnh từ máy tính / thiết bị
                      </p>
                      <p className="text-xs text-white/50">
                        {avatarFile
                          ? `Đã chọn: ${avatarFile.name}`
                          : "Hỗ trợ JPG, PNG hoặc WEBP."}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/14 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition hover:border-white/28 hover:bg-white/18 cursor-pointer"
                      >
                        <CameraUploadIcon className="h-4 w-4" />
                        {avatarFile ? "Chọn ảnh khác" : "Chọn file ảnh"}
                      </button>

                      {avatarFile ? (
                        <button
                          type="button"
                          onClick={onClearAvatar}
                          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                          title="Xoá ảnh đã chọn"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Moodify Preset Avatars */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-white">
                      Hoặc chọn từ bộ sưu tập Moodify
                    </p>
                    <span className="text-[11px] text-white/45">
                      Bấm để chọn ngay
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                    {PRESET_AVATARS.map((preset) => {
                      const isSelected = selectedPresetAvatar === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => onPresetAvatarSelect(preset.url)}
                          className={`group relative flex flex-col items-center gap-1 rounded-xl p-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-white/10 ring-2 ring-[#ff7c38] ring-offset-2 ring-offset-[#101116] scale-105"
                              : "hover:bg-white/5 hover:scale-105"
                          }`}
                          title={preset.name}
                        >
                          <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/12 sm:h-15 sm:w-15">
                            <img
                              alt={preset.name}
                              className="h-full w-full object-cover transition group-hover:scale-110"
                              src={preset.url}
                            />
                            {isSelected ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-[#ff7c38]/40">
                                <span className="text-sm font-black text-white">✓</span>
                              </div>
                            ) : null}
                          </div>
                          <span className="truncate text-[10px] text-white/60 group-hover:text-white max-w-[58px]">
                            {preset.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {errorMessage ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200">
                    {errorMessage}
                  </div>
                ) : null}
              </div>

              {/* Actions Footer */}
              <div className="space-y-2 pt-2">
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={onBackStep}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/14 bg-white/5 px-4 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Quay lại
                  </button>

                  <button
                    type="button"
                    onClick={onFinalSubmit}
                    disabled={isSubmitting}
                    className="modal-primary-button flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-white via-white to-white/90 px-5 text-xs sm:text-sm font-bold text-[#0c0d12] shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40 cursor-pointer"
                  >
                    {isSubmitting ? (
                      "Đang tạo tài khoản & lưu dữ liệu..."
                    ) : (
                      <>
                        <span>Hoàn tất & Gia nhập Moodify</span>
                        <ArrowRightIcon className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={onFinalSubmit}
                    disabled={isSubmitting}
                    className="text-xs text-white/45 transition hover:text-white hover:underline cursor-pointer"
                  >
                    Bỏ qua bước này và hoàn tất ngay
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M21.805 12.23c0-.69-.06-1.19-.19-1.71H12.2v3.24h5.53c-.11.8-.73 2-2.11 2.81l-.02.11l3.05 2.32l.21.02c1.9-1.72 2.95-4.24 2.95-6.79Z"
        fill="#4285F4"
      />
      <path
        d="M12.2 21.94c2.7 0 4.97-.87 6.63-2.37l-3.16-2.44c-.85.58-2 .98-3.47.98c-2.64 0-4.88-1.72-5.68-4.11l-.11.01l-3.18 2.41l-.04.1c1.65 3.2 5.03 5.42 9.01 5.42Z"
        fill="#34A853"
      />
      <path
        d="M6.52 14c-.21-.61-.34-1.26-.34-1.94c0-.68.12-1.33.33-1.94l-.01-.13l-3.22-2.45l-.11.05A9.75 9.75 0 0 0 2.15 12c0 1.57.38 3.06 1.04 4.4l3.33-2.4Z"
        fill="#FBBC05"
      />
      <path
        d="M12.2 5.89c1.86 0 3.11.78 3.83 1.44l2.8-2.68C17.15 3.08 14.9 2.06 12.2 2.06c-3.98 0-7.36 2.22-9.01 5.42l3.34 2.53c.8-2.39 3.04-4.12 5.67-4.12Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.03 4.39 11.03 10.12 11.93v-8.44H7.08v-3.5h3.04V9.39c0-3.02 1.78-4.69 4.5-4.69c1.3 0 2.67.24 2.67.24v2.96h-1.5c-1.48 0-1.94.93-1.94 1.88v2.28h3.3l-.53 3.5h-2.77V24C19.61 23.1 24 18.1 24 12.07Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M6 9l6 6l6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function UserRoleIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function ArtistRoleIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function CameraUploadIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
