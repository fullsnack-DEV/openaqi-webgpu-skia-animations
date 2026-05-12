import React, { useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
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

  return (
    <View style={styles.container}>
      <RideDiscoveryCanvas width={width} height={height} />
      <BrandPill />
      <View pointerEvents="none" style={styles.topContent}>
        <Text style={styles.eyebrow}>+3 ride zones found</Text>
        <Text style={styles.topTitle}>Unlock them on your route</Text>
      </View>
      <MysteryQuestionOverlay width={width} height={height} />
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
});
