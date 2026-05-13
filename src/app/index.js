import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import {
  Blur,
  Canvas,
  Circle,
  DashPathEffect,
  Fill,
  Group,
  Image as SkiaImage,
  ImageShader,
  LinearGradient,
  Mask,
  Path,
  RadialGradient,
  Rect,
  RoundedRect,
  Shadow,
  Shader,
  Skia,
  SweepGradient,
  useClock,
  useImage,
  vec,
} from "@shopify/react-native-skia";
import { Easing, useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated";

const MAP_WIDTH = 920;
const MAP_HEIGHT = 980;
const DRIVER_IMAGE = require("../assets/charles-leclerc-cutout.png");

const DRIVER_REVEAL_SHADER = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float2 resolution;
uniform float time;
uniform float edge;
uniform float band;
uniform float imageTop;
uniform float imageBottom;

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453123);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

half4 main(float2 p) {
  half4 px = image.eval(p);
  float2 uv = p / resolution;
  float coarse = noise(float2(uv.x * 9.0 + time * 0.36, uv.y * 2.2 - time * 0.2));
  float fine = noise(float2(uv.x * 31.0 - time * 1.15, uv.y * 8.0 + time * 0.5));
  float rag = (coarse - 0.5) * band * 0.7 + (fine - 0.5) * band * 0.34;
  float d = p.y - (edge + rag);
  float revealed = smoothstep(-band * 0.08, band * 0.28, d);
  float imageSize = imageBottom - imageTop;
  float bottomFade = 1.0 - smoothstep(imageTop + imageSize * 0.68, imageTop + imageSize * 1.02, p.y);
  float alpha = float(px.a) * revealed * bottomFade;
  return half4(px.rgb * half(alpha), half(alpha));
}
`);

const FIRE_EDGE_SHADER = Skia.RuntimeEffect.Make(`
uniform float2 resolution;
uniform float time;
uniform float edge;
uniform float band;
uniform float imageTop;
uniform float imageBottom;
uniform float progress;

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453123);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

half4 main(float2 p) {
  float2 uv = p / resolution;
  float coarse = noise(float2(uv.x * 8.0 + time * 1.6, uv.y * 2.5 - time * 0.9));
  float mid = noise(float2(uv.x * 22.0 - time * 2.9, uv.y * 7.0 + time * 1.6));
  float fine = noise(float2(uv.x * 61.0 + time * 4.8, uv.y * 18.0 - time * 2.4));
  float ember = noise(float2(uv.x * 96.0 + time * 8.0, uv.y * 31.0 - time * 5.1));
  float tooth = step(0.72, noise(float2(uv.x * 34.0 - time * 3.3, time * 2.1))) * (fine - 0.5) * band * 1.8;
  float rag = (coarse - 0.5) * band * 0.95 + (mid - 0.5) * band * 0.85 + (fine - 0.5) * band * 0.38 + tooth;
  float burnEdge = edge + rag;
  float d = p.y - burnEdge;

  float tongue = noise(float2(uv.x * 27.0 + time * 5.4, time * 3.1 + uv.y * 5.0));
  float flameReach = band * (0.18 + tongue * 0.95);
  float upperFlame = smoothstep(-flameReach, 0.0, d) * (1.0 - smoothstep(0.0, band * 0.24, d));
  float charLine = smoothstep(-band * 0.18, band * 0.0, d) * (1.0 - smoothstep(band * 0.02, band * 0.24, d));
  float hotLine = (1.0 - smoothstep(0.0, band * 0.075, abs(d + (fine - 0.5) * band * 0.22))) * (0.9 + ember * 0.35);
  float yellowLip = (1.0 - smoothstep(0.0, band * 0.035, abs(d + band * 0.008))) * (0.82 + fine * 0.28);

  float3 fireColor = float3(1.0, 0.16, 0.018) * (hotLine * 0.9 + upperFlame * 0.24) + float3(1.0, 0.82, 0.08) * yellowLip;
  float3 charColor = float3(0.11, 0.047, 0.018) * charLine;
  float imageSize = imageBottom - imageTop;
  float yNorm = clamp((p.y - imageTop) / imageSize, 0.0, 1.0);
  float insideTravel = smoothstep(imageTop - band, imageBottom + band, edge);
  float finishFade = smoothstep(imageTop + band * 3.4, imageTop + band * 8.2, edge);
  float verticalLife = 1.0 - smoothstep(0.0, 1.0, abs(yNorm - clamp((edge - imageTop) / imageSize, 0.0, 1.0)) * 1.6);
  float alpha = max(charLine * 0.5, max(hotLine * 0.76, max(yellowLip, upperFlame * 0.26))) * insideTravel * finishFade * verticalLife;
  float3 color = charColor + fireColor;

  return half4(color, alpha);
}
`);

const HOME_BACKGROUND_SHADER = Skia.RuntimeEffect.Make(`
uniform float2 resolution;
uniform float time;

