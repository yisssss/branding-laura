let theShader;
let pg;

let img;
let backimg;
let pixelColors = [];
let lines = [];

let lastOffsetUpdate = 0;
let offsetInterval = 100; // ms 단위 = 0.3초
let letterImg;
let targetLetterPoints = [];

let isAnimating = false;
let animationStartTime = 0;
let affectedLines = [];

let targetColors = []; // 타겟 컬러 배열
let currentTargetColor; // 현재 적용되는 기준 컬러

let v_falloff1 = 14; //2~12
let v_falloff2 = 16; //4~32
let v_triggerShake = 5; //2~12
let v_threshold = 60; //15~60
let v_changeColor = 0.05; //0.02~0.1

let b_column = 1;
let b_radian1 = -60;
let b_radian2 = 240;
let b_randomOffset = 2;
let rotationAngle = 0;

function preload() {
  theShader = loadShader("shaders/base.vert", "shaders/wobble.frag");
  img = loadImage("photo1.png");
}

function setup() {
  createCanvas(1920 * 2, 1080 * 2, WEBGL);
  noStroke();
  targetColors = [
    color(252, 90, 150), // 1번 - 핑크
    color(255, 96, 51), // 2번 - 주황
    color(0, 179, 212), // 3번 - 파랑
    color(0, 194, 138), // 4번 - 초록
    color(172, 112, 212), // 5번 - 보라
  ];
  currentTargetColor = targetColors[0]; // 초기값

  console.log("shader loaded?", theShader); // ← null or p5.Shader?
  shader(theShader);

  pg = createGraphics(1920, 1080);
  pg.noStroke();
  pg.background(130);

  for (let i = 0; i < b_column; i++) {
    let imgX = floor(random(img.width)); // 0 ~ (img.width - 1) 사이 랜덤 정수
    lines.push(new PixelLine(img, imgX));
  }
  /*
  for (let line of lines) {
    if (line) line.restoreOriginal();

    let delay = random(3000, 12000); // 0.3~1초 간격
    setInterval(() => {
      line.shiftColorsUp();
    }, delay);
  }*/

  for (line of lines) {
    line.updateColorsTowardTarget(1);
    line.fadeToOriginal(1);
  }

  for (let i = 0; i < lines[0].total; i++) {
  lines[0].colors[i] = color(140); // 회색
  lines[0].offsets[i] = 0;
  lines[0].targetColors[i] = lines[0].originalColors[i]; // 나중에 도달할 목표
  lines[0].targetOffsets[i] = 0;
}
}

function draw() {
  //pg.background(mouseIsPressed 255 : 130);
  pg.background(130);

  if (millis() - lastOffsetUpdate > offsetInterval) {
    for (let line of lines) {
      if (random() > 0.5) {
        line.randomizeOffsetsTotal(b_randomOffset);
      }
    }
    lastOffsetUpdate = millis();
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (mode === "lineToCircle") {
      const done = line.updateAndDraw(pg);
      if (done) {
        mode = "circle";
      }
    } else if (mode === "circle") {

      line.drawCircle(pg, pg.width / 2, pg.height / 2, 100); // 중심 기준으로 이동했기 때문에 (0, 0)

    } else if (mode === "circleToLine") {
      const done = line.updateAndDraw(pg);
      if (done) {
        mode = "line";
      }
    } else if (mode === "line") {
// 기존 y 기준 중심 → x 기준 중심으로 변경
let totalWidth = lines[0].total * 8; // 64칸 × 8px
let x = pg.width / 2 - totalWidth / 2;
let y = pg.height / 2 - 8 / 2; // 줄 1줄 높이만큼 중앙 정렬

lines[0].display(pg, x, y);

    }
  }

  if (isAnimating) {
    let t = millis() - animationStartTime;

    for (let line of affectedLines) {
      let localT = t - line._delay;

      if (localT >= 0 && localT < 6000) {
        if (!line.hasShaken) {
          //line.randomizeOffsets(32);
          line.triggerShake();
          line.hasShaken = true;
        }
        line.updateColorsTowardTarget(v_changeColor);
      } else if (localT >= 6000 && localT < 10000) {
        let amt = map(localT, 6000, 10000, 0, 1);
        line.fadeToOriginal(constrain(amt, 0, 1));
      } else if (localT > 7800) {
        line.hasShaken = false;
        line.activated = false;
        line.activatedIndices = [];
      }
    }

    // 전체 종료 조건
    const maxDelay = Math.max(...affectedLines.map((l) => l._delay));
    if (t > maxDelay + 10000) {
      isAnimating = false;
      affectedLines = [];
    }
  }

  theShader.setUniform("time", millis() / 1000.0);
  theShader.setUniform("resolution", [width, height]);
  theShader.setUniform("tex", pg);

  rect(0, 0, width, height);
}

function keyPressed() {
  if (key === "t" || key === "T") {
    mode = "lineToCircle";
    transitioning = true;

    // line16만 원형으로 위치 세팅 후 타겟 설정
    let line = lines[0];
    console.log(line.positions[0], line.targets[0]);

    line.setFromLine(pg.width / 2 - 8, pg.height / 2 - (64 * 12) / 2);
    line.setTargetCircle(pg.width / 2, pg.height / 2, 100);

    // 다른 라인 제거
    for (let i = 0; i < lines.length; i++) {
      if (i !== 0) lines[i] = null;
    }
  }

  if (key === "s" || key === "S") {
    // 현재 canvas를 이미지로 가져옴
    let fullImage = get(); // 전체 canvas 이미지 (p5.Image)

    // 1사분면 (오른쪽 상단 1/4 영역)만 잘라내기
    let cropped = fullImage.get(width / 2, 0, width / 2, height / 2);

    // 잘라낸 이미지 저장
    save(cropped, "cropped_quadrant.png");
  }

  if (key >= "1" && key <= "5") {
    let _num = key;
    activateResponse(_num);
  }

  if (keyCode === ENTER && !isRecording) {
      console.log("keyPressed", key, keyCode);  // ← 여기 추가

    startRecording();
  }
}
