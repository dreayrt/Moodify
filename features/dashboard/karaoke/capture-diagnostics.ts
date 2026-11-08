// Do not include device IDs or labels in a shareable diagnostic report.
export function captureDiagnostics(stream: MediaStream, context: AudioContext) {
  const settings = stream.getAudioTracks()[0]?.getSettings();
  return {
    extractor_version: "browser-yin-v1",
    context_sample_rate: context.sampleRate,
    output_base_latency_ms: context.baseLatency * 1000,
    input_latency_measured: false,
    microphone: {
      sample_rate: settings?.sampleRate,
      channel_count: settings?.channelCount,
      echo_cancellation: settings?.echoCancellation,
      noise_suppression: settings?.noiseSuppression,
      auto_gain_control: settings?.autoGainControl,
    },
  };
}
