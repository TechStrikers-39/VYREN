import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import './GridScan.css';

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0.1, 0.2, 0.4];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const vertexShader = `#version 300 es\nin vec2 position;\nvoid main() {\n  gl_Position = vec4(position, 0.0, 1.0);\n}\n`;

const fragmentShader = `#version 300 es\nprecision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 uSkew;
uniform float uTilt;
uniform float uYaw;
uniform float uLineThickness;
uniform vec3 uLinesColor;
uniform vec3 uScanColor;
uniform float uGridScale;
uniform float uLineJitter;
uniform float uScanOpacity;
uniform float uScanDirection;
uniform float uNoise;
uniform float uScanGlow;
uniform float uScanSoftness;
uniform float uPhaseTaper;
uniform float uScanDuration;
uniform float uScanDelay;
uniform float uLightMode;
out vec4 fragColor;

float smoother01(float a, float b, float x){
  float t = clamp((x - a) / max(1e-5, (b - a)), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

    vec3 ro = vec3(0.0);
    vec3 rd = normalize(vec3(p, 2.0));

    float cR = cos(uTilt), sR = sin(uTilt);
    rd.xy = mat2(cR, -sR, sR, cR) * rd.xy;

    float cY = cos(uYaw), sY = sin(uYaw);
    rd.xz = mat2(cY, -sY, sY, cY) * rd.xz;

    vec2 skew = clamp(uSkew, vec2(-0.7), vec2(0.7));
    rd.xy += skew * rd.z;

    vec3 color = vec3(0.0);
    float minT = 1e20;
    float gridScale = max(1e-5, uGridScale);
    float fadeStrength = 2.0;
    vec2 gridUV = vec2(0.0);

    float hitIsY = 1.0;
    for (int i = 0; i < 4; i++) {
        float isY = float(i < 2);
        float pos = mix(-0.2, 0.2, float(i)) * isY + mix(-0.5, 0.5, float(i - 2)) * (1.0 - isY);
        float num = pos - (isY * ro.y + (1.0 - isY) * ro.x);
        float den = isY * rd.y + (1.0 - isY) * rd.x;
        float t = num / den;
        vec3 h = ro + rd * t;

        float depthBoost = smoothstep(0.0, 3.0, h.z);
        h.xy += skew * 0.15 * depthBoost;

        bool use = t > 0.0 && t < minT;
        gridUV = use ? mix(h.zy, h.xz, isY) / gridScale : gridUV;
        minT = use ? t : minT;
        hitIsY = use ? isY : hitIsY;
    }

    vec3 hit = ro + rd * minT;
    float dist = length(hit - ro);

    float jitterAmt = clamp(uLineJitter, 0.0, 1.0);
    if (jitterAmt > 0.0) {
      vec2 j = vec2(
        sin(gridUV.y * 2.7 + iTime * 1.8),
        cos(gridUV.x * 2.3 - iTime * 1.6)
      ) * (0.15 * jitterAmt);
      gridUV += j;
    }
    float fx = fract(gridUV.x);
    float fy = fract(gridUV.y);
    float ax = min(fx, 1.0 - fx);
    float ay = min(fy, 1.0 - fy);
    float wx = fwidth(gridUV.x);
    float wy = fwidth(gridUV.y);
    float halfPx = max(0.0, uLineThickness) * 0.5;

    float tx = halfPx * wx;
    float ty = halfPx * wy;
    float aax = wx;
    float aay = wy;

    float lineX = 1.0 - smoothstep(tx, tx + aax, ax);
    float lineY = 1.0 - smoothstep(ty, ty + aay, ay);
    float primaryMask = max(lineX, lineY);

    vec2 gridUV2 = (hitIsY > 0.5 ? hit.xz : hit.zy) / gridScale;
    if (jitterAmt > 0.0) {
      vec2 j2 = vec2(
        cos(gridUV2.y * 2.1 - iTime * 1.4),
        sin(gridUV2.x * 2.5 + iTime * 1.7)
      ) * (0.15 * jitterAmt);
      gridUV2 += j2;
    }
    float fx2 = fract(gridUV2.x);
    float fy2 = fract(gridUV2.y);
    float ax2 = min(fx2, 1.0 - fx2);
    float ay2 = min(fy2, 1.0 - fy2);
    float wx2 = fwidth(gridUV2.x);
    float wy2 = fwidth(gridUV2.y);
    float tx2 = halfPx * wx2;
    float ty2 = halfPx * wy2;
    float aax2 = wx2;
    float aay2 = wy2;
    float lineX2 = 1.0 - smoothstep(tx2, tx2 + aax2, ax2);
    float lineY2 = 1.0 - smoothstep(ty2, ty2 + aay2, ay2);
    float altMask = max(lineX2, lineY2);

    float edgeDistX = min(abs(hit.x - (-0.5)), abs(hit.x - 0.5));
    float edgeDistY = min(abs(hit.y - (-0.2)), abs(hit.y - 0.2));
    float edgeDist = mix(edgeDistY, edgeDistX, hitIsY);
    float edgeGate = 1.0 - smoothstep(gridScale * 0.5, gridScale * 2.0, edgeDist);
    altMask *= edgeGate;

    float lineMask = max(primaryMask, altMask);
    float fade = exp(-dist * fadeStrength);

    float dur = max(0.05, uScanDuration);
    float del = max(0.0, uScanDelay);
    float scanZMax = 2.0;
    float widthScale = max(0.1, uScanGlow);
    float sigma = max(0.001, 0.18 * widthScale * uScanSoftness);
    float sigmaA = sigma * 2.0;

    float combinedPulse = 0.0;
    float combinedAura = 0.0;

    float cycle = dur + del;
    float tCycle = mod(iTime, cycle);
    float scanPhase = clamp((tCycle - del) / dur, 0.0, 1.0);
    float phase = scanPhase;
    if (uScanDirection > 0.5 && uScanDirection < 1.5) {
      phase = 1.0 - phase;
    } else if (uScanDirection > 1.5) {
      float t2 = mod(max(0.0, iTime - del), 2.0 * dur);
      phase = (t2 < dur) ? (t2 / dur) : (1.0 - (t2 - dur) / dur);
    }
    float scanZ = phase * scanZMax;
    float dz = abs(hit.z - scanZ);
    float lineBand = exp(-0.5 * (dz * dz) / (sigma * sigma));
    float taper = clamp(uPhaseTaper, 0.0, 0.49);
    float headW = taper;
    float tailW = taper;
    float headFade = smoother01(0.0, headW, phase);
    float tailFade = 1.0 - smoother01(1.0 - tailW, 1.0, phase);
    float phaseWindow = headFade * tailFade;
    float pulseBase = lineBand * phaseWindow;
    combinedPulse += pulseBase * clamp(uScanOpacity, 0.0, 1.0);
    float auraBand = exp(-0.5 * (dz * dz) / (sigmaA * sigmaA));
    combinedAura += (auraBand * 0.25) * phaseWindow * clamp(uScanOpacity, 0.0, 1.0);

    float lineVis = lineMask;
    vec3 gridCol = uLinesColor * lineVis * fade;
    vec3 scanCol = uScanColor * combinedPulse;
    vec3 scanAura = uScanColor * combinedAura;

    color = gridCol + scanCol + scanAura;

    float n = fract(sin(dot(fragCoord + vec2(iTime * 123.4), vec2(12.9898,78.233))) * 43758.5453123);
    color += (n - 0.5) * uNoise;
    color = clamp(color, 0.0, 1.0);
    float alpha = clamp(max(lineVis, combinedPulse), 0.0, 1.0);

    if (uLightMode > 0.5) {
      float energy = max(max(color.r, color.g), color.b);
      float coverage = clamp(max(alpha, smoothstep(0.0, 0.55, energy) * 0.82), 0.0, 0.9);
      coverage *= smoothstep(0.015, 0.12, energy);
      vec3 chroma = clamp(color / max(energy, 0.0001), 0.0, 1.0);
      chroma = pow(chroma, vec3(1.2));
      // Blend seamlessly into #F8FAFC
      fragColor = vec4(mix(vec3(0.973, 0.980, 0.988), chroma, coverage * 0.94), coverage * 0.85);
    } else {
      fragColor = vec4(color, alpha);
    }
}
`;

