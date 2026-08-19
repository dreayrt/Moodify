"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useId,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  clearAuthSession,
  getCurrentUser,
  getStoredAuthSession,
  getValidAccessToken,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  saveAuthSession,
  type UserProfileResponse,
} from "@/lib/auth-client";

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
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

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
    image: "/banners/banner-01.svg",
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
    image: "/banners/banner-02.svg",
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
    image: "/banners/banner-03.svg",
    artPrompt:
      "Music culture collage banner with multiple panels, underground artists, warm flash photography, black background, luxury streaming platform, dramatic contrast, composition leaves room for text on left, no text",
  },
];

const emptyCreateAccountForm: CreateAccountForm = {
  fullName: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [showCreateFields, setShowCreateFields] = useState(false);
  const [authUser, setAuthUser] = useState<UserProfileResponse | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [createAccountError, setCreateAccountError] = useState<string | null>(
    null
  );
  const [isSubmittingSignIn, setIsSubmittingSignIn] = useState(false);
  const [isSubmittingCreateAccount, setIsSubmittingCreateAccount] =
    useState(false);
  const [isHydratingSession, setIsHydratingSession] = useState(true);
  const [credentials, setCredentials] = useState<SignInCredentials>({
    username: "",
    password: "",
  });
  const [createAccountForm, setCreateAccountForm] =
    useState<CreateAccountForm>(emptyCreateAccountForm);

  const router = useRouter();

  const advanceSlide = useEffectEvent(() => {
    setActiveIndex((current) => (current + 1) % heroSlides.length);
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      advanceSlide();
    }, 5500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const hydrateSession = async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        setIsHydratingSession(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser(accessToken);
        setAuthUser(currentUser);
      } catch {
        clearAuthSession();
      } finally {
        setIsHydratingSession(false);
      }
    };

    void hydrateSession();
  }, []);

  useEffect(() => {
    if (!isSignInOpen && !isCreateAccountOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSignInOpen(false);
        setIsCreateAccountOpen(false);
        setShowCreateFields(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCreateAccountOpen, isSignInOpen]);

  const handleCredentialChange = ({
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

        if (currentUser.role === "USER") {
          router.push("/dashboard");
        } else {
          setAuthMessage(
            `Xin chao ${currentUser.fullName}, ban da dang nhap thanh cong.`
          );
        }
      } catch (error) {
        setSignInError(
          error instanceof Error ? error.message : "Dang nhap that bai"
        );
      } finally {
        setIsSubmittingSignIn(false);
      }
    };

    void submitSignIn();
  };

  const handleCreateAccountSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateAccountError(null);
    setAuthMessage(null);

    const submitCreateAccount = async () => {
      setIsSubmittingCreateAccount(true);

      try {
        const auth = await registerRequest({
          fullName: createAccountForm.fullName.trim(),
          phone: createAccountForm.phone.trim(),
          email: createAccountForm.email.trim(),
          username: createAccountForm.username.trim(),
          password: createAccountForm.password,
          confirmPassword: createAccountForm.confirmPassword,
          role: "USER",
        });

        saveAuthSession(auth);
        const currentUser = await getCurrentUser(auth.accessToken);
        setAuthUser(currentUser);
        setCreateAccountForm(emptyCreateAccountForm);
        setShowCreateFields(false);
        setIsCreateAccountOpen(false);

        if (currentUser.role === "USER") {
          router.push("/dashboard");
        } else {
          setAuthMessage(
            `Tai khoan da duoc tao thanh cong cho ${currentUser.fullName}.`
          );
        }
      } catch (error) {
        setCreateAccountError(
          error instanceof Error ? error.message : "Tao tai khoan that bai"
        );
      } finally {
        setIsSubmittingCreateAccount(false);
      }
    };

    void submitCreateAccount();
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
    setCreateAccountError(null);
  };

  const handleLogout = () => {
    const submitLogout = async () => {
      const session = getStoredAuthSession();
      clearAuthSession();
      setAuthUser(null);
      setAuthMessage("Ban da dang xuat.");

      if (!session) {
        return;
      }

      try {
        await logoutRequest(session.refreshToken);
      } catch {
        // Stateless backend may already consider the client logged out.
      }
    };

    void submitLogout();
  };

  const isSignInComplete =
    credentials.username.trim().length > 0 &&
    credentials.password.trim().length > 0;

  const isCreateFormComplete =
    createAccountForm.fullName.trim().length > 0 &&
    createAccountForm.username.trim().length > 0 &&
    createAccountForm.email.trim().length > 0 &&
    createAccountForm.phone.trim().length > 0 &&
    createAccountForm.password.trim().length > 0 &&
    createAccountForm.confirmPassword.trim().length > 0;

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-[2.25rem] border border-white/8 bg-[#090909] shadow-[0_35px_110px_rgba(0,0,0,0.42)]">
        <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
          <div className="flex items-center gap-3 text-white">
            <LogoMark />
            <span className="text-xs font-semibold uppercase tracking-[0.32em] sm:text-sm">
              Moodify
            </span>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {authUser ? (
              <>
                <div className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm text-white/78">
                  {authUser.fullName}{" "}
                  <span className="ml-2 text-white/45">({authUser.role})</span>
                </div>
                <button
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#121212] transition hover:scale-[1.01]"
                  onClick={handleLogout}
                  type="button"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#121212] transition hover:scale-[1.01]"
                  onClick={openSignIn}
                  type="button"
                >
                  Sign in
                </button>
                <button
                  className="rounded-full border border-white/10 bg-black/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  onClick={openCreateAccount}
                  type="button"
                >
                  Create account
                </button>
                <button
                  className="text-sm font-semibold text-white/80 transition hover:text-white"
                  onClick={openSignIn}
                  type="button"
                >
                  For artists
                </button>
              </>
            )}
          </div>
        </header>

        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {heroSlides.map((slide) => (
            <article
              key={slide.id}
              className="relative min-h-[540px] w-full shrink-0 overflow-hidden"
            >
              <Image
                alt={slide.title.replace("\n", " ")}
                className="object-cover object-center"
                fill
                priority={slide.id === 1}
                sizes="(max-width: 768px) 100vw, 1280px"
                src={slide.image}
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,10,0.82)_0%,rgba(8,8,10,0.38)_45%,rgba(8,8,10,0.2)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,106,32,0.12),transparent_28%)]" />

              <div className="relative z-10 flex min-h-[540px] flex-col justify-end p-5 pt-28 sm:p-8 sm:pt-32">
                <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
                  <div className="max-w-[560px]">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-white/58">
                      {slide.eyebrow}
                    </p>
                    <h1 className="font-display whitespace-pre-line text-5xl font-black uppercase leading-[0.86] text-white sm:text-6xl lg:text-7xl">
                      {slide.title}
                    </h1>
                    <p className="mt-5 max-w-xl text-base leading-7 text-white/82 sm:text-lg">
                      {slide.description}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#111111] transition hover:scale-[1.01]">
                        {slide.primaryCta}
                      </button>
                      <button className="rounded-full border border-white/12 bg-white/8 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/12">
                        {slide.secondaryCta}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-6">
                    <div className="flex items-center gap-3">
                      {heroSlides.map((item, index) => (
                        <button
                          key={item.id}
                          aria-label={`Go to slide ${index + 1}`}
                          className={`h-3 w-3 rounded-full border transition ${
                            activeIndex === index
                              ? "border-white bg-white"
                              : "border-white/40 bg-transparent hover:border-white/70"
                          }`}
                          onClick={() => setActiveIndex(index)}
                          type="button"
                        />
                      ))}
                    </div>

                    <div className="max-w-[240px] rounded-[1.5rem] border border-white/10 bg-black/24 px-4 py-3 text-right backdrop-blur">
                      <p className="text-sm font-semibold text-white">
                        {slide.artist}
                      </p>
                      <p className="mt-1 text-sm text-white/64">{slide.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-5 py-4 text-sm text-[var(--text-secondary)]">
        <span className="font-semibold text-white">
          Banner prompts included:
        </span>{" "}
        each hero slide contains an <code>artPrompt</code> field so you can swap
        the SVG placeholders with AI-generated campaign images later.
      </div>

      <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] px-5 py-4 text-sm text-[var(--text-secondary)]">
        {isHydratingSession ? (
          <span className="text-white/70">Dang kiem tra phien dang nhap...</span>
        ) : authUser ? (
          <span className="text-white/80">
            Da ket noi backend auth. User hien tai:{" "}
            <strong className="font-semibold text-white">
              {authUser.username}
            </strong>
          </span>
        ) : (
          <span className="text-white/60">
            Chua dang nhap. Frontend da san sang goi API backend JWT.
          </span>
        )}

        {authMessage ? (
          <p className="mt-2 text-sm text-[#a8f0c9]">{authMessage}</p>
        ) : null}
      </div>

      {isSignInOpen ? (
        <SignInModal
          credentials={credentials}
          isFormComplete={isSignInComplete}
          errorMessage={signInError}
          isSubmitting={isSubmittingSignIn}
          onChange={handleCredentialChange}
          onClose={closeSignIn}
          onSubmit={handleSignInSubmit}
        />
      ) : null}

      {isCreateAccountOpen ? (
        <CreateAccountModal
          form={createAccountForm}
          isFormComplete={isCreateFormComplete}
          errorMessage={createAccountError}
          isSubmitting={isSubmittingCreateAccount}
          onChange={handleCreateAccountChange}
          onClose={closeCreateAccount}
          onSubmit={handleCreateAccountSubmit}
          onToggleFields={() => setShowCreateFields((current) => !current)}
          showFields={showCreateFields}
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
  errorMessage: string | null;
  isFormComplete: boolean;
  isSubmitting: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleFields: () => void;
  showFields: boolean;
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
              {"\u0110\u0103ng nh\u1eadp"}
            </p>
            <h2 className="font-display mt-3 text-3xl font-black uppercase leading-[0.92] text-white sm:text-[3.2rem]">
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
                  {"T\u00e0i kho\u1ea3n"}
                </label>
                <input
                  className="modal-input w-full rounded-2xl border border-white/10 bg-[#101116] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-white/22 focus:bg-[#14161c]"
                  id={accountId}
                  name="username"
                  onChange={onChange}
                  placeholder={"Nh\u1eadp email ho\u1eb7c t\u00ean t\u00e0i kho\u1ea3n"}
                  type="text"
                  value={credentials.username}
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-white/78"
                  htmlFor={passwordId}
                >
                  {"M\u1eadt kh\u1ea9u"}
                </label>
                <input
                  className="modal-input w-full rounded-2xl border border-white/10 bg-[#101116] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-white/22 focus:bg-[#14161c]"
                  id={passwordId}
                  name="password"
                  onChange={onChange}
                  placeholder={"Nh\u1eadp m\u1eadt kh\u1ea9u"}
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
                  ? "Dang dang nhap..."
                  : "\u0110\u0103ng nh\u1eadp"}
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
              {"Ho\u1eb7c"}
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
                {"\u0110\u0103ng nh\u1eadp b\u1eb1ng Google"}
              </button>

              <button
                className="modal-facebook-button flex w-full items-center justify-center gap-3 rounded-[1.2rem] border border-white/12 bg-[linear-gradient(180deg,#1c56d8,#1846af)] px-4 py-3.5 text-sm font-semibold text-white transition hover:brightness-110"
                type="button"
              >
                <FacebookIcon />
                {"\u0110\u0103ng nh\u1eadp b\u1eb1ng Facebook"}
              </button>
            </div>
          </div>

          <div className="modal-item flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-white/64 [animation-delay:0.28s]">
            <Link href="/" className="modal-link transition hover:text-white">
              {"\u0110\u0103ng k\u00fd t\u00e0i kho\u1ea3n"}
            </Link>
            <Link href="/" className="modal-link transition hover:text-white">
              {"Qu\u00ean m\u1eadt kh\u1ea9u"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateAccountModal({
  form,
  errorMessage,
  isFormComplete,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
  onToggleFields,
  showFields,
}: CreateAccountModalProps) {
  const fullNameId = useId();
  const usernameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-3 py-3 sm:px-4 sm:py-6 md:items-center md:px-6">
      <button
        aria-label={"Đóng modal tạo tài khoản"}
        className="modal-backdrop absolute inset-0 bg-[rgba(4,4,7,0.8)] backdrop-blur-[10px]"
        onClick={onClose}
        type="button"
      />

      <div className="modal-panel relative z-10 my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-[600px] flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,22,0.98),rgba(10,10,13,0.98))] shadow-[0_30px_100px_rgba(0,0,0,0.55)] sm:max-h-[calc(100vh-3rem)] sm:rounded-[2rem]">
        <div className="modal-orb absolute left-[-10%] top-[-12%] h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(255,124,56,0.18),rgba(255,124,56,0.02)_58%,transparent_72%)]" />
        <div className="modal-orb absolute bottom-[-20%] right-[-16%] h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(93,123,255,0.14),rgba(93,123,255,0.02)_56%,transparent_74%)] [animation-delay:0.35s]" />
        <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,rgba(255,124,56,0.18),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.035),transparent_26%,transparent_72%,rgba(255,255,255,0.02))]" />

        <div className="relative flex items-start justify-between gap-4 border-b border-white/8 px-4 py-5 sm:px-6 sm:py-6">
          <div className="modal-item min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/45">
              {"T\u1ea1o t\u00e0i kho\u1ea3n"}
            </p>
            <h2 className="font-display mt-3 text-2xl font-black uppercase leading-[0.96] text-white sm:text-[2.6rem]">
              Join Moodify
            </h2>
            <p className="mt-3 max-w-[420px] text-sm leading-6 text-white/64 sm:text-[15px]">
              {"B\u1eaft \u0111\u1ea7u v\u1edbi Google ho\u1eb7c Facebook. N\u1ebfu mu\u1ed1n t\u1ef1 nh\u1eadp th\u00f4ng tin, b\u1ea1n c\u00f3 th\u1ec3 b\u1eadt bi\u1ec3u m\u1eabu \u0111\u0103ng k\u00fd \u1edf ph\u00eda d\u01b0\u1edbi."}
            </p>
          </div>

          <button
            aria-label={"Đóng"}
            className="modal-close inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white sm:h-12 sm:w-12"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="modal-scrollable relative flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-4 sm:space-y-5">
            <div className="modal-item modal-surface rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4 sm:rounded-[1.6rem] sm:p-5 [animation-delay:0.06s]">
              <div className="mb-4">
                <p className="text-sm font-semibold text-white">
                  {"\u0110\u0103ng k\u00fd nhanh"}
                </p>
                <p className="mt-1 text-sm leading-6 text-white/56">
                  {"S\u1eed d\u1ee5ng t\u00e0i kho\u1ea3n m\u1ea1ng x\u00e3 h\u1ed9i \u0111\u1ec3 b\u1eaft \u0111\u1ea7u nhanh h\u01a1n."}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  className="modal-google-button flex min-h-12 w-full items-center justify-center gap-3 rounded-[1rem] border border-white/12 bg-[#121318] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#191b22] sm:rounded-[1.2rem]"
                  type="button"
                >
                  <GoogleIcon />
                  {"\u0110\u0103ng k\u00fd b\u1eb1ng Google"}
                </button>

                <button
                  className="modal-facebook-button flex min-h-12 w-full items-center justify-center gap-3 rounded-[1rem] border border-white/12 bg-[linear-gradient(180deg,#1c56d8,#1846af)] px-4 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 sm:rounded-[1.2rem]"
                  type="button"
                >
                  <FacebookIcon />
                  {"\u0110\u0103ng k\u00fd b\u1eb1ng Facebook"}
                </button>
              </div>
            </div>

            <div className="modal-item modal-surface rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 sm:rounded-[1.6rem] sm:p-5 [animation-delay:0.14s]">
              <button
                aria-expanded={showFields}
                className="group flex w-full items-start justify-between gap-4 text-left"
                onClick={onToggleFields}
                type="button"
              >
                <div className="min-w-0">
                  <p className="text-base font-semibold text-white">
                    {"Bi\u1ec3u m\u1eabu \u0111\u0103ng k\u00fd th\u1ee7 c\u00f4ng"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-white/56">
                    {"\u0110i\u1ec1n \u0111\u1ea7y \u0111\u1ee7 th\u00f4ng tin t\u00e0i kho\u1ea3n n\u1ebfu b\u1ea1n mu\u1ed1n t\u1ea1o t\u00e0i kho\u1ea3n theo c\u00e1ch th\u1ee7 c\u00f4ng."}
                  </p>
                </div>
                <span
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition duration-300 ${
                    showFields
                      ? "rotate-180 border-white/18 bg-white/10 text-white"
                      : "group-hover:border-white/16 group-hover:bg-white/8 group-hover:text-white"
                  }`}
                >
                  <ChevronIcon />
                </span>
              </button>

              <div
                className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
                  showFields
                    ? "mt-5 grid-rows-[1fr] opacity-100"
                    : "mt-0 grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <form className="space-y-4 pt-1 sm:space-y-5" onSubmit={onSubmit}>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2 lg:col-span-2">
                        <label
                          className="text-sm font-medium text-white/78"
                          htmlFor={fullNameId}
                        >
                          {"H\u1ecd v\u00e0 t\u00ean"}
                        </label>
                        <input
                          className="modal-input w-full rounded-[1rem] border border-white/10 bg-[#101116] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 sm:rounded-2xl"
                          id={fullNameId}
                          name="fullName"
                          onChange={onChange}
                          placeholder={"Nh\u1eadp h\u1ecd v\u00e0 t\u00ean"}
                          type="text"
                          value={form.fullName}
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-white/78"
                          htmlFor={usernameId}
                        >
                          {"T\u00ean \u0111\u0103ng nh\u1eadp"}
                        </label>
                        <input
                          className="modal-input w-full rounded-[1rem] border border-white/10 bg-[#101116] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 sm:rounded-2xl"
                          id={usernameId}
                          name="username"
                          onChange={onChange}
                          placeholder={"Nh\u1eadp t\u00ean \u0111\u0103ng nh\u1eadp"}
                          type="text"
                          value={form.username}
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-white/78"
                          htmlFor={phoneId}
                        >
                          {"S\u1ed1 \u0111i\u1ec7n tho\u1ea1i"}
                        </label>
                        <input
                          className="modal-input w-full rounded-[1rem] border border-white/10 bg-[#101116] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 sm:rounded-2xl"
                          id={phoneId}
                          name="phone"
                          onChange={onChange}
                          placeholder={"Nh\u1eadp s\u1ed1 \u0111i\u1ec7n tho\u1ea1i"}
                          type="tel"
                          value={form.phone}
                        />
                      </div>

                      <div className="space-y-2 lg:col-span-2">
                        <label
                          className="text-sm font-medium text-white/78"
                          htmlFor={emailId}
                        >
                          {"\u0110\u1ecba ch\u1ec9 email"}
                        </label>
                        <input
                          className="modal-input w-full rounded-[1rem] border border-white/10 bg-[#101116] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 sm:rounded-2xl"
                          id={emailId}
                          name="email"
                          onChange={onChange}
                          placeholder={"Nh\u1eadp \u0111\u1ecba ch\u1ec9 email"}
                          type="email"
                          value={form.email}
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-white/78"
                          htmlFor={passwordId}
                        >
                          {"M\u1eadt kh\u1ea9u"}
                        </label>
                        <input
                          className="modal-input w-full rounded-[1rem] border border-white/10 bg-[#101116] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 sm:rounded-2xl"
                          id={passwordId}
                          name="password"
                          onChange={onChange}
                          placeholder={"Nh\u1eadp m\u1eadt kh\u1ea9u"}
                          type="password"
                          value={form.password}
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-white/78"
                          htmlFor={confirmPasswordId}
                        >
                          {"X\u00e1c nh\u1eadn m\u1eadt kh\u1ea9u"}
                        </label>
                        <input
                          className="modal-input w-full rounded-[1rem] border border-white/10 bg-[#101116] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 sm:rounded-2xl"
                          id={confirmPasswordId}
                          name="confirmPassword"
                          onChange={onChange}
                          placeholder={"Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u"}
                          type="password"
                          value={form.confirmPassword}
                        />
                      </div>
                    </div>

                    <button
                      className="modal-primary-button w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#111111] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:bg-white/18 disabled:text-white/38 disabled:hover:scale-100"
                      disabled={!isFormComplete || isSubmitting}
                      type="submit"
                    >
                      {isSubmitting
                        ? "Dang tao tai khoan..."
                        : "T\u1ea1o t\u00e0i kho\u1ea3n"}
                    </button>
                  </form>

                  {errorMessage ? (
                    <p className="mt-4 rounded-2xl border border-[#ff8b8b]/20 bg-[#ff8b8b]/8 px-4 py-3 text-sm text-[#ffb1b1]">
                      {errorMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <svg aria-hidden="true" className="h-8 w-8" fill="none" viewBox="0 0 32 32">
      <path
        d="M4 18.2a2 2 0 012-2h1v8H6a2 2 0 01-2-2v-4zm4-4.3a2 2 0 012-2h1v12H10a2 2 0 01-2-2V13.9zm4-3.2a2 2 0 012-2h1v15.2h-1a2 2 0 01-2-2V10.7zm4-3.2a2 2 0 012-2h1v18.4h-1a2 2 0 01-2-2V7.5zm4 2.4a8 8 0 010 16H8.8v-3.4H20a4.6 4.6 0 000-9.2h-1.2V9.9H20z"
        fill="currentColor"
      />
    </svg>
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
