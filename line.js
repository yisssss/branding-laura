class PixelLine {
  constructor(img, x) {
    this.total = 64;

    this.colors = [];
    this.originalColors = [];
    this.targetColors = [];

    this.activated = false; // 생성자에 추가
    this.activatedIndices = [];
    this.hasShaken = false;

    this.offsets = [];
    this.positions = []; // ← 각 픽셀의 현재 위치
    this.targets = []; // ← 선 모드에서의 목표 위치
    this.targetOffsets = []; // ← 추가됨
    this.shakeOffsets = new Array(this.total).fill(0);
    this.shakeAmp = new Array(this.total).fill(0);

    this.offsetStyle = floor(random(10)); // 0~3: offset 스타일 유형 선택
    this.falloff = floor(random(v_falloff1, v_falloff2));

    let base = random(1000); // 고정된 Perlin noise 기반

    for (let i = 0; i < this.total; i++) {
      let y = map(i, 0, this.total, 0, img.height);
      let c = img.get(x, y);

      let boosted = color(
        pow(red(c) / 255, 0.8) * 255,
        pow(green(c) / 255, 0.8) * 255,
        pow(blue(c) / 255, 0.8) * 255
      );

      this.colors.push(boosted);
      this.originalColors.push(c);
      this.targetColors.push(boosted);

      // 구간별 노이즈 강도 컨트롤
      let globalBase = base + 9999; // 구간용 노이즈 시드
      let strength = map(noise(globalBase + i * 0.1), 0, 1, 0, 1);
      strength = pow(strength, 2); // 더 극단적으로 (0~1에서 0에 가까운 값 많게)

      // 기본 Perlin offset
      let rawOffset = map(noise(base + i * 0.3), 0, 1, -32, 32);

      // 구간 강도 적용
      let finalOffset = rawOffset * strength;

      this.offsets.push(finalOffset);

      this.targetOffsets.push(finalOffset); // 초기 목표는 현재 값과 같음

      // 초기 위치는 원형 위치로 계산해도 되고 나중에 별도 설정 가능
      this.positions.push(createVector(0, 0)); // 시작은 비워둠
      this.targets.push(createVector(0, 0)); // 나중에 설정
      //console.log("▶️ 색 #0:", this.colors[63]);
    }
  }

  updateOffsets() {
    for (let i = 0; i < this.total; i++) {
      this.offsets[i] = lerp(this.offsets[i], this.targetOffsets[i], 0.1);
    }
  }

  randomizeOffsets(c) {
    let base = random(1000);
    let globalBase = base + 9999;

    if (!this.activatedIndices || this.activatedIndices.length === 0) return;

    for (let i of this.activatedIndices) {
      let strength = map(noise(globalBase + i * 0.1), 0, 1, 0, 1);
      strength = pow(strength, 2);

      let rawOffset = map(noise(base + i * 0.3), 0, 1, -c, c);
      let finalOffset = rawOffset * strength;

      this.targetOffsets[i] = finalOffset;
    }
  }

randomizeOffsetsTotal(c) {
  console.log("randomizeOffsetsTotal");

  let base = random(1000);
  let globalBase = base + 9999;

  for (let i = 0; i < this.total; i++) {
    if (random() > 0.2) {
      let strength = map(noise(globalBase + i * 0.1), 0, 1, 0, 1);
      strength = pow(strength, 2);

      let rawOffset = map(noise(base + i * 0.3), 0, 1, -c, c);
      let delta = rawOffset * strength;

      // 🎯 원래 위치에서 ±c 범위로만 움직이게 함
      let newOffset = this.offsets[i] + delta;
      this.targetOffsets[i] = constrain(newOffset, this.offsets[i] - c, this.offsets[i] + c);
    }
  }
}



  triggerShake() {
    for (let i of this.activatedIndices) {
      this.shakeAmp[i] = v_triggerShake; // 진폭 시작값
    }
  }

  display(pg, x, y) {
    this.updateOffsets(); // ← 호출 추가

    for (let i = 0; i < this.total; i++) {
      this.shakeAmp[i] = this.shakeAmp[i] || 0; // 없으면 0
      this.shakeOffsets[i] = random(-this.shakeAmp[i], this.shakeAmp[i]);
      this.shakeAmp[i] *= 0.99; // 감쇠

      let offset = this.offsets[i] + this.shakeOffsets[i];


      pg.fill(this.colors[i]);

      pg.rect(x + offset, y + i * 8, 8, 8);
    }
  }

  shiftColorsUp() {
    let lastColor = this.colors[this.total - 1]; // 맨 아래 색 저장
    for (let i = this.total - 1; i > 0; i--) {
      this.colors[i] = this.colors[i - 1];
    }
    this.colors[0] = lastColor; // 맨 아래 색을 맨 위로
  }

  setBlack() {
    for (let i = 0; i < this.total; i++) {
      this.colors[i] = color(0); // p5 color 객체
    }
  }

  restoreOriginal() {
    for (let i = 0; i < this.total; i++) {
      this.colors[i] = this.originalColors[i];
    }
    console.log("color2originalcolor: colors updated");
  }

drawCircle(pg, cx, cy, radius) {
  this.updateOffsets(); // ← 여기도 추가

  for (let i = 0; i < this.total; i++) {
    let angle = map(i, 0, this.total, radians(b_radian1), radians(b_radian2));

    // 🎯 흔들림 적용
    this.shakeAmp[i] = this.shakeAmp[i] || 0;
    this.shakeOffsets[i] = random(-this.shakeAmp[i], this.shakeAmp[i]);
    this.shakeAmp[i] *= 0.99;

    let offset = this.offsets[i] + this.shakeOffsets[i];

    let nx = cos(angle);
    let ny = sin(angle);

    let x = cx + (radius + offset * 2) * nx;
    let y = cy + (radius + offset * 2) * ny;

    let c = this.colors[i];

      pg.fill(c);

    pg.rect(x, y, 10, 10);
  }
}


  setTargetCircle(cx, cy, radius) {
    console.log("setTargetCircle");
    for (let i = 0; i < this.total; i++) {
      let angle = map(i, 0, this.total, radians(b_radian1), radians(b_radian2));

      let offset = this.offsets[i];
      let nx = cos(angle),
        ny = sin(angle);
      let x = cx + (radius + offset * 2) * nx;
      let y = cy + (radius + offset * 2) * ny;
      this.targets[i].set(x, y);
    }
  }

  setFromLine(x, y) {
    console.log("setFromLine");
    for (let i = 0; i < this.total; i++) {
      this.positions[i].set(x + this.offsets[i], y + i * 8);
    }
  }

  updateAndDraw(pg) {
    let allArrived = true;
    //console.log("updateandDraw");

    for (let i = 0; i < this.total; i++) {
      this.positions[i].lerp(this.targets[i], 0.05);
      let d = p5.Vector.dist(this.positions[i], this.targets[i]);
      if (d > 0.5) allArrived = false;


    let c = this.colors[i];

      pg.fill(c);
      pg.rect(this.positions[i].x, this.positions[i].y, 10, 10);
    }
    return allArrived;
  }
}

