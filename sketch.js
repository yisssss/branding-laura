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

let v_falloff1 = 2;        //2~12
let v_falloff2 = 8;        //4~32
let v_triggerShake = 5;    //2~12
let v_threshold = 60;      //15~60
let v_changeColor = 0.05;  //0.02~0.1

let b_column = 33;
let b_radian1 = 137;
let b_radian2 = 360;


let randomNum;
let wasMousePressed = false; // 전 프레임 상태 기억


function preload() {
  theShader = loadShader("shaders/base.vert", "shaders/wobble.frag");
  img = loadImage("photo1.png");
  randomNum = floor(random(5)+1);
  backimg = loadImage('background/img' + randomNum + '.png');
}


function setup() {
  createCanvas(1920*2, 1080*2, WEBGL);
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

  letterImg = createGraphics(200, 200);
  letterImg.background(0); // 배경 검정
  letterImg.fill(255); // 글자 흰색
  letterImg.textSize(160);
  letterImg.textAlign(CENTER, CENTER);
  letterImg.text("A", 50, 50); // 중앙에 'A'
  letterImg.loadPixels();

  for (let line of lines) {
    if (line) line.restoreOriginal();

    let delay = random(3000, 12000); // 0.3~1초 간격
    setInterval(() => {
      line.shiftColorsUp();
    }, delay);
  }

    for (line of lines){
        line.updateColorsTowardTarget(1);
        line.fadeToOriginal(1);
    }
}


function draw() {
  //pg.background(mouseIsPressed 255 : 130);
  pg.background(130);


  pg.image(backimg,1920/4,1080/4,960,540);

  if (millis() - lastOffsetUpdate > offsetInterval) {
    for (let line of lines) {
      if (random() > 0.5) {
        line.randomizeOffsetsTotal(4);
      }
    }
    lastOffsetUpdate = millis();
  }

  /*
    const bgDiv = document.querySelector(".background");

  if (mouseIsPressed) {
    bgDiv.classList.add("white-bg");

    if (!wasMousePressed) {
      for (let line of lines) {
        if (line) line.setBlack();
      }
      console.log("mousePressed 시작됨");
    }
  } else {
    bgDiv.classList.remove("white-bg");

    if (wasMousePressed) {
      for (let line of lines) {
        if (line) line.restoreOriginal();
      }
      console.log("mouseReleased 됨");
    }
  }

  wasMousePressed = mouseIsPressed;
*/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (i === 16 || i === 1) {
      if (i === 16) {
        if (mode === "lineToCircle") {
          const done = line.updateAndDraw(pg);
          if (done) {
            mode = "circle";
          }
        } else if (mode === "circle") {
          // 원형 상태 고정 출력
          line.drawCircle(pg, pg.width / 2, pg.height / 2, 100);
        } else {
          // 일반 라인 모드
          const x = pg.width / 2 - (32 * 32) / 2 + i * 32;
          const y = pg.height / 2 - (64 * 8) / 2;
          line.display(pg, x, y);
        }
      }
      if (i === 1 && mode === "letter") {
        line.updateAndDraw(pg); // 글자 형태로 이동 애니메이션
      } else {
        const x = pg.width / 2 - (32 * 32) / 2 + i * 32;
        const y = pg.height / 2 - (64 * 8) / 2;
        line.display(pg, x, y);
      }
    } else {
      // 다른 줄들
      const x = pg.width / 2 - (32 * 32) / 2 + i * 32;
      const y = pg.height / 2 - (64 * 8) / 2;
      line.display(pg, x, y);
    }
  }

if (isAnimating) {
  let t = millis() - animationStartTime;

  for (let line of affectedLines) {
    let localT = t - line._delay;

    if (localT >= 0 && localT < 6000) {
      if (!line.hasShaken) {
        line.randomizeOffsets(32);
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
  const maxDelay = Math.max(...affectedLines.map(l => l._delay));
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
    let line = lines[16];
    console.log(line.positions[0], line.targets[0]);

    line.setFromLine(pg.width / 2 - 8, pg.height / 2 - (64 * 12) / 2);
    line.setTargetCircle(pg.width / 2, pg.height / 2, 100);

    // 다른 라인 제거
    for (let i = 0; i < lines.length; i++) {
      if (i !== 16) lines[i] = null;
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

  if (key === "a" || key === "A") {
    letterPoints = extractLetterPoints(letterImg, 64);

    for (let i = 0; i < 64; i++) {
      // A 형태 위치 지정
      let px = map(
        letterPoints[i].x,
        0,
        100,
        pg.width / 2 - 50,
        pg.width / 2 + 50
      );
      let py = map(
        letterPoints[i].y,
        0,
        100,
        pg.height / 2 - 50,
        pg.height / 2 + 50
      );
      lines[1].targets[i].set(px, py);
    }

    lines[1].setFromLine(
      pg.width / 2 - (32 * 32) / 2 + 32,
      pg.height / 2 - (64 * 8) / 2
    ); // 초기 위치 저장
    for (let i = 0; i < lines.length; i++) {
      if (i !== 1) lines[i] = null;
    }
    mode = "letter";
  }

  if (key >= "1" && key <= "5") {
    let _num = key;
    activateResponse(_num);
  }
}




















//-----------------------------------------------------------

let letterPoints;

function extractLetterPoints(gfx, count) {
  let points = [];
  gfx.loadPixels();

  for (let y = 0; y < gfx.height; y++) {
    for (let x = 0; x < gfx.width; x++) {
      let index = (y * gfx.width + x) * 4;
      if (gfx.pixels[index] > 128) {
        // 밝은 점
        points.push(createVector(x, y));
      }
    }
  }

  // 무작위 추출해서 64개
  return shuffle(points).slice(0, count);
}
