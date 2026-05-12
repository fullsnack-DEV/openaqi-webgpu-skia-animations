import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import {
  Blur,
  Canvas,
  Circle,
  DashPathEffect,
  Fill,
  Group,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  RoundedRect,
  Shadow,
  Skia,
  SweepGradient,
  useClock,
  vec,
} from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

const MAP_WIDTH = 920;
const MAP_HEIGHT = 980;
const DRIVER_IMAGE = require("../assets/charles-leclerc.png");

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
  { value: "171", label: "GPs" },
  { value: "1672", label: "PTS" },
  { value: "08", label: "Wins" },
  { value: "50", label: "Podiums" },
  { value: "27", label: "Poles" },
];

const roundBars = [5, 1, 8, 8, 9, 4, 5, 10, 9, 6, 9, 1, 9, 8, 1, 8, 2, 5, 9, 10, 1, 8, 2, 8];

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

function Ember({ clock, seed, width, height }) {
  const x = seed.x * width;
  const travel = height * (0.34 + seed.travel * 0.3);
  const cy = useDerivedValue(() => {
    const progress = ((clock.value / seed.speed + seed.delay) % 1 + 1) % 1;
    return height * (0.94 - seed.start * 0.18) - progress * travel;
  }, [clock, height, seed]);
  const cx = useDerivedValue(() => x + Math.sin(clock.value / seed.wobble + seed.delay * 8) * seed.drift * width, [clock, x, seed, width]);
  const opacity = useDerivedValue(() => {
    const progress = ((clock.value / seed.speed + seed.delay) % 1 + 1) % 1;
    return Math.sin(Math.PI * progress) * seed.opacity;
  }, [clock, seed]);

  return <Circle cx={cx} cy={cy} r={seed.r} color={seed.color} opacity={opacity} />;
}

function DriverProfileCanvas({ width, height }) {
  const clock = useClock();
  const embers = useMemo(
    () =>
      Array.from({ length: 38 }, (_, index) => {
        const t = (index * 37) % 101;
        return {
          x: 0.1 + ((t % 83) / 83) * 0.82,
          start: (index % 7) / 7,
          travel: ((index * 19) % 100) / 100,
          delay: ((index * 13) % 100) / 100,
          drift: 0.012 + (((index * 23) % 50) / 50) * 0.03,
          speed: 2600 + ((index * 311) % 2700),
          wobble: 540 + ((index * 97) % 620),
          opacity: 0.18 + (((index * 29) % 70) / 70) * 0.52,
          r: 1.1 + ((index * 17) % 32) / 12,
          color: index % 4 === 0 ? "#FFE2A5" : index % 3 === 0 ? "#FF5B2E" : "#FFB13B",
        };
      }),
    []
  );

  const heatSweep = useDerivedValue(() => [{ rotate: clock.value / 3600 }], [clock]);
  const chartLeft = 76;
  const chartTop = height * 0.68;
  const chartWidth = width - chartLeft - 34;
  const barGap = 7;
  const barWidth = Math.max(5, Math.min(9, (chartWidth - barGap * (roundBars.length - 1)) / roundBars.length));

  return (
    <Canvas style={[styles.canvas, { width, height }]}>
      <Fill>
        <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={["#150706", "#260707", "#030303", "#000000"]} />
      </Fill>
      <Circle cx={width * 0.78} cy={height * 0.25} r={width * 0.78}>
        <RadialGradient c={vec(width * 0.8, height * 0.23)} r={width * 0.74} colors={["rgba(255,42,42,0.66)", "rgba(199,17,26,0.34)", "rgba(255,87,24,0.08)", "rgba(0,0,0,0)"]} />
      </Circle>
      <Circle cx={width * 0.64} cy={height * 0.55} r={width * 0.5}>
        <RadialGradient c={vec(width * 0.65, height * 0.5)} r={width * 0.48} colors={["rgba(255,150,27,0.34)", "rgba(255,60,24,0.12)", "rgba(0,0,0,0)"]} />
      </Circle>
      <Group origin={vec(width * 0.74, height * 0.38)} transform={heatSweep} opacity={0.42}>
        <Circle cx={width * 0.74} cy={height * 0.38} r={width * 0.68}>
          <SweepGradient c={vec(width * 0.74, height * 0.38)} colors={["rgba(255,255,255,0)", "rgba(255,111,35,0.16)", "rgba(255,255,255,0)", "rgba(255,31,31,0.18)", "rgba(255,255,255,0)"]} />
        </Circle>
      </Group>

      <Path path={`M ${width * 0.05} ${height * 0.5} C ${width * 0.22} ${height * 0.42} ${width * 0.22} ${height * 0.3} ${width * 0.34} ${height * 0.2} C ${width * 0.28} ${height * 0.42} ${width * 0.5} ${height * 0.5} ${width * 0.44} ${height * 0.7} C ${width * 0.28} ${height * 0.64} ${width * 0.17} ${height * 0.6} ${width * 0.05} ${height * 0.5} Z`} color="rgba(255,92,21,0.09)" />
      <Path path={`M ${width * 0.55} ${height * 0.42} C ${width * 0.84} ${height * 0.32} ${width * 0.82} ${height * 0.16} ${width * 1.08} ${height * 0.08} C ${width * 0.96} ${height * 0.34} ${width * 1.04} ${height * 0.61} ${width * 0.68} ${height * 0.72} C ${width * 0.7} ${height * 0.58} ${width * 0.64} ${height * 0.5} ${width * 0.55} ${height * 0.42} Z`} color="rgba(255,42,42,0.12)" />

      {embers.map((seed, index) => (
        <Ember key={`ember-${index}`} clock={clock} seed={seed} width={width} height={height} />
      ))}

      <Rect x={0} y={height * 0.5} width={width} height={height * 0.5}>
        <LinearGradient start={vec(0, height * 0.5)} end={vec(0, height)} colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.78)", "#000000"]} />
      </Rect>

      <Path path={`M ${chartLeft - 2} ${chartTop + 112} L ${chartLeft + chartWidth} ${chartTop + 112}`} color="rgba(255,255,255,0.12)" style="stroke" strokeWidth={1} />
      {[0, 1, 2, 3].map((line) => (
        <Path key={`grid-${line}`} path={`M ${chartLeft} ${chartTop + line * 26} L ${chartLeft + chartWidth} ${chartTop + line * 26}`} color="rgba(255,255,255,0.08)" style="stroke" strokeWidth={1} />
      ))}
      {roundBars.map((value, index) => {
        const h = value * 11;
        const x = chartLeft + index * (barWidth + barGap);
        const hot = index % 5 !== 1 && index % 9 !== 2;
        return (
          <RoundedRect
            key={`bar-${index}`}
            x={x}
            y={chartTop + 112 - h}
            width={barWidth}
            height={h}
            r={barWidth / 2}
            color={hot ? "#FF3039" : "rgba(255,255,255,0.14)"}
          />
        );
      })}
    </Canvas>
  );
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
  const [screen, setScreen] = React.useState("discovery");

  if (screen === "profile") {
    return <DriverProfileScreen width={width} height={height} onBack={() => setScreen("discovery")} />;
  }

  return (
    <View style={styles.container}>
      <RideDiscoveryCanvas width={width} height={height} />
      <BrandPill />
      <View pointerEvents="none" style={styles.topContent}>
        <Text style={styles.eyebrow}>+3 ride zones found</Text>
        <Text style={styles.topTitle}>Unlock them on your route</Text>
      </View>
      <MysteryQuestionOverlay width={width} height={height} />
      <Pressable style={styles.nextButton} onPress={() => setScreen("profile")}>
        <Text style={styles.nextButtonText}>Next</Text>
      </Pressable>
    </View>
  );
}

