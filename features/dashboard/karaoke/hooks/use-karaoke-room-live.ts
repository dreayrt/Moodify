"use client";

import { useEffect, useRef, useState } from "react";
import { getValidAccessToken } from "@/lib/auth/auth-client";
import { getCurrentDeviceUuid } from "@/lib/auth/device-helper";
import { getKaraokeRoomSocketUrl } from "@/lib/api-client";

type LiveScope = "rooms" | "room";

type LiveEvent = {
  type: string;
  roomId?: number;
  code?: string;
};

type UseKaraokeRoomLiveOptions = {
  scope: LiveScope;
  roomId?: number;
  enabled: boolean;
  beforeConnect?: () => Promise<void>;
  onEvent?: (event: LiveEvent) => boolean | void;
  onSubscribed?: () => void;
  onError?: (error: Error) => void;
};

export function useKaraokeRoomLive({
  scope,
  roomId,
  enabled,
  beforeConnect,
  onEvent,
  onSubscribed,
  onError,
}: UseKaraokeRoomLiveOptions) {
  const [connected, setConnected] = useState(false);
  const callbacks = useRef({ beforeConnect, onEvent, onSubscribed, onError });

  useEffect(() => {
    callbacks.current = { beforeConnect, onEvent, onSubscribed, onError };
  }, [beforeConnect, onEvent, onSubscribed, onError]);

  useEffect(() => {
    if (!enabled || (scope === "room" && !roomId)) {
      return;
    }

    let stopped = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let heartbeatTimer: number | undefined;
    let connectionTimeout: number | undefined;
    let subscriptionTimeout: number | undefined;
    let attempts = 0;

    const connect = async () => {
      try {
        await callbacks.current.beforeConnect?.();
        const accessToken = await getValidAccessToken();
        if (!accessToken) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        if (stopped) return;

        const currentSocket = new WebSocket(getKaraokeRoomSocketUrl());
        socket = currentSocket;
        connectionTimeout = window.setTimeout(() => {
          if (currentSocket.readyState === WebSocket.CONNECTING) {
            currentSocket.close(4000, "connection timeout");
          }
        }, 5000);
        currentSocket.onopen = () => {
          if (connectionTimeout !== undefined) window.clearTimeout(connectionTimeout);
          connectionTimeout = undefined;
          const deviceUuid = typeof window === "undefined" ? "" : getCurrentDeviceUuid();
          currentSocket.send(JSON.stringify({
            type: scope === "rooms" ? "subscribeRooms" : "subscribeRoom",
            ...(scope === "room" ? { roomId } : {}),
            accessToken,
            deviceUuid,
          }));
          subscriptionTimeout = window.setTimeout(() => {
            if (currentSocket.readyState === WebSocket.OPEN) {
              currentSocket.close(4000, "subscription timeout");
            }
          }, 5000);
        };
        currentSocket.onmessage = (message) => {
          let event: LiveEvent;
          try {
            event = JSON.parse(String(message.data)) as LiveEvent;
          } catch {
            return;
          }
          if (event.type === "subscribed") {
            if (subscriptionTimeout !== undefined) window.clearTimeout(subscriptionTimeout);
            subscriptionTimeout = undefined;
            attempts = 0;
            setConnected(true);
            callbacks.current.onSubscribed?.();
            if (heartbeatTimer !== undefined) window.clearInterval(heartbeatTimer);
            heartbeatTimer = window.setInterval(() => {
              if (currentSocket.readyState === WebSocket.OPEN) {
                currentSocket.send(JSON.stringify({ type: "heartbeat" }));
              }
            }, 20_000);
            return;
          }
          if (event.type === "heartbeat.ack") return;
          if (event.type === "error") {
            callbacks.current.onError?.(new Error(event.code || "Không thể kết nối phòng."));
            currentSocket.close(1008, event.code || "subscription rejected");
            return;
          }
          const stopListening = callbacks.current.onEvent?.(event) === true;
          if (stopListening) {
            stopped = true;
            setConnected(false);
            if (heartbeatTimer !== undefined) window.clearInterval(heartbeatTimer);
            heartbeatTimer = undefined;
            currentSocket.close(1000, "room closed");
          }
        };
        currentSocket.onerror = () => {
          callbacks.current.onError?.(new Error("Kết nối realtime bị gián đoạn."));
          currentSocket.close();
        };
        currentSocket.onclose = () => {
          if (connectionTimeout !== undefined) window.clearTimeout(connectionTimeout);
          if (subscriptionTimeout !== undefined) window.clearTimeout(subscriptionTimeout);
          connectionTimeout = undefined;
          subscriptionTimeout = undefined;
          setConnected(false);
          if (heartbeatTimer !== undefined) window.clearInterval(heartbeatTimer);
          heartbeatTimer = undefined;
          if (stopped) return;
          attempts += 1;
          const delay = Math.min(10_000, 700 * 2 ** Math.min(attempts, 4));
          reconnectTimer = window.setTimeout(connect, delay);
        };
      } catch (error) {
        if (stopped) return;
        setConnected(false);
        callbacks.current.onError?.(error instanceof Error ? error : new Error("Không thể kết nối phòng."));
        attempts += 1;
        const delay = Math.min(10_000, 700 * 2 ** Math.min(attempts, 4));
        reconnectTimer = window.setTimeout(connect, delay);
      }
    };

    void connect();
    return () => {
      stopped = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      if (heartbeatTimer !== undefined) window.clearInterval(heartbeatTimer);
      if (connectionTimeout !== undefined) window.clearTimeout(connectionTimeout);
      if (subscriptionTimeout !== undefined) window.clearTimeout(subscriptionTimeout);
      socket?.close(1000, "page closed");
    };
  }, [enabled, roomId, scope]);

  return { connected: connected && enabled && (scope !== "room" || Boolean(roomId)) };
}