float hash(float2 p) {
  return fract(sin(dot(p, float2(41.0, 289.0))) * 45758.5453);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

half4 main(float2 p) {
  float2 uv = p / resolution;
  float vignette = smoothstep(0.92, 0.12, distance(uv, float2(0.52, 0.48)));
  float mesh = noise(uv * 2.2 + float2(time * 0.025, -time * 0.018));
  float topGlow = smoothstep(0.75, 0.0, distance(uv, float2(0.72, 0.12)));
  float lowerGlow = smoothstep(0.72, 0.0, distance(uv, float2(0.18, 0.78)));
  float ember = smoothstep(0.82, 1.0, mesh) * 0.12;
  float3 base = float3(0.018, 0.024, 0.036);
  float3 color = base + float3(0.04, 0.09, 0.22) * topGlow + float3(0.18, 0.07, 0.035) * lowerGlow + float3(0.07, 0.24, 0.12) * ember;
  color *= 0.82 + vignette * 0.38;
  return half4(color, 1.0);
}
`);

const mapBlocks = [
  { x: 38, y: 42, width: 150, height: 92, color: "#F7D6A6" },
  { x: 238, y: 54, width: 168, height: 120, color: "#D4ECD1" },
  { x: 602, y: 42, width: 186, height: 108, color: "#F0CFD2" },
  { x: 72, y: 250, width: 160, height: 150, color: "#E7D9F7" },
  { x: 312, y: 300, width: 195, height: 118, color: "#D6EEE8" },
  { x: 612, y: 350, width: 190, height: 132, color: "#F6E2B7" },
  { x: 66, y: 680, width: 190, height: 132, color: "#EACDD5" },
  { x: 340, y: 705, width: 204, height: 138, color: "#D3E9F6" },
  { x: 610, y: 735, width: 204, height: 130, color: "#D8EFD1" },
];

const vehicles = [
  { type: "bike", path: 0, delay: 0.05, color: "#0F9F6E" },
  { type: "car", path: 1, delay: 0.35, color: "#246BFD" },
  { type: "bike", path: 2, delay: 0.55, color: "#EA7A2A" },
  { type: "car", path: 3, delay: 0.78, color: "#E34B68" },
];

const rideHotspots = [
  { type: "car", x: 300, y: 206, color: "#246BFD" },
  { type: "bike", x: 570, y: 602, color: "#0F9F6E" },
  { type: "car", x: 430, y: 690, color: "#E34B68" },
  { type: "bike", x: 705, y: 492, color: "#EA7A2A" },
  { type: "car", x: 392, y: 398, color: "#246BFD" },
];

const driverStats = [
  { value: 171, label: "GPs" },
  { value: 1672, label: "PTS" },
  { value: 8, label: "Wins", pad: 2 },
  { value: 50, label: "Podiums" },
  { value: 27, label: "Poles" },
];

function createRoute(points) {
  const path = Skia.Path.Make();
  path.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    const [x, y] = points[i];
    const [px, py] = points[i - 1];
    path.quadTo((px + x) / 2, py, x, y);
  }
  return path;
}

function useMapGeometry() {
  return useMemo(() => {
    const routePoints = [
      [
        [40, 170],
        [180, 140],
        [350, 205],
        [535, 152],
        [875, 226],
      ],
      [
        [72, 760],
        [188, 620],
        [350, 548],
        [570, 602],
        [848, 488],
      ],
      [
        [270, 24],
        [308, 244],
        [270, 468],
        [372, 682],
        [540, 940],
      ],
      [
        [735, 48],
        [650, 245],
        [705, 492],
        [620, 675],
        [752, 960],
      ],
      [
        [42, 428],
        [205, 386],
        [392, 398],
        [560, 338],
        [876, 360],
      ],
    ];
    const routes = routePoints.map(createRoute);

    const sideStreets = [
      createRoute([
        [118, 65],
        [142, 224],
        [105, 394],
        [154, 688],
      ]),
      createRoute([
        [425, 28],
        [392, 210],
        [440, 436],
        [402, 840],
      ]),
      createRoute([
        [600, 42],
        [558, 232],
        [592, 475],
        [548, 875],
      ]),
      createRoute([
        [86, 290],
        [285, 262],
        [470, 292],
        [790, 276],
      ]),
      createRoute([
        [98, 650],
        [300, 648],
        [498, 690],
        [798, 630],
      ]),
      createRoute([
        [16, 535],
        [150, 514],
        [332, 520],
        [870, 550],
      ]),
      createRoute([
        [55, 870],
        [238, 812],
        [430, 885],
        [820, 800],
      ]),
    ];

    return { routePoints, routes, sideStreets };
  }, []);
}

function Vehicle({ clock, points, type, delay, color }) {
  const transform = useDerivedValue(() => {
    const loop = ((clock.value / 4200 + delay) % 1 + 1) % 1;
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * loop);
    const lastIndex = points.length - 1;
    const scaled = eased * lastIndex;
    const index = Math.min(Math.floor(scaled), lastIndex - 1);
    const local = scaled - index;
    const from = points[index];
    const to = points[index + 1];
    const x = from[0] + (to[0] - from[0]) * local;
    const y = from[1] + (to[1] - from[1]) * local;
    return [{ translateX: x }, { translateY: y }];
  }, [clock, points, delay]);

  const pulse = useDerivedValue(() => 5 + 4 * Math.sin(clock.value / 260), [clock]);

  return (
    <Group transform={transform}>
      <Circle cx={0} cy={0} r={pulse} color={color} opacity={0.16} />
      {type === "car" ? (
        <>
          <RoundedRect x={-12} y={-7} width={24} height={14} r={6} color={color} />
          <Rect x={-5} y={-10} width={10} height={6} color="#DFF6FF" />
          <Circle cx={-8} cy={9} r={3} color="#172033" />
          <Circle cx={8} cy={9} r={3} color="#172033" />
        </>
      ) : (
        <>
          <Circle cx={-9} cy={6} r={5} color="#172033" />
          <Circle cx={10} cy={6} r={5} color="#172033" />
          <Path path="M -9 6 L -1 -7 L 10 6 M -1 -7 L 7 -7" color={color} style="stroke" strokeWidth={3.5} strokeCap="round" strokeJoin="round" />
        </>
      )}
    </Group>
  );
}

function RideMarker({ x, y, type, color, active = false }) {
  return (
    <Group transform={[{ translateX: x }, { translateY: y }]} opacity={active ? 1 : 0.52}>
      <Circle cx={0} cy={0} r={active ? 17 : 13} color={color} opacity={active ? 0.24 : 0.14} />
      <Circle cx={0} cy={0} r={active ? 13 : 10} color="#FFFFFF" opacity={0.84} />
      {type === "car" ? (
        <>
          <RoundedRect x={-10} y={-6} width={20} height={12} r={5} color={color} />
          <Circle cx={-6} cy={7} r={2.4} color="#172033" />
          <Circle cx={6} cy={7} r={2.4} color="#172033" />
        </>
      ) : (
        <>
          <Circle cx={-7} cy={5} r={4} color="#172033" />
          <Circle cx={8} cy={5} r={4} color="#172033" />
          <Path path="M -7 5 L -1 -6 L 8 5 M -1 -6 L 6 -6" color={color} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
        </>
      )}
    </Group>
  );
}

function MapLayer({ active = false, clock, geometry }) {
  const { routes, sideStreets } = geometry;
  const roadColor = active ? "#FFFFFF" : "#C9DCE4";
  const arterialColor = active ? "#FFB74A" : "#AFCEDB";

  return (
    <>
      <Rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} color={active ? "#EAF8F5" : "#EAF3F4"} />
      <Circle cx={760} cy={255} r={180} color={active ? "#BFDDF8" : "#CDE3EE"} opacity={0.9} />
      <Circle cx={238} cy={336} r={170} color={active ? "#CFF0DA" : "#D3EADB"} opacity={0.9} />
      <Path path="M 770 95 C 930 210 870 410 910 560 C 830 615 736 592 665 506 C 630 366 655 196 770 95 Z" color={active ? "#A9D7F5" : "#C7E0ED"} opacity={0.92} />
      <Path path="M 196 210 C 308 190 418 256 420 364 C 382 468 244 500 132 438 C 100 330 118 250 196 210 Z" color={active ? "#BDE9C4" : "#D0E8D7"} opacity={0.94} />

      {mapBlocks.map((block, index) => (
        <RoundedRect
          key={`block-${index}`}
          x={block.x}
          y={block.y}
          width={block.width}
          height={block.height}
          r={24}
          color={active ? block.color : block.color}
          opacity={active ? 0.78 : 0.44}
        />
      ))}

      {sideStreets.map((path, index) => (
        <Path key={`street-${index}`} path={path} color={roadColor} style="stroke" strokeWidth={active ? 15 : 12} strokeCap="round" />
      ))}
      {routes.map((path, index) => (
        <Path key={`route-base-${index}`} path={path} color={index < 2 ? arterialColor : roadColor} style="stroke" strokeWidth={index < 2 ? 25 : 17} strokeCap="round" />
      ))}
      {routes.map((path, index) => (
        <Path key={`route-line-${index}`} path={path} color={active ? "#FFFFFF" : "#F9FCFD"} style="stroke" strokeWidth={2.4} strokeCap="round" opacity={active ? 0.72 : 0.5}>
          <DashPathEffect intervals={[12, 15]} />
        </Path>
      ))}

      {rideHotspots.map((marker) => (
        <RideMarker key={`${marker.type}-${marker.x}-${marker.y}`} active={active} {...marker} />
      ))}

      {active &&
        vehicles.map((vehicle) => (
          <Vehicle
            key={`${vehicle.type}-${vehicle.path}`}
            clock={clock}
            points={geometry.routePoints[vehicle.path]}
            type={vehicle.type}
            delay={vehicle.delay}
            color={vehicle.color}
          />
        ))}
    </>
  );
}

function MysteryTile({ clock, width, height }) {
  const cx = width / 2;
  const cy = height * 0.48;
  const tileWidth = Math.min(width * 0.38, 156);
  const tileHeight = tileWidth;
  const tileX = cx - tileWidth / 2;
  const tileY = cy - tileHeight / 2;
  const frame = 5;
  const innerX = tileX + frame;
  const innerY = tileY + frame;
  const innerWidth = tileWidth - frame * 2;
  const innerHeight = tileHeight - frame * 2;
  const rayTransform = useDerivedValue(() => [{ rotate: clock.value / 360 }], [clock]);

  return (
    <Group>
      <RoundedRect x={tileX - 20} y={tileY + 18} width={tileWidth + 40} height={tileHeight + 30} r={34} color="rgba(42,43,58,0.24)">
        <Blur blur={18} />
      </RoundedRect>
      <RoundedRect x={tileX - 10} y={tileY - 10} width={tileWidth + 20} height={tileHeight + 20} r={30} color="#E9E6DF">
        <Shadow dx={0} dy={18} blur={22} color="rgba(28,34,47,0.34)" />
        <Shadow dx={0} dy={5} blur={7} color="rgba(20,28,42,0.18)" />
      </RoundedRect>
      <RoundedRect x={tileX - 6} y={tileY - 6} width={tileWidth + 12} height={tileHeight + 12} r={27} color="#FFFFFF">
        <Shadow dx={0} dy={-4} blur={8} color="rgba(255,255,255,0.95)" />
        <Shadow dx={0} dy={4} blur={7} color="rgba(120,128,140,0.28)" inner />
      </RoundedRect>
      <Group clip={Skia.RRectXY(Skia.XYWHRect(innerX, innerY, innerWidth, innerHeight), 23, 23)}>
        <RoundedRect x={innerX} y={innerY} width={innerWidth} height={innerHeight} r={23}>
          <SweepGradient
            c={vec(cx, cy)}
            colors={["#0717D7", "#142FFF", "#2EA9FF", "#2057FF", "#583BFF", "#0717D7"]}
          />
        </RoundedRect>
        <Circle cx={cx} cy={cy} r={tileWidth * 0.58}>
          <RadialGradient c={vec(cx - tileWidth * 0.18, cy - tileHeight * 0.18)} r={tileWidth * 0.72} colors={["rgba(87,200,255,0.58)", "rgba(36,83,255,0.18)", "rgba(5,14,210,0.38)"]} />
        </Circle>
        <Group origin={vec(cx, cy)} transform={rayTransform}>
          <Path path={`M ${cx} ${cy} L ${innerX + innerWidth * 0.04} ${innerY} L ${innerX + innerWidth * 0.28} ${innerY} Z`} color="#FFFFFF" opacity={0.24} />
          <Path path={`M ${cx} ${cy} L ${innerX + innerWidth * 0.46} ${innerY} L ${innerX + innerWidth * 0.7} ${innerY} Z`} color="#8FDDFF" opacity={0.24} />
          <Path path={`M ${cx} ${cy} L ${innerX + innerWidth} ${innerY + innerHeight * 0.14} L ${innerX + innerWidth} ${innerY + innerHeight * 0.38} Z`} color="#FFFFFF" opacity={0.19} />
          <Path path={`M ${cx} ${cy} L ${innerX + innerWidth} ${innerY + innerHeight * 0.62} L ${innerX + innerWidth * 0.9} ${innerY + innerHeight} Z`} color="#FFFFFF" opacity={0.17} />
          <Path path={`M ${cx} ${cy} L ${innerX + innerWidth * 0.58} ${innerY + innerHeight} L ${innerX + innerWidth * 0.34} ${innerY + innerHeight} Z`} color="#67C8FF" opacity={0.22} />
          <Path path={`M ${cx} ${cy} L ${innerX + innerWidth * 0.08} ${innerY + innerHeight} L ${innerX} ${innerY + innerHeight * 0.76} Z`} color="#FFFFFF" opacity={0.16} />
          <Path path={`M ${cx} ${cy} L ${innerX} ${innerY + innerHeight * 0.5} L ${innerX} ${innerY + innerHeight * 0.26} Z`} color="#FFFFFF" opacity={0.18} />
        </Group>
        <Circle cx={cx - 28} cy={cy - 26} r={64} color="#FFFFFF" opacity={0.12}>
          <Blur blur={18} />
        </Circle>
      </Group>
    </Group>
  );
}

function MysteryQuestionOverlay({ width, height }) {
  const tileWidth = Math.min(width * 0.38, 156);
  const tileHeight = tileWidth;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.questionOverlay,
        {
          left: width / 2 - tileWidth / 2,
          top: height * 0.48 - tileHeight / 2,
          width: tileWidth,
          height: tileHeight,
        },
      ]}
    >
      <Text style={[styles.questionMark, { fontSize: tileHeight * 0.72, lineHeight: tileHeight * 0.75 }]}>?</Text>
    </View>
  );
}

function BrandPill() {
  return (
    <View pointerEvents="none" style={styles.brandPill}>
      <Text style={styles.brandIcon}>A</Text>
      <Text style={styles.brandText}>BUMP</Text>
    </View>
  );
}

function BackChevronIcon() {
  return <View pointerEvents="none" style={styles.backChevron} />;
}

function CardArrowIcon() {
  return (
    <View pointerEvents="none" style={styles.homeArrowCircle}>
      <View style={styles.homeArrowStem} />
      <View style={styles.homeArrowHead} />
    </View>
  );
}

function CountUpNumber({ value, pad = 0, delay = 0, style }) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let frame;
    let startTime;
    const duration = 820;
    const timer = setTimeout(() => {
      const tick = (time) => {
        if (startTime === undefined) {
          startTime = time;
        }
        const t = Math.min(1, (time - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplayValue(Math.round(value * eased));
        if (t < 1) {
          frame = requestAnimationFrame(tick);
        }
      };
      frame = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [delay, value]);

  return <Text style={style}>{String(displayValue).padStart(pad, "0")}</Text>;
}

function Ember({ clock, seed, width, height }) {
  const x = seed.x * width;
  const travel = height * (0.72 + seed.travel * 0.34);
  const cy = useDerivedValue(() => {
    const progress = ((clock.value / seed.speed + seed.delay) % 1 + 1) % 1;
    return height * (1.02 - seed.start * 0.12) - progress * travel;
  }, [clock, height, seed]);
  const cx = useDerivedValue(() => x + Math.sin(clock.value / seed.wobble + seed.delay * 8) * seed.drift * width, [clock, x, seed, width]);
  const opacity = useDerivedValue(() => {
    const progress = ((clock.value / seed.speed + seed.delay) % 1 + 1) % 1;
    const flutter = 0.72 + Math.sin(clock.value / 430 + seed.delay * 12) * 0.18;
    return Math.sin(Math.PI * progress) * seed.opacity * flutter;
  }, [clock, seed]);

  return <Circle cx={cx} cy={cy} r={seed.r} color={seed.color} opacity={opacity} />;
}

function FlameTongue({ clock, seed, width, height }) {
  const x = seed.x * width;
  const baseY = height * seed.base;
  const flameHeight = height * seed.height;
  const flameWidth = width * seed.width;
  const transform = useDerivedValue(() => {
    const wave = Math.sin(clock.value / seed.speed + seed.phase);
    const flicker = 1 + wave * 0.16 + Math.sin(clock.value / (seed.speed * 0.53) + seed.phase * 2.1) * 0.07;
    return [
      { translateX: x + wave * seed.drift * width },
      { translateY: baseY },
      { scaleX: 0.9 + flicker * 0.1 },
      { scaleY: flicker },
      { translateX: -x },
      { translateY: -baseY },
    ];
  }, [clock, x, baseY, seed, width]);
  const opacity = useDerivedValue(() => {
    return seed.opacity + Math.sin(clock.value / seed.speed + seed.phase) * 0.12;
  }, [clock, seed]);
  const flame = `M ${x - flameWidth * 0.5} ${baseY}
    C ${x - flameWidth * 0.72} ${baseY - flameHeight * 0.24}, ${x - flameWidth * 0.18} ${baseY - flameHeight * 0.45}, ${x - flameWidth * 0.05} ${baseY - flameHeight}
    C ${x + flameWidth * 0.4} ${baseY - flameHeight * 0.58}, ${x + flameWidth * 0.66} ${baseY - flameHeight * 0.28}, ${x + flameWidth * 0.45} ${baseY}
    Z`;

  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={flame}>
        <LinearGradient
          start={vec(x, baseY)}
          end={vec(x, baseY - flameHeight)}
          colors={seed.core ? ["rgba(255,255,246,0.68)", "rgba(255,181,45,0.48)", "rgba(255,54,19,0)"] : ["rgba(255,126,28,0.46)", "rgba(255,48,24,0.28)", "rgba(100,3,3,0)"]}
          positions={[0, 0.48, 1]}
        />
      </Path>
      <Path path={flame} color={seed.core ? "#FFD26F" : "#FF3A1F"} opacity={0.16}>
        <Blur blur={14} />
      </Path>
    </Group>
  );
}

function SmokeWisp({ clock, seed, width, height }) {
  const x = seed.x * width;
  const y = height * seed.y;
  const wisp = `M ${x} ${y}
    C ${x - seed.w * width} ${y - seed.h * height * 0.25}, ${x + seed.w * width} ${y - seed.h * height * 0.55}, ${x - seed.w * width * 0.2} ${y - seed.h * height}
    C ${x + seed.w * width * 0.8} ${y - seed.h * height * 0.72}, ${x - seed.w * width * 0.45} ${y - seed.h * height * 0.35}, ${x} ${y}`;
  const transform = useDerivedValue(() => {
    const drift = Math.sin(clock.value / seed.speed + seed.phase);
    const rise = ((clock.value / (seed.speed * 8) + seed.phase) % 1) * height * 0.035;
    return [{ translateX: drift * seed.drift * width }, { translateY: -rise }];
  }, [clock, seed, width, height]);
  const opacity = useDerivedValue(() => seed.opacity + Math.sin(clock.value / seed.speed + seed.phase) * 0.04, [clock, seed]);

  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={wisp} color="#7A6058" style="stroke" strokeWidth={seed.stroke} strokeCap="round">
        <Blur blur={18} />
      </Path>
    </Group>
  );
}

function VeilAsh({ clock, seed, index, edge, progress, imageHeight, contentLeft, contentRight }) {
  const cx = useDerivedValue(() => {
    const p = ((clock.value / seed.speed + seed.delay) % 1 + 1) % 1;
    const laneWidth = contentRight - contentLeft;
    return contentLeft + seed.x * laneWidth + Math.sin(clock.value / 230 + index) * seed.drift * laneWidth + p * seed.side * laneWidth;
  }, [clock, seed, index, contentLeft, contentRight]);
  const cy = useDerivedValue(() => {
    const p = ((clock.value / seed.speed + seed.delay) % 1 + 1) % 1;
    return edge.value + p * imageHeight * 0.13 + seed.y * imageHeight * 0.038;
  }, [clock, seed, imageHeight, edge]);
  const opacity = useDerivedValue(() => {
    const p = ((clock.value / seed.speed + seed.delay) % 1 + 1) % 1;
    const startFade = Math.min(1, progress.value / 0.08);
    const endFade = Math.max(0, 1 - Math.max(0, progress.value - 0.86) / 0.12);
    return Math.sin(Math.PI * p) * seed.opacity * startFade * endFade;
  }, [clock, seed, progress]);

  return <Circle cx={cx} cy={cy} r={seed.r} color={seed.color} opacity={opacity} />;
}

function DriverBurnReveal({ top, imageWidth, imageHeight }) {
  const image = useImage(DRIVER_IMAGE);
  const clock = useClock();
  const burnProgress = useSharedValue(0);
  const imageDrawSize = Math.min(imageWidth, imageHeight);
  const imageTop = (imageHeight - imageDrawSize) / 2;
  const imageBottom = imageTop + imageDrawSize;
  const imageLeft = (imageWidth - imageDrawSize) / 2;
  const imageRect = { x: imageLeft, y: imageTop, width: imageDrawSize, height: imageDrawSize };
  const contentLeft = imageLeft + imageDrawSize * 0.1;
  const contentRight = imageLeft + imageDrawSize * 0.92;
  const burnStart = imageBottom - imageDrawSize * 0.012;
  const burnEnd = imageTop + imageDrawSize * 0.028;
  const edgeHeight = imageDrawSize * 0.05;
  const veilSeeds = useMemo(
    () =>
      Array.from({ length: 54 }, (_, index) => ({
        x: 0.08 + ((index * 29) % 100) / 100 * 0.86,
        y: ((index * 47) % 100) / 100,
        r: 0.45 + ((index * 11) % 13) / 10,
        speed: 520 + ((index * 137) % 780),
        delay: ((index * 17) % 100) / 100,
        drift: 0.01 + ((index * 9) % 30) / 1000,
        side: -0.035 + ((index * 31) % 70) / 1000,
        opacity: 0.18 + ((index * 19) % 42) / 100,
        color: index % 4 === 0 ? "#19120E" : index % 3 === 0 ? "#4F3427" : "#A97448",
      })),
    []
  );
  React.useEffect(() => {
    burnProgress.value = 0;
    burnProgress.value = withTiming(1, {
      duration: 2350,
      easing: Easing.linear,
    });
  }, [burnProgress]);
  const burnY = useDerivedValue(() => {
    const progress = burnProgress.value;
    const flutter = Math.sin(clock.value / 78) * edgeHeight * 0.18 + Math.sin(clock.value / 141) * edgeHeight * 0.12;
    return burnStart - progress * (burnStart - burnEnd) + flutter;
  }, [clock, burnProgress, burnStart, burnEnd, edgeHeight]);
  const fireLayerOpacity = useDerivedValue(() => {
    const t = Math.min(1, Math.max(0, (burnProgress.value - 0.86) / 0.12));
    return 1 - t * t * (3 - 2 * t);
  }, [burnProgress]);
  const shaderUniforms = useDerivedValue(
    () => ({
      resolution: [imageWidth, imageHeight],
      time: clock.value / 1000,
      edge: burnY.value,
      band: edgeHeight,
      imageTop,
      imageBottom,
      progress: burnProgress.value,
      contentLeft,
      contentRight,
    }),
    [clock, burnY, burnProgress, imageWidth, imageHeight, edgeHeight, imageTop, imageBottom, contentLeft, contentRight]
  );
  return (
    <Canvas pointerEvents="none" style={[styles.fireReveal, { top, right: -58, width: imageWidth, height: imageHeight }]}>
      {image && DRIVER_REVEAL_SHADER ? (
        <Rect x={0} y={0} width={imageWidth} height={imageHeight}>
          <Shader source={DRIVER_REVEAL_SHADER} uniforms={shaderUniforms}>
            <ImageShader image={image} fit="contain" rect={imageRect} tx="decal" ty="decal" />
          </Shader>
        </Rect>
      ) : null}
      <Group opacity={fireLayerOpacity}>
        {image && FIRE_EDGE_SHADER ? (
          <Mask mode="alpha" mask={<SkiaImage image={image} fit="contain" rect={imageRect} />}>
            <Rect x={0} y={0} width={imageWidth} height={imageHeight}>
              <Shader source={FIRE_EDGE_SHADER} uniforms={shaderUniforms} />
            </Rect>
          </Mask>
        ) : null}
        {veilSeeds.map((seed, index) => (
          <VeilAsh
            key={`veil-ash-${index}`}
            clock={clock}
            seed={seed}
            index={index}
            edge={burnY}
            progress={burnProgress}
            imageHeight={imageHeight}
            contentLeft={contentLeft}
            contentRight={contentRight}
          />
        ))}
      </Group>
    </Canvas>
  );
}

function DriverImageBottomFade({ width, height }) {
  // Blends the lower half of the driver image into the warm-dark background
  // by layering a soft warm-red wash with a tighter ground fade beneath it.
  const fadeHeight = height * 0.52;
  return (
    <Canvas
      pointerEvents="none"
      style={[styles.driverImageFade, { width, height: fadeHeight }]}
    >
      {/* Warm red wash that picks up the background glow as the figure dissolves */}
      <Rect x={0} y={0} width={width} height={fadeHeight}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, fadeHeight)}
          colors={[
            "rgba(0,0,0,0)",
            "rgba(60,10,10,0.24)",
            "rgba(70,12,12,0.56)",
            "rgba(40,8,8,0.84)",
            "rgba(14,3,3,0.95)",
            "#050101",
          ]}
          positions={[0, 0.12, 0.34, 0.62, 0.86, 1]}
        />
      </Rect>
      {/* Radial warm glow seeded near where the figure dissolves, so the blend
          feels like ambient light, not a flat overlay */}
      <Circle cx={width * 0.72} cy={fadeHeight * 0.45} r={width * 0.85}>
        <RadialGradient
          c={vec(width * 0.72, fadeHeight * 0.45)}
          r={width * 0.85}
          colors={[
            "rgba(255,72,32,0.22)",
            "rgba(180,28,28,0.12)",
            "rgba(40,8,8,0.06)",
            "rgba(0,0,0,0)",
          ]}
          positions={[0, 0.35, 0.65, 1]}
        />
      </Circle>
      {/* Final ground darkening so the very bottom merges with the page bg */}
      <Rect x={0} y={fadeHeight * 0.7} width={width} height={fadeHeight * 0.3}>
        <LinearGradient
          start={vec(0, fadeHeight * 0.7)}
          end={vec(0, fadeHeight)}
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)", "#000000"]}
        />
      </Rect>
    </Canvas>
  );
}

function DriverProfileCanvas({ width, height }) {
  const clock = useClock();
  const embers = useMemo(
    () =>
      Array.from({ length: 82 }, (_, index) => {
        const t = (index * 37) % 101;
        return {
          x: 0.1 + ((t % 83) / 83) * 0.82,
          start: (index % 7) / 7,
          travel: ((index * 19) % 100) / 100,
          delay: ((index * 13) % 100) / 100,
          drift: 0.012 + (((index * 23) % 50) / 50) * 0.034,
          speed: 1900 + ((index * 311) % 3800),
          wobble: 360 + ((index * 97) % 820),
          opacity: 0.1 + (((index * 29) % 70) / 70) * 0.42,
          r: 0.65 + ((index * 17) % 34) / 13,
          color: index % 5 === 0 ? "#4B3226" : index % 3 === 0 ? "#A66A3C" : "#D19254",
        };
      }),
    []
  );
  const smokeWisps = useMemo(
    () =>
      Array.from({ length: 9 }, (_, index) => ({
        x: 0.42 + ((index * 17) % 58) / 100,
        y: 0.72 + ((index * 13) % 20) / 100,
        w: 0.08 + ((index * 9) % 13) / 100,
        h: 0.18 + ((index * 5) % 13) / 100,
        stroke: 16 + ((index * 7) % 18),
        speed: 1600 + ((index * 211) % 1200),
        phase: index * 0.9,
        drift: 0.012 + ((index * 3) % 11) / 1000,
        opacity: 0.1 + ((index * 5) % 11) / 100,
      })),
    []
  );
  const heatSweep = useDerivedValue(() => [{ rotate: clock.value / 3600 }], [clock]);

  return (
    <Canvas style={[styles.canvas, { width, height }]}>
      <Fill>
        <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={["#1A0606", "#2A0808", "#160404", "#0A0202"]} />
      </Fill>
      {/* Wide red ambience covering most of the screen */}
      <Circle cx={width * 0.72} cy={height * 0.5} r={width * 1.15}>
        <RadialGradient
          c={vec(width * 0.72, height * 0.5)}
          r={width * 1.1}
          colors={["rgba(255,52,52,0.62)", "rgba(214,28,32,0.42)", "rgba(180,18,22,0.22)", "rgba(80,8,8,0.12)", "rgba(0,0,0,0)"]}
        />
      </Circle>
      {/* Warm orange lift on the lower-right so the bottom doesn't go flat black */}
      <Circle cx={width * 0.78} cy={height * 0.82} r={width * 0.85}>
        <RadialGradient c={vec(width * 0.78, height * 0.82)} r={width * 0.82} colors={["rgba(255,130,30,0.32)", "rgba(255,60,24,0.16)", "rgba(0,0,0,0)"]} />
      </Circle>
      <Circle cx={width * 0.92} cy={height * 0.6} r={width * 0.52}>
        <RadialGradient c={vec(width * 0.92, height * 0.6)} r={width * 0.52} colors={["rgba(255,214,72,0.18)", "rgba(255,93,18,0.16)", "rgba(0,0,0,0)"]} />
      </Circle>
      <Group origin={vec(width * 0.7, height * 0.5)} transform={heatSweep} opacity={0.32}>
        <Circle cx={width * 0.7} cy={height * 0.5} r={width * 0.9}>
          <SweepGradient c={vec(width * 0.7, height * 0.5)} colors={["rgba(255,255,255,0)", "rgba(255,111,35,0.12)", "rgba(255,255,255,0)", "rgba(255,31,31,0.14)", "rgba(255,255,255,0)"]} />
        </Circle>
      </Group>
      {smokeWisps.map((seed, index) => (
        <SmokeWisp key={`smoke-${index}`} clock={clock} seed={seed} width={width} height={height} />
      ))}

      {/* Soft top-down darkening so the driver's dark hair separates from the red */}
      <Rect x={0} y={0} width={width} height={height * 0.5}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height * 0.5)} colors={["rgba(0,0,0,0.92)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.12)", "rgba(0,0,0,0)"]} />
      </Rect>
      {/* Tight dark halo right behind the head so the hair reads against the bg */}
      <Circle cx={width * 0.62} cy={height * 0.26} r={width * 0.5}>
        <RadialGradient
          c={vec(width * 0.62, height * 0.26)}
          r={width * 0.5}
          colors={["rgba(0,0,0,0.78)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.18)", "rgba(0,0,0,0)"]}
          positions={[0, 0.4, 0.75, 1]}
        />
      </Circle>
      {/* Left-side darkening so the stat numbers stay readable over the wider red */}
      <Rect x={0} y={0} width={width * 0.5} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(width * 0.5, 0)} colors={["rgba(0,0,0,0.72)", "rgba(0,0,0,0.28)", "rgba(0,0,0,0)"]} />
      </Rect>

      {embers.map((seed, index) => (
        <Ember key={`ember-${index}`} clock={clock} seed={seed} width={width} height={height} />
      ))}

      {/* Gentle bottom fade so the Explore button sits on a clean base */}
      <Rect x={0} y={height * 0.78} width={width} height={height * 0.22}>
        <LinearGradient start={vec(0, height * 0.78)} end={vec(0, height)} colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.92)"]} />
      </Rect>
    </Canvas>
  );
}

function HomeShowcaseCanvas({ width, height }) {
  const clock = useClock();
  const uniforms = useDerivedValue(
    () => ({
      resolution: [width, height],
      time: clock.value / 1000,
    }),
    [clock, width, height]
  );
  const orbit = useDerivedValue(() => [{ rotate: clock.value / 5200 }], [clock]);
  const counterOrbit = useDerivedValue(() => [{ rotate: -clock.value / 6800 }], [clock]);
  const sparks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        x: 0.08 + (((index * 37) % 100) / 100) * 0.84,
        y: 0.1 + (((index * 53) % 100) / 100) * 0.78,
        r: 0.55 + ((index * 11) % 16) / 12,
        speed: 2600 + ((index * 197) % 4200),
        phase: index * 0.73,
        color: index % 4 === 0 ? "#87F79A" : index % 3 === 0 ? "#FF8B4A" : "#7EA1FF",
      })),
    []
  );

  return (
    <Canvas pointerEvents="none" style={styles.homeCanvas}>
      <Rect x={0} y={0} width={width} height={height}>
        {HOME_BACKGROUND_SHADER ? <Shader source={HOME_BACKGROUND_SHADER} uniforms={uniforms} /> : <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={["#080B12", "#101A34"]} />}
      </Rect>
      <Group origin={vec(width * 0.78, height * 0.18)} transform={orbit} opacity={0.32}>
        <Circle cx={width * 0.78} cy={height * 0.18} r={width * 0.34} color="rgba(93,128,255,0.1)" />
        <Circle cx={width * 0.78} cy={height * 0.18} r={width * 0.2} color="rgba(125,245,138,0.035)" />
      </Group>
      <Group origin={vec(width * 0.14, height * 0.82)} transform={counterOrbit} opacity={0.26}>
        <Circle cx={width * 0.14} cy={height * 0.82} r={width * 0.44} color="rgba(255,96,42,0.045)" />
      </Group>
      {sparks.map((spark, index) => (
        <HomeSpark key={`home-spark-${index}`} clock={clock} spark={spark} width={width} height={height} />
      ))}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={["rgba(0,0,0,0.12)", "rgba(0,0,0,0)", "rgba(0,0,0,0.38)"]} />
      </Rect>
    </Canvas>
  );
}

function HomeSpark({ clock, spark, width, height }) {
  const cx = useDerivedValue(() => {
    const p = ((clock.value / spark.speed + spark.phase) % 1 + 1) % 1;
    return spark.x * width + Math.sin(clock.value / 600 + spark.phase) * width * 0.025 + p * width * 0.035;
  }, [clock, spark, width]);
  const cy = useDerivedValue(() => {
    const p = ((clock.value / spark.speed + spark.phase) % 1 + 1) % 1;
    return spark.y * height - Math.sin(p * Math.PI) * height * 0.05;
  }, [clock, spark, height]);
  const opacity = useDerivedValue(() => {
    const p = ((clock.value / spark.speed + spark.phase) % 1 + 1) % 1;
    return 0.08 + Math.sin(p * Math.PI) * 0.22;
  }, [clock, spark]);

  return <Circle cx={cx} cy={cy} r={spark.r} color={spark.color} opacity={opacity} />;
}

function RideDiscoveryCanvas({ width, height }) {
  const clock = useClock();
  const geometry = useMapGeometry();
  const canvasWidth = width;
  const canvasHeight = height;
  const scale = Math.max(canvasWidth / MAP_WIDTH, canvasHeight / MAP_HEIGHT) * 1.04;

  const mapX = useDerivedValue(() => -190 + Math.sin(clock.value / 2800) * 72 + Math.sin(clock.value / 5200) * 34, [clock]);
  const mapY = useDerivedValue(() => -58 + Math.cos(clock.value / 3200) * 52 + Math.sin(clock.value / 4700) * 28, [clock]);
  const mapTransform = useDerivedValue(() => [{ scale }, { translateX: mapX.value }, { translateY: mapY.value }], [mapX, mapY, scale]);

  return (
    <Canvas style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}>
      <Fill>
        <LinearGradient start={vec(0, 0)} end={vec(canvasWidth, canvasHeight)} colors={["#EAF5F5", "#F8FBF7", "#E9F0FA"]} />
      </Fill>
      <Circle cx={canvasWidth * 0.5} cy={canvasHeight * 0.17} r={canvasWidth * 0.8}>
        <RadialGradient c={vec(canvasWidth * 0.5, canvasHeight * 0.08)} r={canvasWidth * 0.78} colors={["rgba(24,32,255,0.42)", "rgba(24,32,255,0.14)", "rgba(24,32,255,0)"]} />
      </Circle>

      <Group transform={mapTransform}>
        <MapLayer clock={clock} geometry={geometry} />
      </Group>

      <Rect x={0} y={0} width={canvasWidth} height={canvasHeight * 0.43}>
        <LinearGradient start={vec(0, 0)} end={vec(0, canvasHeight * 0.43)} colors={["#1511FF", "rgba(36,83,255,0.78)", "rgba(36,83,255,0)"]} />
      </Rect>

      <MysteryTile clock={clock} width={canvasWidth} height={canvasHeight} />

      <Rect x={0} y={canvasHeight * 0.58} width={canvasWidth} height={canvasHeight * 0.42}>
        <LinearGradient start={vec(0, canvasHeight * 0.58)} end={vec(0, canvasHeight)} colors={["rgba(248,251,247,0)", "rgba(248,251,247,0.96)"]} />
      </Rect>
    </Canvas>
  );
}

export default function Page() {
  const { width, height } = useWindowDimensions();
  const [screen, setScreen] = React.useState("home");

  if (screen === "profile") {
    return <DriverProfileScreen width={width} height={height} onBack={() => setScreen("home")} />;
  }

  if (screen === "discovery") {
    return <MapAnimationScreen width={width} height={height} onBack={() => setScreen("home")} />;
  }

  return <DemoHomeScreen width={width} height={height} onSelectMap={() => setScreen("discovery")} onSelectFire={() => setScreen("profile")} />;
}

function DemoHomeScreen({ width, height, onSelectMap, onSelectFire }) {
  return (
    <View style={styles.homeContainer}>
      <HomeShowcaseCanvas width={width} height={height} />
      <Text style={styles.homeKicker}>Skia learning demos</Text>
      <Text style={styles.homeTitle}>Animation recipes</Text>
      <Text style={styles.homeSubtitle}>Two focused examples for studying canvas motion, shaders, masks, and animated UI composition.</Text>

      <View style={styles.homeOptions}>
        <Pressable style={styles.homeOption} onPress={onSelectMap}>
          <Text style={styles.homeOptionNumber}>01</Text>
          <View style={styles.homeOptionCopy}>
            <Text style={styles.homeOptionTitle}>Map animation</Text>
            <Text style={styles.homeOptionText}>Animated route map, mystery tile, riders and vehicles.</Text>
          </View>
          <CardArrowIcon />
        </Pressable>

        <Pressable style={[styles.homeOption, styles.homeOptionFire]} onPress={onSelectFire}>
          <Text style={styles.homeOptionNumber}>02</Text>
          <View style={styles.homeOptionCopy}>
            <Text style={styles.homeOptionTitle}>Fire veil shader</Text>
            <Text style={styles.homeOptionText}>Masked burn reveal with ashes, glow, and count-up stats.</Text>
          </View>
          <CardArrowIcon />
        </Pressable>
      </View>
    </View>
  );
}

function MapAnimationScreen({ width, height, onBack }) {
  return (
    <View style={styles.container}>
      <RideDiscoveryCanvas width={width} height={height} />
      <Pressable style={styles.mapBackButton} onPress={onBack}>
        <BackChevronIcon />
      </Pressable>
      <BrandPill />
      <View pointerEvents="none" style={styles.topContent}>
        <Text style={styles.eyebrow}>+3 ride zones found</Text>
        <Text style={styles.topTitle}>Unlock them on your route</Text>
      </View>
      <MysteryQuestionOverlay width={width} height={height} />
    </View>
  );
}

function DriverProfileScreen({ width, height, onBack }) {
  const compact = height < 760;
  const driverImageWidth = width * 0.98;
  const driverImageHeight = height * 0.66;
  const driverImageTop = height * 0.16;
  return (
    <View style={styles.profileContainer}>
      <DriverProfileCanvas width={width} height={height} />
      <View style={styles.profileHeader}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <BackChevronIcon />
          <Text style={styles.backText}>Back to map</Text>
        </Pressable>
        <Text style={styles.moreText}>...</Text>
      </View>

      <Text
        pointerEvents="none"
        style={[
          styles.bigNumber,
          { fontSize: Math.min(width * 0.78, 360), top: height * 0.22, left: width * 0.18 },
        ]}
      >
        1
      </Text>
      <Text
        pointerEvents="none"
        style={[
          styles.bigNumberEdge,
          { fontSize: Math.min(width * 0.78, 360), top: height * 0.22, left: width * 0.18 },
        ]}
      >
        1
      </Text>

      <View style={[styles.profileCopy, { top: compact ? 98 : 122 }]}>
        <Text style={styles.driverFirst}>Charles</Text>
        <Text style={styles.driverLast}>Leclerc</Text>
        <Text style={styles.driverMeta}>Race profile / 2018 - 2025</Text>
      </View>

      <DriverBurnReveal top={driverImageTop} imageWidth={driverImageWidth} imageHeight={driverImageHeight} />
      <DriverImageBottomFade width={width} height={height} />

      <View style={[styles.statsRail, { top: compact ? 232 : 290 }]}>
        {driverStats.map((stat, index) => (
          <View key={stat.label} style={[styles.statRow, index === 1 && styles.statRowLarge]}>
            <CountUpNumber
              value={stat.value}
              pad={stat.pad}
              delay={index * 90}
              style={[styles.statValue, index < 2 && styles.statValueLarge]}
            />
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View pointerEvents="none" style={styles.circuitInfo}>
        <Text style={styles.circuitKicker}>Circuit brief</Text>
        <View style={styles.circuitInfoRow}>
          <View style={styles.circuitMetric}>
            <Text style={styles.circuitMetricValue}>Street</Text>
            <Text style={styles.circuitMetricLabel}>Setup</Text>
          </View>
          <View style={styles.circuitMetric}>
            <Text style={styles.circuitMetricValue}>Soft</Text>
            <Text style={styles.circuitMetricLabel}>Tyre window</Text>
          </View>
          <View style={styles.circuitMetric}>
            <Text style={styles.circuitMetricValue}>+0.21</Text>
            <Text style={styles.circuitMetricLabel}>Race pace</Text>
          </View>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#080B12",
    overflow: "hidden",
  },
  homeCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  homeKicker: {
    color: "#7DF58A",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  homeTitle: {
    marginTop: 10,
    color: "#FFFFFF",
    fontSize: 39,
    lineHeight: 43,
    fontWeight: "900",
    letterSpacing: 0,
  },
  homeSubtitle: {
    marginTop: 12,
    maxWidth: 310,
    color: "rgba(255,255,255,0.62)",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    letterSpacing: 0,
  },
  homeOptions: {
    marginTop: 34,
    gap: 14,
  },
  homeOption: {
    minHeight: 118,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  homeOptionFire: {
    backgroundColor: "rgba(82,22,14,0.42)",
    borderColor: "rgba(255,126,72,0.22)",
  },
  homeOptionNumber: {
    width: 38,
    color: "rgba(255,255,255,0.42)",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
    letterSpacing: 0,
  },
  homeOptionCopy: {
    flex: 1,
  },
  homeOptionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
    letterSpacing: 0,
  },
  homeOptionText: {
    marginTop: 6,
    color: "rgba(255,255,255,0.58)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 0,
  },
  homeArrowCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  homeArrowStem: {
    position: "absolute",
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  homeArrowHead: {
    width: 11,
    height: 11,
    borderRightWidth: 3,
    borderTopWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 1,
    transform: [{ rotate: "45deg" }, { translateX: -1 }],
  },
  container: {
    flex: 1,
    backgroundColor: "#EAF5F5",
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
  brandPill: {
    position: "absolute",
    top: 78,
    alignSelf: "center",
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 14,
    backgroundColor: "rgba(64,67,255,0.34)",
    paddingHorizontal: 10,
  },
  brandIcon: {
    color: "#80FF82",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  brandText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0,
  },
  topContent: {
    position: "absolute",
    left: 24,
    right: 24,
    top: 106,
    alignItems: "center",
  },
  eyebrow: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  topTitle: {
    marginTop: 14,
    maxWidth: 330,
    color: "#FFFFFF",
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: 0,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.14)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  questionOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  questionMark: {
    color: "#FFFFFF",
    fontWeight: "900",
    lineHeight: 116,
    textShadowColor: "#2C70FF",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 7,
  },
  mapBackButton: {
    position: "absolute",
    top: 58,
    left: 22,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    zIndex: 7,
  },
  profileContainer: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  profileHeader: {
    position: "absolute",
    top: 58,
    left: 22,
    right: 22,
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 4,
  },
  backButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  backChevron: {
    width: 16,
    height: 16,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: "#FFFFFF",
    borderRadius: 1,
    transform: [{ rotate: "45deg" }],
  },
  backIcon: {
    color: "#FFFFFF",
    fontSize: 31,
    lineHeight: 34,
    fontWeight: "900",
  },
  backText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0,
  },
  moreText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 1,
  },
  bigNumber: {
    position: "absolute",
    color: "rgba(255,255,255,0.06)",
    fontWeight: "900",
    letterSpacing: 0,
    zIndex: 2,
  },
  bigNumberEdge: {
    position: "absolute",
    color: "rgba(255,44,44,0.07)",
    fontWeight: "900",
    letterSpacing: 0,
    textShadowColor: "rgba(255,255,255,0.1)",
    textShadowOffset: { width: 1, height: 0 },
    textShadowRadius: 1,
    zIndex: 2,
  },
  profileCopy: {
    position: "absolute",
    left: 24,
    zIndex: 4,
  },
  driverFirst: {
    color: "#FFFFFF",
    fontSize: 43,
    lineHeight: 48,
    fontWeight: "900",
    letterSpacing: 0,
  },
  driverLast: {
    marginTop: 2,
    color: "#FF333B",
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
    letterSpacing: 0,
  },
  driverMeta: {
    marginTop: 8,
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 0,
  },
  fireReveal: {
    position: "absolute",
    zIndex: 5,
  },
  driverImageFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 6,
  },
  statsRail: {
    position: "absolute",
    left: 24,
    width: 138,
    zIndex: 7,
  },
  statRow: {
    marginBottom: 17,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
  },
  statRowLarge: {
    marginBottom: 27,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 29,
    lineHeight: 32,
    fontWeight: "900",
    letterSpacing: 0,
  },
  statValueLarge: {
    fontSize: 42,
    lineHeight: 47,
  },
  statLabel: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 0,
  },
  circuitInfo: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 112,
    zIndex: 7,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "rgba(18,12,11,0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,154,90,0.16)",
  },
  circuitKicker: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  circuitInfoRow: {
    marginTop: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  circuitMetric: {
    flex: 1,
  },
  circuitMetricValue: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900",
    letterSpacing: 0,
  },
  circuitMetricLabel: {
    marginTop: 2,
    color: "rgba(255,255,255,0.48)",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },
});
