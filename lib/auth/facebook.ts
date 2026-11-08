"use client";

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: any;
  }
}

const FACEBOOK_APP_ID =
  process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "2981895912150587";

let fbSdkPromise: Promise<any> | null = null;

export function loadFacebookSdk(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Môi trường trình duyệt không khả dụng"));
  }

  if (window.FB) {
    return Promise.resolve(window.FB);
  }

  if (fbSdkPromise) {
    return fbSdkPromise;
  }

  fbSdkPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = function () {
      try {
        window.FB.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: false,
          version: "v26.0",
        });
        resolve(window.FB);
      } catch (err) {
        document.getElementById("facebook-jssdk")?.remove();
        fbSdkPromise = null;
        reject(err);
      }
    };

    // A failed script load can leave a dead element behind. Remove it before
    // retrying so a new login attempt does not wait on a promise that never settles.
    document.getElementById("facebook-jssdk")?.remove();

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/vi_VN/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => {
      script.remove();
      fbSdkPromise = null;
      reject(
        new Error(
          "Không thể tải Facebook SDK. Vui lòng kiểm tra kết nối mạng hoặc tắt tiện ích chặn quảng cáo (AdBlock)."
        )
      );
    };

    document.head.appendChild(script);
  });

  return fbSdkPromise;
}

export async function loginWithFacebookSdk(): Promise<string> {
  const FB = await loadFacebookSdk();

  return new Promise((resolve, reject) => {
    FB.login(
      (response: any) => {
        if (response?.authResponse?.accessToken) {
          resolve(response.authResponse.accessToken);
        } else {
          reject(new Error("Đăng nhập Facebook đã bị hủy hoặc không được cấp quyền."));
        }
      },
      { scope: "public_profile,email" }
    );
  });
}
