/**
 * Tiện ích định danh thiết bị đăng nhập người dùng (Moodify Device Manager).
 * Lưu trữ deviceUuid cố định trên trình duyệt/thiết bị để nhận diện phiên làm việc.
 */

export type DevicePlatform = "ANDROID" | "IOS" | "OTHER";

export interface DeviceIdentity {
  deviceUuid: string;
  platform: DevicePlatform;
  deviceName: string;
}

const DEVICE_UUID_KEY = "moodify_device_uuid";

export function getDeviceIdentity(): DeviceIdentity {
  if (typeof window === "undefined") {
    return {
      deviceUuid: "server-render-device",
      platform: "OTHER",
      deviceName: "Web Client",
    };
  }

  // 1. Lấy hoặc tạo mới deviceUuid vĩnh viễn trong localStorage
  let deviceUuid = window.localStorage.getItem(DEVICE_UUID_KEY);
  if (!deviceUuid || deviceUuid.trim() === "") {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      deviceUuid = crypto.randomUUID();
    } else {
      deviceUuid = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    }
    try {
      window.localStorage.setItem(DEVICE_UUID_KEY, deviceUuid);
    } catch (_) {}
  }

  // 2. Nhận diện Platform (ANDROID, IOS, OTHER) khớp với ENUM backend
  const ua = navigator.userAgent || "";
  let platform: DevicePlatform = "OTHER";

  if (/Android/i.test(ua)) {
    platform = "ANDROID";
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    platform = "IOS";
  } else {
    platform = "OTHER";
  }

  // 3. Nhận diện Tên thiết bị thân thiện (Device Name)
  let browser = "Trình duyệt Web";
  if (/Edg\//i.test(ua)) {
    browser = "Microsoft Edge";
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browser = "Google Chrome";
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = "Apple Safari";
  } else if (/Firefox\//i.test(ua)) {
    browser = "Mozilla Firefox";
  } else if (/Opera|OPR\//i.test(ua)) {
    browser = "Opera";
  }

  let os = "Máy tính";
  if (/Windows NT 10.0/i.test(ua)) os = "Windows 10/11";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua) && !/Android/i.test(ua)) os = "Linux";
  else if (/Android/i.test(ua)) os = "Thiết bị Android";
  else if (/iPhone/i.test(ua)) os = "iPhone";
  else if (/iPad/i.test(ua)) os = "iPad";

  const deviceName = `${browser} trên ${os}`;

  return {
    deviceUuid,
    platform,
    deviceName,
  };
}

export function getCurrentDeviceUuid(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(DEVICE_UUID_KEY) || "";
  } catch (_) {
    return "";
  }
}
