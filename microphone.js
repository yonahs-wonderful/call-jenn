// A local-only check: no audio is sent to Wonderful or recorded.
export async function checkMicrophone({onLevel, onDevice, duration = 8000}) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is unavailable. Open this HTTPS page directly in Chrome or Safari.');
  let stream, context;
  try {
    stream = await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:false,autoGainControl:false}});
    onDevice(stream.getAudioTracks()[0]?.label || 'Default microphone');
    context = new (window.AudioContext || window.webkitAudioContext)();
    await context.resume();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let peak = 0;
    await new Promise(resolve => {
      const timer = setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
        peak = Math.max(peak, rms);
        onLevel(Math.min(1, rms * 12));
      }, 80);
      setTimeout(() => {clearInterval(timer);resolve();}, duration);
    });
    return peak > 0.002;
  } finally {
    stream?.getTracks().forEach(track => track.stop());
    if (context) await context.close();
    onLevel(0);
  }
}