function DriverProfileScreen({ width, height, onBack }) {
  const compact = height < 760;
  return (
    <View style={styles.profileContainer}>
      <DriverProfileCanvas width={width} height={height} />
      <View style={styles.profileHeader}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backIcon}>{"<"}</Text>
          <Text style={styles.backText}>Back to map</Text>
        </Pressable>
        <Text style={styles.moreText}>...</Text>
      </View>

      <Text pointerEvents="none" style={[styles.bigNumber, { fontSize: Math.min(width * 0.72, 330), top: height * 0.12 }]}>1</Text>
      <Text pointerEvents="none" style={[styles.bigNumberEdge, { fontSize: Math.min(width * 0.72, 330), top: height * 0.12 }]}>1</Text>

      <View style={[styles.profileCopy, { top: compact ? 98 : 122 }]}>
        <Text style={styles.driverFirst}>Charles</Text>
        <Text style={styles.driverLast}>Leclerc</Text>
        <Text style={styles.driverMeta}>Race profile / 2018 - 2025</Text>
      </View>

      <Image source={DRIVER_IMAGE} resizeMode="contain" style={[styles.driverImage, { width: width * 0.78, height: height * 0.58, top: height * 0.2 }]} />

      <View style={[styles.statsRail, { top: compact ? 232 : 290 }]}>
        {driverStats.map((stat, index) => (
          <View key={stat.label} style={[styles.statRow, index === 1 && styles.statRowLarge]}>
            <Text style={[styles.statValue, index < 2 && styles.statValueLarge]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.roundsLabel}>
        <Text style={styles.roundsText}>Rounds</Text>
      </View>

      <View style={styles.bottomAction}>
        <Pressable style={styles.exploreButton}>
          <Text style={styles.exploreText}>Explore</Text>
          <Text style={styles.exploreArrow}>{">"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  nextButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    height: 54,
    minWidth: 150,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
    shadowColor: "#111827",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0,
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
    right: 10,
    color: "rgba(255,255,255,0.035)",
    fontWeight: "900",
    letterSpacing: 0,
    zIndex: 1,
  },
  bigNumberEdge: {
    position: "absolute",
    right: 10,
    color: "rgba(255,44,44,0.045)",
    fontWeight: "900",
    letterSpacing: 0,
    textShadowColor: "rgba(255,255,255,0.08)",
    textShadowOffset: { width: 1, height: 0 },
    textShadowRadius: 1,
    zIndex: 1,
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
  driverImage: {
    position: "absolute",
    right: -78,
    zIndex: 3,
  },
  statsRail: {
    position: "absolute",
    left: 24,
    width: 138,
    zIndex: 5,
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
  roundsLabel: {
    position: "absolute",
    left: 24,
    bottom: 128,
    zIndex: 4,
  },
  roundsText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0,
  },
  bottomAction: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 34,
    zIndex: 6,
  },
  exploreButton: {
    height: 62,
    borderRadius: 24,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  exploreText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
  },
  exploreArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.12)",
    textAlign: "center",
    lineHeight: 35,
    fontSize: 18,
    fontWeight: "900",
  },
});
