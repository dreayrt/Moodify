"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Device as MediaDevice, types as MediaTypes } from "mediasoup-client";
import { createKaraokeVoiceTicket } from "@/lib/api-client";

type MediaProducer = MediaTypes.Producer;
type MediaConsumer = MediaTypes.Consumer;
type MediaTransport = MediaTypes.Transport;
type MediaRpc = (type: string, payload?: Record<string, unknown>) => Promise<unknown>;
type RemoteVoice = { userId: string; stream: MediaStream };
type AudioInputDevice = { deviceId: string; label: string };
type PendingRequest = { resolve: (payload: unknown) => void; reject: (error: Error) => void; timer: number };

type RpcResponse = {
  id?: string;
  ok?: boolean;
  payload?: unknown;
  error?: { message?: string };
  type?: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Không thể kết nối âm thanh phòng.";
}

function isUsableId(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && value !== "undefined" && value !== "null";
}

function isMissingProducerError(error: unknown): boolean {
  const message = errorMessage(error).toLowerCase();
  return message.includes("producer_not_found")
    || message.includes("invalid_producer_id")
    || (message.includes("producer with id") && message.includes("not found"));
}

export function useMediasoupRoom(roomId: number, enabled: boolean) {
  const socketRef = useRef<WebSocket | null>(null);
  const deviceRef = useRef<MediaDevice | null>(null);
  const recvTransportRef = useRef<MediaTransport | null>(null);
  const sendTransportRef = useRef<MediaTransport | null>(null);
  const producerRef = useRef<MediaProducer | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const consumerByProducerRef = useRef(new Map<string, MediaConsumer>());
  const userByProducerRef = useRef(new Map<string, string>());
  const pendingProducersRef = useRef(new Map<string, string>());
  const receivingProducersRef = useRef(new Set<string>());
  const closedProducersRef = useRef(new Set<string>());
  const pendingRequestsRef = useRef(new Map<string, PendingRequest>());
  const requestRef = useRef<MediaRpc | null>(null);
  const ensureSendTransportRef = useRef<(() => Promise<MediaTransport>) | null>(null);
  const requestSequenceRef = useRef(0);
  const connectedRef = useRef(false);
  const microphoneBusyRef = useRef(false);
  const selectedInputDeviceRef = useRef("");
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [microphoneOn, setMicrophoneOn] = useState(false);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);
  const [microphoneBusy, setMicrophoneBusy] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [remoteVoices, setRemoteVoices] = useState<RemoteVoice[]>([]);
  const [speakingUserIds, setSpeakingUserIds] = useState<string[]>([]);
  const [audioInputDevices, setAudioInputDevices] = useState<AudioInputDevice[]>([]);
  const [selectedInputDeviceId, setSelectedInputDeviceId] = useState("");

  const refreshAudioDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices
        .filter((device) => device.kind === "audioinput")
        .map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Micro ${index + 1}` }));
      setAudioInputDevices(inputs);
      if (!selectedInputDeviceRef.current && inputs[0]) {
        selectedInputDeviceRef.current = inputs[0].deviceId;
        setSelectedInputDeviceId(inputs[0].deviceId);
      } else if (selectedInputDeviceRef.current && !inputs.some((device) => device.deviceId === selectedInputDeviceRef.current)) {
        selectedInputDeviceRef.current = inputs[0]?.deviceId ?? "";
        setSelectedInputDeviceId(selectedInputDeviceRef.current);
      }
    } catch {
      // Device enumeration is optional; microphone capture reports actionable errors on demand.
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const devices = navigator.mediaDevices;
    const onDeviceChange = () => { void refreshAudioDevices(); };
    const refreshTimer = window.setTimeout(() => { void refreshAudioDevices(); }, 0);
    devices?.addEventListener?.("devicechange", onDeviceChange);
    return () => {
      window.clearTimeout(refreshTimer);
      devices?.removeEventListener?.("devicechange", onDeviceChange);
    };
  }, [enabled, refreshAudioDevices]);

  const clearRemoteVoice = useCallback((producerId: string) => {
    const consumer = consumerByProducerRef.current.get(producerId);
    consumer?.close();
    consumerByProducerRef.current.delete(producerId);
    closedProducersRef.current.add(producerId);
    const userId = userByProducerRef.current.get(producerId);
    userByProducerRef.current.delete(producerId);
    pendingProducersRef.current.delete(producerId);
    if (userId) setRemoteVoices((voices) => voices.filter((voice) => voice.userId !== userId));
  }, []);

  const disconnectMedia = useCallback(() => {
    connectedRef.current = false;
    producerRef.current?.close();
    producerRef.current = null;
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    setMicrophoneStream(null);
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();
    sendTransportRef.current = null;
    recvTransportRef.current = null;
    deviceRef.current = null;
    requestRef.current = null;
    ensureSendTransportRef.current = null;
    for (const consumer of consumerByProducerRef.current.values()) consumer.close();
    consumerByProducerRef.current.clear();
    userByProducerRef.current.clear();
    pendingProducersRef.current.clear();
    receivingProducersRef.current.clear();
    closedProducersRef.current.clear();
    setConnected(false);
    setReady(false);
    setMicrophoneOn(false);
    setMicrophoneBusy(false);
    microphoneBusyRef.current = false;
    setRemoteVoices([]);
    setSpeakingUserIds([]);
    for (const request of pendingRequestsRef.current.values()) {
      window.clearTimeout(request.timer);
      request.reject(new Error("Kết nối âm thanh đã đóng."));
    }
    pendingRequestsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!enabled || !Number.isSafeInteger(roomId) || roomId <= 0) return;
    let disposed = false;
    let retryTimer: number | undefined;
    let retries = 0;
    let manuallyLeaving = false;
    let connectionGeneration = 0;

    const request = <T,>(type: string, payload: Record<string, unknown> = {}, generation = connectionGeneration): Promise<T> => {
      if (generation !== connectionGeneration) {
        return Promise.reject(new Error("Phiên âm thanh đã được thay thế."));
      }
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error("Kết nối âm thanh chưa sẵn sàng."));
      }
      const id = `${Date.now()}-${++requestSequenceRef.current}`;
      return new Promise<T>((resolve, reject) => {
        const timer = window.setTimeout(() => {
          pendingRequestsRef.current.delete(id);
          reject(new Error("Máy chủ voice không phản hồi kịp thời."));
        }, 10_000);
        pendingRequestsRef.current.set(id, {
          resolve: (value) => { window.clearTimeout(timer); resolve(value as T); },
          reject: (error) => { window.clearTimeout(timer); reject(error); },
          timer,
        });
        socket.send(JSON.stringify({ id, type, payload }));
      });
    };
    requestRef.current = request;

    const receiveProducer = async (producerId: string, userId: string, generation: number) => {
      if (generation !== connectionGeneration || !isUsableId(producerId) || !isUsableId(userId)
          || closedProducersRef.current.has(producerId) || receivingProducersRef.current.has(producerId)) return;
      const device = deviceRef.current;
      const transport = recvTransportRef.current;
      if (!device || !transport) {
        pendingProducersRef.current.set(producerId, userId);
        return;
      }
      if (consumerByProducerRef.current.has(producerId)) return;
      receivingProducersRef.current.add(producerId);
      pendingProducersRef.current.delete(producerId);
      try {
        const options = await request<{
          id: string;
          producerId: string;
          kind: "audio";
          rtpParameters: MediaTypes.RtpParameters;
        }>("consume", {
          transportId: transport.id,
          producerId,
          rtpCapabilities: device.recvRtpCapabilities,
        }, generation);
        if (generation !== connectionGeneration || closedProducersRef.current.has(producerId)) {
          void request("close-consumer", { consumerId: options.id }, generation).catch(() => undefined);
          return;
        }
        if (!isUsableId(options.id) || !isUsableId(options.producerId) || options.producerId !== producerId) {
          if (isUsableId(options.id)) {
            void request("close-consumer", { consumerId: options.id }, generation).catch(() => undefined);
          }
          throw new Error("Máy chủ voice trả về producer không hợp lệ.");
        }
        let consumer: MediaConsumer;
        try {
          consumer = await transport.consume(options);
        } catch (error) {
          void request("close-consumer", { consumerId: options.id }, generation).catch(() => undefined);
          throw error;
        }
        if (generation !== connectionGeneration || closedProducersRef.current.has(producerId)) {
          consumer.close();
          void request("close-consumer", { consumerId: options.id }, generation).catch(() => undefined);
          return;
        }
        userByProducerRef.current.set(producerId, userId);
        consumerByProducerRef.current.set(producerId, consumer);
        setRemoteVoices((voices) => [
          ...voices.filter((voice) => voice.userId !== userId),
          { userId, stream: new MediaStream([consumer.track]) },
        ]);
        await request("resume-consumer", { consumerId: consumer.id }, generation);
      } catch (error) {
        const consumer = consumerByProducerRef.current.get(producerId);
        if (consumer) {
          consumer.close();
          void request("close-consumer", { consumerId: consumer.id }, generation).catch(() => undefined);
          consumerByProducerRef.current.delete(producerId);
          userByProducerRef.current.delete(producerId);
        }
        if (generation === connectionGeneration) setRemoteVoices((voices) => voices.filter((voice) => voice.userId !== userId));
        if (isMissingProducerError(error)) {
          clearRemoteVoice(producerId);
          return;
        }
        throw error;
      } finally {
        receivingProducersRef.current.delete(producerId);
      }
    };

    const makeTransport = async (direction: "send" | "recv", iceServers: RTCIceServer[], generation: number) => {
      const device = deviceRef.current;
      if (!device) throw new Error("Thiết bị mediasoup chưa sẵn sàng.");
      const options = await request<MediaTypes.TransportOptions>("create-transport", { direction }, generation);
      if (generation !== connectionGeneration) throw new Error("Phiên âm thanh đã được thay thế.");
      const transport = direction === "send"
        ? device.createSendTransport({ ...options, iceServers })
        : device.createRecvTransport({ ...options, iceServers });
      transport.on("connect", ({ dtlsParameters }, callback, errback) => {
        void request("connect-transport", { transportId: transport.id, dtlsParameters }, generation)
          .then(() => callback())
          .catch((error: unknown) => errback(error instanceof Error ? error : new Error(errorMessage(error))));
      });
      if (direction === "send") {
        transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
          void request<{ id: string }>("produce", { transportId: transport.id, kind, rtpParameters }, generation)
            .then(({ id }) => callback({ id }))
            .catch((error: unknown) => errback(error instanceof Error ? error : new Error(errorMessage(error))));
        });
        sendTransportRef.current = transport;
      } else {
        recvTransportRef.current = transport;
      }
      return transport;
    };

    const connect = async () => {
      const generation = ++connectionGeneration;
      try {
        requestRef.current = (type, payload) => request(type, payload, generation);
        setVoiceError("");
        const ticket = await createKaraokeVoiceTicket(roomId);
        if (disposed || generation !== connectionGeneration) return;
        const socket = new WebSocket(ticket.websocketUrl);
        socketRef.current = socket;
        socket.onopen = () => {
          if (generation === connectionGeneration) socket.send(JSON.stringify({ type: "auth", ticket: ticket.ticket }));
        };
        socket.onmessage = (event) => {
          if (generation !== connectionGeneration) return;
          let message: RpcResponse & { payload?: Record<string, unknown> };
          try {
            message = JSON.parse(String(event.data)) as typeof message;
          } catch {
            return;
          }
          if (message.id) {
            const pending = pendingRequestsRef.current.get(message.id);
            if (!pending) return;
            pendingRequestsRef.current.delete(message.id);
            window.clearTimeout(pending.timer);
            if (message.ok) pending.resolve(message.payload);
            else pending.reject(new Error(message.error?.message || "Lệnh âm thanh thất bại."));
            return;
          }
          if (message.type === "authenticated") {
            setConnected(true);
            connectedRef.current = true;
            retries = 0;
            void (async () => {
              try {
                const capabilities = await request<{
                  routerRtpCapabilities: MediaTypes.RtpCapabilities;
                  iceServers: RTCIceServer[];
                }>("get-rtp-capabilities", {}, generation);
                const mediasoupClient = await import("mediasoup-client");
                const device = new mediasoupClient.Device();
                await device.load({ routerRtpCapabilities: capabilities.routerRtpCapabilities });
                if (generation !== connectionGeneration) return;
                deviceRef.current = device;
                await makeTransport("recv", capabilities.iceServers, generation);
                ensureSendTransportRef.current = () => sendTransportRef.current
                  ? Promise.resolve(sendTransportRef.current)
                  : makeTransport("send", capabilities.iceServers, generation);
                setReady(true);
                const existing = message.payload?.existingProducers;
                if (Array.isArray(existing)) {
                  for (const item of existing) {
                    const producer = item as { producerId?: unknown; userId?: unknown };
                    if (isUsableId(producer.producerId) && isUsableId(producer.userId)) {
                      void receiveProducer(producer.producerId, producer.userId, generation).catch((error: unknown) => {
                        if (generation === connectionGeneration) setVoiceError(errorMessage(error));
                      });
                    }
                  }
                }
                for (const [producerId, userId] of pendingProducersRef.current) {
                  void receiveProducer(producerId, userId, generation).catch((error: unknown) => {
                    if (generation === connectionGeneration) setVoiceError(errorMessage(error));
                  });
                }
              } catch (error) {
                if (generation !== connectionGeneration) return;
                setVoiceError(errorMessage(error));
                socket.close(1011, "media initialization failed");
              }
            })();
            return;
          }
          if (message.type === "new-producer") {
            const producerId = message.payload?.producerId;
            const userId = message.payload?.userId;
            if (isUsableId(producerId) && isUsableId(userId)) {
              void receiveProducer(producerId, userId, generation).catch((error: unknown) => {
                if (generation === connectionGeneration) setVoiceError(errorMessage(error));
              });
            }
          }
          if (message.type === "producer-closed") {
            const producerId = message.payload?.producerId;
            if (isUsableId(producerId)) clearRemoteVoice(producerId);
          }
          if (message.type === "voice-speaking") {
            const userIds = message.payload?.userIds;
            setSpeakingUserIds(Array.isArray(userIds) ? userIds.map(String) : []);
          }
          if (message.type === "voice-silence") setSpeakingUserIds([]);
        };
        socket.onerror = () => {
          if (generation === connectionGeneration) setVoiceError("Không thể kết nối mediasoup. Kiểm tra URL WSS và cấu hình mạng.");
        };
        socket.onclose = (event) => {
          if (socketRef.current === socket) socketRef.current = null;
          if (disposed || manuallyLeaving || generation !== connectionGeneration) return;
          disconnectMedia();
          if (event.code === 1008) {
            const authReason = event.reason.toUpperCase();
            if (authReason === "VOICE_SESSION_NOT_ACTIVE" && retries < 3) {
              retries += 1;
              setVoiceError("Phiên voice đã hết hạn sau lần khởi động lại máy chủ. Đang kết nối lại…");
              retryTimer = window.setTimeout(() => void connect(), Math.min(1000 * 2 ** (retries - 1), 4000));
              return;
            }
            setVoiceError(authReason.includes("USER_ALREADY_CONNECTED")
              ? "Micro phòng này đang được kết nối từ thiết bị khác. Hãy ngắt voice ở thiết bị đó rồi thử lại."
              : authReason.includes("ROOM_FULL")
                ? "Đường truyền voice của phòng đã đủ người."
                : authReason === "KARAOKE_MEDIA_SERVICE_UNAUTHORIZED"
                  ? "Backend từ chối khóa kết nối của máy chủ voice."
                  : authReason.startsWith("BACKEND_CONSUME_FAILED_")
                    ? "Backend không xác thực được phiên voice. Kiểm tra kết nối và cấu hình giữa hai máy chủ."
                    : authReason === "VOICE_TICKET_INVALID"
                      ? "Vé voice không hợp lệ. Hãy tải lại phòng để nhận vé mới."
                      : "Không thể xác thực kết nối voice cho phòng này.");
            return;
          }
          retries += 1;
          if (retries <= 5) {
            retryTimer = window.setTimeout(() => void connect(), Math.min(1000 * 2 ** (retries - 1), 10_000));
          } else {
            setVoiceError("Mất kết nối âm thanh. Hãy tải lại phòng để kết nối lại.");
          }
        };
      } catch (error) {
        if (generation !== connectionGeneration) return;
        setVoiceError(errorMessage(error));
        if (!disposed && retries < 5) {
          retries += 1;
          retryTimer = window.setTimeout(() => void connect(), Math.min(1000 * 2 ** (retries - 1), 10_000));
        }
      }
    };

    void connect();
    return () => {
      disposed = true;
      manuallyLeaving = true;
      connectionGeneration += 1;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ id: "leave", type: "leave" }));
        socket.close(1000, "left karaoke room");
      }
      disconnectMedia();
    };
  }, [clearRemoteVoice, disconnectMedia, enabled, roomId]);

  const toggleMicrophone = useCallback(async () => {
    if (microphoneBusyRef.current) return;
    microphoneBusyRef.current = true;
    setMicrophoneBusy(true);
    try {
      if (microphoneOn) {
        const producer = producerRef.current;
        producer?.close();
        if (producer) {
          await requestRef.current?.("close-producer", { producerId: producer.id }).catch(() => undefined);
        }
        producerRef.current = null;
        micStreamRef.current?.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
        setMicrophoneStream(null);
        setMicrophoneOn(false);
        return;
      }
      if (!connectedRef.current || !socketRef.current || !deviceRef.current || !ready) throw new Error("Đang kết nối máy chủ âm thanh, vui lòng thử lại sau.");
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Trình duyệt không hỗ trợ truy cập micro.");
      const audio: MediaTrackConstraints | boolean = selectedInputDeviceRef.current
        ? { deviceId: { exact: selectedInputDeviceRef.current } }
        : true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
      micStreamRef.current = stream;
      setMicrophoneStream(stream);
      const transport = sendTransportRef.current ?? await ensureSendTransportRef.current?.();
      if (!transport) throw new Error("Không thể khởi tạo đường truyền micro.");
      const track = stream.getAudioTracks()[0];
      if (!track) throw new Error("Không tìm thấy micro đang hoạt động.");
      const producer = await transport.produce({ track });
      producerRef.current = producer;
      track.addEventListener("ended", () => {
        if (producerRef.current !== producer || producer.track !== track) return;
        producer.close();
        producerRef.current = null;
        void requestRef.current?.("close-producer", { producerId: producer.id }).catch(() => undefined);
        micStreamRef.current?.getTracks().forEach((activeTrack) => activeTrack.stop());
        micStreamRef.current = null;
        setMicrophoneStream(null);
        setMicrophoneOn(false);
        setVoiceError("Micro đã ngắt kết nối. Hãy chọn lại thiết bị rồi bật micro.");
      }, { once: true });
      await refreshAudioDevices();
      setMicrophoneOn(true);
      setVoiceError("");
    } catch (error) {
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
      setMicrophoneStream(null);
      setVoiceError(errorMessage(error));
      setMicrophoneOn(false);
    } finally {
      microphoneBusyRef.current = false;
      setMicrophoneBusy(false);
    }
  }, [microphoneOn, ready, refreshAudioDevices]);

  const selectInputDevice = useCallback(async (deviceId: string) => {
    if (microphoneBusyRef.current || deviceId === selectedInputDeviceRef.current) return;
    if (!microphoneOn) {
      selectedInputDeviceRef.current = deviceId;
      setSelectedInputDeviceId(deviceId);
      return;
    }
    microphoneBusyRef.current = true;
    setMicrophoneBusy(true);
    let replacementStream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Trình duyệt không hỗ trợ truy cập micro.");
      replacementStream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false,
      });
      const track = replacementStream.getAudioTracks()[0];
      const producer = producerRef.current;
      if (!track || !producer) throw new Error("Không thể thay micro trong lúc này.");
      await producer.replaceTrack({ track });
      const previousStream = micStreamRef.current;
      micStreamRef.current = replacementStream;
      setMicrophoneStream(replacementStream);
      replacementStream = null;
      selectedInputDeviceRef.current = deviceId;
      setSelectedInputDeviceId(deviceId);
      previousStream?.getTracks().forEach((oldTrack) => oldTrack.stop());
      await refreshAudioDevices();
      setVoiceError("");
    } catch (error) {
      replacementStream?.getTracks().forEach((track) => track.stop());
      setVoiceError(errorMessage(error));
    } finally {
      microphoneBusyRef.current = false;
      setMicrophoneBusy(false);
    }
  }, [microphoneOn, refreshAudioDevices]);

  return {
    connected,
    ready,
    microphoneOn,
    microphoneStream,
    microphoneBusy,
    remoteVoices,
    speakingUserIds,
    voiceError,
    audioInputDevices,
    selectedInputDeviceId,
    refreshAudioDevices,
    selectInputDevice,
    toggleMicrophone,
  };
}