export interface GridScanProps {
  linesColor?: string;
  scanColor?: string;
  scanOpacity?: number;
  gridScale?: number;
  lineThickness?: number;
  scanDuration?: number;
  scanDelay?: number;
  lightMode?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const GridScan: React.FC<GridScanProps> = ({
  linesColor = '#1B3A6B',
  scanColor = '#2563EB',
  scanOpacity = 0.12,
  gridScale = 0.14,
  lineThickness = 0.8,
  scanDuration = 4.5,
  scanDelay = 2.5,
  lightMode = true,
  className = '',
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check accessibility reduced-motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = mediaQuery.matches;

    let renderer: Renderer | null = null;
    try {
      renderer = new Renderer({
        alpha: true,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
    } catch {
      return;
    }

    const gl = renderer.gl;
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);

    const uniforms = {
      iResolution: { value: [container.clientWidth, container.clientHeight] },
      iTime: { value: 0 },
      uSkew: { value: [0, 0] },
      uTilt: { value: 0 },
      uYaw: { value: 0 },
      uLineThickness: { value: lineThickness },
      uLinesColor: { value: hexToRgb(linesColor) },
      uScanColor: { value: hexToRgb(scanColor) },
      uGridScale: { value: gridScale },
      uLineJitter: { value: 0.0 },
      uScanOpacity: { value: scanOpacity },
      uScanDirection: { value: 0.0 },
      uNoise: { value: 0.004 },
      uScanGlow: { value: 0.2 },
      uScanSoftness: { value: 1.5 },
      uPhaseTaper: { value: 0.4 },
      uScanDuration: { value: scanDuration },
      uScanDelay: { value: scanDelay },
      uLightMode: { value: lightMode ? 1.0 : 0.0 },
    };

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new Mesh(gl, { geometry, program });

    let animationFrameId: number;
    let startTime = performance.now();

    const handleResize = () => {
      if (!container || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      uniforms.iResolution.value = [width, height];
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = (time: number) => {
      if (!renderer) return;
      const elapsed = prefersReducedMotion ? 0 : (time - startTime) / 1000;
      uniforms.iTime.value = elapsed;
      renderer.render({ scene: mesh });
      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (renderer && gl.canvas.parentElement === container) {
        container.removeChild(gl.canvas);
      }
    };
  }, [linesColor, scanColor, scanOpacity, gridScale, lineThickness, scanDuration, scanDelay, lightMode]);

  return <div ref={containerRef} className={`gridscan ${className}`} style={style} />;
};

export default GridScan;
