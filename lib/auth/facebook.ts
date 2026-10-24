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
          version: "v19.0",
        });
        resolve(window.FB);
      } catch (err) {
        reject(err);
      }
    };

    if (document.getElementById("facebook-jssdk")) {
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/vi_VN/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => {
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
