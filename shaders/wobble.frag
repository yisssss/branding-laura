#ifdef GL_ES
precision mediump float;
#endif

uniform float time;
uniform sampler2D tex;
varying vec2 vTexCoord;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}


vec3 rgb2hsl(vec3 c) {
  float r = c.r, g = c.g, b = c.b;
  float maxC = max(r, max(g, b));
  float minC = min(r, min(g, b));
  float l = (maxC + minC) * 0.5;

  if (maxC == minC) return vec3(0.0, 0.0, l);

  float d = maxC - minC;
  float s = (l > 0.5) ? d / (2.0 - maxC - minC) : d / (maxC + minC);

  float h = 0.0;
  if (maxC == r) h = (g - b) / d + (g < b ? 6.0 : 0.0);
  else if (maxC == g) h = (b - r) / d + 2.0;
  else h = (r - g) / d + 4.0;
  h /= 6.0;

  return vec3(h, s, l);
}


float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}


vec3 hsl2rgb(vec3 c) {
  float h = c.x, s = c.y, l = c.z;

  if (s == 0.0) return vec3(l); // 회색 계열

  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;

  float r = hue2rgb(p, q, h + 1.0/3.0);
  float g = hue2rgb(p, q, h);
  float b = hue2rgb(p, q, h - 1.0/3.0);
  return vec3(r, g, b);
}



void main() {
  vec2 uv = vTexCoord;

float cellSize = 0.0005;
vec2 cell = floor(uv / cellSize) * cellSize;

  // 가로 방향 노이즈 방향
  float noiseX = rand(cell + time) - 0.5;
  vec2 noiseDir = vec2(noiseX, 0.0);

  // 원본 + 노이즈 이미지
  vec4 original = texture2D(tex, uv);
  vec4 noisy = texture2D(tex, uv + noiseDir * 0.000);
  noisy.rgb += (rand(uv * time) - 0.003) * 0.005;

  // HSL 변환 후 혼합
  vec3 hslOrig = rgb2hsl(original.rgb);
  vec3 hslNoisy = rgb2hsl(noisy.rgb);

  float h, s;
  float threshold = 0.05; // 이 값보다 낮은 채도는 무시

  if (hslNoisy.y > threshold) {
    h = hslNoisy.x;
    s = max(hslOrig.y, hslNoisy.y); // 원본보다 강할 때만
  } else {
    h = hslOrig.x;
    s = hslOrig.y;
  }

  float l = hslOrig.z; // 명도는 그대로

  vec3 finalHSL = vec3(h, s, l);

  vec3 finalRGB = hsl2rgb(finalHSL);

  vec3 boostedHSL = rgb2hsl(finalRGB);
boostedHSL.y = min(boostedHSL.y * 1.8, 1.0); // 채도 20% 증가
boostedHSL.z = min(boostedHSL.z * 1.2, 1.0); // 밝기 10% 증가
finalRGB = hsl2rgb(boostedHSL);

  gl_FragColor = vec4(finalRGB, 1.0);
}