let mode = "line"; // or "circle"
let transitioning = false;

function activateResponse(_num) {
  let key = _num;
  const index = int(key) - 1;
  currentTargetColor = targetColors[index];
  console.log("Selected targetColor", index, currentTargetColor);

  affectedLines = [];
  for (let line of lines) {
    for (let c of line.colors) {
      if (isTargetColor(c, currentTargetColor)) {
        line.applyVerticalGradient();
        affectedLines.push(line);
        break;
      }
    }
  }

  startAnimation(affectedLines); // ✅ 올바르게 전달
}

function startAnimation(lines) {
  affectedLines = shuffle([...lines]); // 랜덤 순서
  const delayRange = 1000; // 최대 1000ms 지연

  for (let line of affectedLines) {
    line._delay = random(0, delayRange); // 각 줄마다 랜덤 딜레이
    line.hasShaken = false;
  }

  animationStartTime = millis();
  isAnimating = true;
}

function isTargetColor(c, refColor, threshold = v_threshold) {
  let dr = red(c) - red(refColor);
  let dg = green(c) - green(refColor);
  let db = blue(c) - blue(refColor);
  return sqrt(dr * dr + dg * dg + db * db) < threshold;
}

PixelLine.prototype.applyVerticalGradient = function () {
  this.activated = false;

  for (let i = 0; i < this.total; i++) {
    const baseColor = this.originalColors[i];

    if (isTargetColor(baseColor, currentTargetColor)) {
      this.activated = true; // ← 여기가 핵심

      for (let j = 0; j < this.total; j++) {
        const orig = color(this.originalColors[j]);

        // 방어 코드
        if (!orig || typeof orig.levels === "undefined") {
          console.warn(`Invalid originalColor at index ${j}:`, orig);
          continue;
        }

        let d = abs(j - i);
        let ratio = map(d, 0, this.falloff, 1, 0);
        ratio = constrain(ratio, 0, 1);

        if (ratio > 0) {
          this.activatedIndices.push(j); // 🎯 이 인덱스를 기억해둔다
        }

        // 빨간색 → 원래색 사이 보간값으로 현재 색 갱신
        let grad = lerpColor(currentTargetColor, orig, 1 - ratio);
        this.targetColors[j] = grad; // 바로 바꾸지 않고 target에 저장
      }
      break;
    }
  }

  console.log("applyVerticalGradient: colors updated");
};

PixelLine.prototype.updateColorsTowardTarget = function (amt = 0.1) {
  for (let i = 0; i < this.total; i++) {
    const from = this.colors[i];
    const to = this.targetColors[i];
    let grad = lerpColor(color(from), color(to), amt); // ← color(...) 제거
    this.colors[i] = grad;
  }
};

PixelLine.prototype.fadeToOriginal = function (amt) {
  for (let i = 0; i < this.total; i++) {
    const from = this.colors[i];
    const to = this.originalColors[i];

    let grad = lerpColor(color(from), color(to), amt); // ← color(...) 제거
    this.colors[i] = grad;
  }
};
