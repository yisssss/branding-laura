// record.js
let audioCtx, analyser, dataArray, micStream;
let isRecording = false;
let silenceTimer;
let volumeHistory = [];
let pitchHistory = [];
const totalBands = 128;

async function startRecording() {
  audioCtx = new AudioContext();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const source = audioCtx.createMediaStreamSource(micStream);
  source.connect(analyser);

  isRecording = true;
  volumeHistory = [];
  pitchHistory = [];
  // 회색 초기화

  listenAudio();
}

function listenAudio() {
  const startTime = millis();
  const sampleRate = 30; // ms
  let lastActive = millis();

  const interval = setInterval(() => {
    analyser.getByteFrequencyData(dataArray);

    let volume = 0;
    for (let i = 0; i < dataArray.length; i++) {
      volume += dataArray[i];
    }
    volume /= dataArray.length;

    // pitch estimate (just index of max energy bin)
    let maxIdx = dataArray.indexOf(Math.max(...dataArray));
    let pitch = (maxIdx * audioCtx.sampleRate) / analyser.fftSize;

    volumeHistory.push(volume);
    pitchHistory.push(pitch);

    if (volume > 10) {
      lastActive = millis();
    }

    if (millis() - lastActive > 3000) {
      clearInterval(interval);
      stopRecording();
    }
  }, sampleRate);
}

function stopRecording() {
  console.log("stoprecord");
  isRecording = false;
  if (micStream) {
    let tracks = micStream.getTracks();
    tracks.forEach((track) => track.stop());
  }

  const chunkSize = floor(volumeHistory.length / totalBands);
  for (let i = 0; i < totalBands; i++) {
    let vchunk = volumeHistory.slice(i * chunkSize, (i + 1) * chunkSize);
    let pchunk = pitchHistory.slice(i * chunkSize, (i + 1) * chunkSize);

    let avgVol = vchunk.reduce((a, b) => a + b, 0) / vchunk.length;
    let avgPitch = pchunk.reduce((a, b) => a + b, 0) / pchunk.length;

    // 안정된 범위로 조정 (볼륨: 10~60 / 피치: 200~1000Hz)
    avgVol = constrain(avgVol, 10, 60);
    avgPitch = constrain(avgPitch, 200, 1000);

    // offset 조합: 음량 중심, 음고는 약간 보정
    let volOffset = map(avgVol, 10, 60, 0, 24);
    let pitchMod = map(avgPitch, 200, 1000, -6, 6);
    let finalOffset = volOffset + pitchMod;

    lines[0].targetOffsets[i] = finalOffset;

    lines[0].targetColors[i] = lines[0].originalColors[i];
  }

  gradualApply();
}

function gradualApply() {
  let step = 0;
  const interval = setInterval(() => {
    if (step >= 1) {
      clearInterval(interval);
    }
    lines[0].updateColorsTowardTarget(0.05); // ← 이거 색상 점진 적용
    lines[0].updateOffsets(); // ← 오프셋도 함께 적용
    step += 0.05;
  }, 30);
}

function mousePressed() {
  let x = pg.width / 2 - (lines[0].total * 8) / 2;
  let y = pg.height / 2 - 4;
  
  if (mode === "line") {
    mode = "lineToCircle";
    lines[0].setFromLine(x, y);
    lines[0].setTargetCircle(pg.width / 2, pg.height / 2, 100);
  } else if (mode === "circle") {
    mode = "circleToLine";
    lines[0].setTargetLine(x, y);
  }
}
