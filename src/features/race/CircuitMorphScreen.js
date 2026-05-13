import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Blur,
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  LinearGradient,
  Path,
  Rect,
  Shader,
  Skia,
  useClock,
  usePathInterpolation,
  vec,
} from "@shopify/react-native-skia";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { CIRCUITS } from "./circuitData";

const TRACK_SIZE = 360;

const RACE_BACKGROUND_SHADER = Skia.RuntimeEffect.Make(`
uniform float2 resolution;
uniform float time;
uniform float ripple;
uniform float tone;

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
  float grain = noise(uv * 7.2 + float2(time * 0.08, -time * 0.05));
  float heat = noise(uv * 2.2 + float2(-time * 0.04, time * 0.03));
  float sweep = sin((uv.x * 2.1 + uv.y * 1.3 + time * 0.18 + tone * 1.3) * 3.14159) * 0.5 + 0.5;
  float wave = 1.0 - smoothstep(0.0, 0.055, abs(distance(uv, float2(0.5, 0.48)) - ripple * 0.86));
  wave *= 1.0 - smoothstep(0.78, 1.0, ripple);

  float3 black = float3(0.026, 0.018, 0.023);
  float3 red = float3(0.38, 0.055, 0.045);
  float3 amber = float3(0.42, 0.2, 0.075);
  float3 cool = float3(0.07, 0.17, 0.22);
  float3 violet = float3(0.15, 0.095, 0.24);
  float3 trackTone = mix(mix(red, cool, smoothstep(0.2, 0.62, tone)), violet, smoothstep(0.62, 1.0, tone));
  float top = smoothstep(1.0, 0.0, uv.y);
  float right = smoothstep(0.1, 0.9, uv.x);
  float low = smoothstep(0.35, 1.0, uv.y);
  float3 color = black;
  color += trackTone * (0.34 * top + 0.24 * right + 0.12 * heat);
  color += amber * (0.11 * low + 0.09 * sweep);
  color += float3(0.6, 0.52, 0.4) * wave * 0.06;
  color += (grain - 0.5) * 0.025;
  float vignette = smoothstep(0.96, 0.2, distance(uv, float2(0.52, 0.42)));
  color *= 0.72 + vignette * 0.48;
  return half4(color, 1.0);
}
`);

function makeTrackPath(points) {
  const path = Skia.Path.Make();
  const first = points[0];
  path.moveTo(first[0] * TRACK_SIZE, first[1] * TRACK_SIZE);
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    path.lineTo(point[0] * TRACK_SIZE, point[1] * TRACK_SIZE);
  }
  path.close();
  return path;
}

function RaceBackground({ width, height, ripple, tone }) {
  const clock = useClock();
  const uniforms = useDerivedValue(
    () => ({
      resolution: [width, height],
      time: clock.value / 1000,
      ripple: ripple.value,
      tone: tone.value,
    }),
    [clock, height, ripple, tone, width]
  );

  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={width} height={height}>
        {RACE_BACKGROUND_SHADER ? (
          <Shader source={RACE_BACKGROUND_SHADER} uniforms={uniforms} />
        ) : (
          <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={["#070202", "#9F1018", "#4F2305"]} />
        )}
      </Rect>
      <Rect x={0} y={0} width={width} height={height * 0.28}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height * 0.28)} colors={["rgba(0,0,0,0.46)", "rgba(0,0,0,0)"]} />
      </Rect>
      <Rect x={0} y={height * 0.58} width={width} height={height * 0.42}>
        <LinearGradient start={vec(0, height * 0.58)} end={vec(0, height)} colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.38)", "rgba(0,0,0,0.62)"]} />
      </Rect>
    </Canvas>
  );
}

function CircuitMarker({ marker, size, clock }) {
  const x = marker.x * size;
  const y = marker.y * size;
  const pulse = useDerivedValue(() => 7 + Math.sin(clock.value / 260 + x) * 2.5, [clock, x]);

  return (
    <Group transform={[{ translateX: x }, { translateY: y }]}>
      <Circle cx={0} cy={0} r={pulse} color="#FFFFFF" opacity={0.1} />
      <Circle cx={0} cy={0} r={5.5} color="#FFFFFF" />
      <Circle cx={0} cy={0} r={2.8} color="#E7232E" />
    </Group>
  );
}

function MorphingCircuit({ size, progress, ripple, activeCircuit }) {
  const paths = useMemo(() => CIRCUITS.map((circuit) => makeTrackPath(circuit.points)), []);
  const clock = useClock();
  const circuitPath = usePathInterpolation(
    progress,
    CIRCUITS.map((_, index) => index),
    paths
  );
  const scale = size / TRACK_SIZE;
  const dashPhase = useDerivedValue(() => -clock.value / 24, [clock]);
  const rippleStroke = useDerivedValue(() => {
    const p = ripple.value;
    return 7 + interpolate(p, [0, 1], [12, 1]);
  }, [ripple]);
  const rippleOpacity = useDerivedValue(() => {
    const p = ripple.value;
    return Math.max(0, 1 - p) * 0.16;
  }, [ripple]);

  return (
    <Canvas pointerEvents="none" style={{ width: size, height: size }}>
      <Group transform={[{ scale }]}>
        <Path path={circuitPath} color={activeCircuit.accent} style="stroke" strokeWidth={24} strokeCap="round" strokeJoin="round" opacity={0.14}>
          <Blur blur={10} />
        </Path>
        <Path path={circuitPath} color="#FFFFFF" style="stroke" strokeWidth={18} strokeCap="round" strokeJoin="round" opacity={0.6}>
          <Blur blur={2} />
        </Path>
        <Path path={circuitPath} color="#FFFFFF" style="stroke" strokeWidth={11} strokeCap="round" strokeJoin="round" opacity={0.86} />
        <Path path={circuitPath} color="rgba(9,8,10,0.9)" style="stroke" strokeWidth={6.2} strokeCap="round" strokeJoin="round" />
        <Path path={circuitPath} color="#FFFFFF" style="stroke" strokeWidth={1.2} strokeCap="round" strokeJoin="round" opacity={0.56}>
          <DashPathEffect intervals={[10, 14]} phase={dashPhase} />
        </Path>
        <Path path={circuitPath} color={activeCircuit.glow} style="stroke" strokeWidth={rippleStroke} strokeCap="round" strokeJoin="round" opacity={rippleOpacity}>
          <Blur blur={5} />
        </Path>
      </Group>
      {activeCircuit.markers.map((marker) => (
        <CircuitMarker key={marker.label} marker={marker} size={size} clock={clock} />
      ))}
    </Canvas>
  );
}

function Metric({ label, value, align = "left" }) {
  return (
    <View style={[styles.metric, align === "right" && styles.metricRight]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>{value}</Text>
    </View>
  );
}

function CircuitSelector({ circuit, index, selected, onPress }) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(selected ? 1 : 0.58, { duration: 180 }),
    transform: [{ scale: withTiming(selected ? 1 : 0.96, { duration: 180 }) }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onPress(index)}
        style={[styles.circuitPill, selected && { borderColor: circuit.accent, backgroundColor: "rgba(255,255,255,0.16)" }]}
      >
        <Text style={styles.circuitPillName}>{circuit.shortName}</Text>
        <Text style={styles.circuitPillCode}>{circuit.code}</Text>
      </Pressable>
    </Animated.View>
  );
}

function BackIcon() {
  return <View pointerEvents="none" style={styles.backIcon} />;
}

function FactTile({ label, value }) {
  return (
    <View style={styles.factTile}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.74}>{value}</Text>
    </View>
  );
}

export default function CircuitMorphScreen({ onBack }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const morphProgress = useSharedValue(0);
  const ripple = useSharedValue(1);
  const tone = useSharedValue(0);
  const activeCircuit = CIRCUITS[selectedIndex];
  const compact = height < 780;
  const circuitSize = Math.min(width * 0.92, compact ? 344 : 398);

  const selectCircuit = (index) => {
    if (index === selectedIndex) {
      ripple.value = 0;
      ripple.value = withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) });
      return;
    }
    setSelectedIndex(index);
    morphProgress.value = withTiming(index, { duration: 780, easing: Easing.inOut(Easing.cubic) });
    tone.value = withTiming(index / Math.max(1, CIRCUITS.length - 1), { duration: 780, easing: Easing.inOut(Easing.cubic) });
    ripple.value = 0;
    ripple.value = withTiming(1, { duration: 960, easing: Easing.out(Easing.cubic) });
  };

  return (
    <View style={styles.root}>
      <RaceBackground width={width} height={height} ripple={ripple} tone={tone} />

      <View style={[styles.header, { top: insets.top + 12 }]}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <BackIcon />
        </Pressable>
      </View>

      <View style={[styles.content, { paddingTop: insets.top + (compact ? 58 : 66), paddingBottom: Math.max(insets.bottom, 16) + 30 }]}>
        <Text style={styles.title}>Live Race</Text>

        <View style={styles.metricsRow}>
          <Metric label="Laps" value={activeCircuit.numberOfLaps} />
          <View style={styles.metricDivider} />
          <Metric label="Length" value={activeCircuit.length} />
          <View style={styles.metricDivider} />
          <Metric label="Circuit" value={`${activeCircuit.shortName} [${activeCircuit.code}]`} align="right" />
        </View>

        <View style={[styles.circuitHero, compact && styles.circuitHeroCompact]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Morph to next circuit"
            onPress={() => selectCircuit((selectedIndex + 1) % CIRCUITS.length)}
            style={[styles.circuitStage, { width: circuitSize, height: circuitSize }]}
          >
            <MorphingCircuit size={circuitSize} progress={morphProgress} ripple={ripple} activeCircuit={activeCircuit} />
          </Pressable>
        </View>

        <View style={styles.infoPanel}>
          <Text style={styles.infoKicker}>Circuit brief</Text>
          <Text style={styles.infoBody}>{activeCircuit.profile}</Text>
          <View style={styles.factGrid}>
            <FactTile label="Lap record" value={activeCircuit.fastestLap} />
            <FactTile label="Record holder" value={activeCircuit.lapRecordDriver} />
            <FactTile label="Race distance" value={activeCircuit.raceDistance} />
            <FactTile label="First GP" value={activeCircuit.firstGrandPrix} />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.selectorScroller}
          contentContainerStyle={styles.selectorRow}
        >
          {CIRCUITS.map((circuit, index) => (
            <CircuitSelector
              key={circuit.key}
              circuit={circuit}
              index={index}
              selected={selectedIndex === index}
              onPress={selectCircuit}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#050101",
  },
  header: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 5,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  backIcon: {
    width: 13,
    height: 13,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 1,
    transform: [{ rotate: "45deg" }, { translateX: 2 }],
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 44,
    lineHeight: 49,
    fontWeight: "900",
    letterSpacing: 0,
  },
  metricsRow: {
    marginTop: 20,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metric: {
    flex: 1,
  },
  metricRight: {
    alignItems: "flex-end",
  },
  metricLabel: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 0,
  },
  metricValue: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
    letterSpacing: 0,
  },
  metricDivider: {
    width: 1,
    height: 35,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  circuitHero: {
    flex: 1,
    minHeight: 328,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  circuitHeroCompact: {
    minHeight: 276,
    marginTop: 6,
    marginBottom: 2,
  },
  circuitStage: {
    alignItems: "center",
    justifyContent: "center",
  },
  selectorScroller: {
    marginTop: 12,
    marginHorizontal: -20,
    minHeight: 70,
  },
  selectorRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  circuitPill: {
    minHeight: 44,
    minWidth: 86,
    borderRadius: 22,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  circuitPillName: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "900",
    letterSpacing: 0,
  },
  circuitPillCode: {
    marginTop: 1,
    color: "rgba(255,255,255,0.56)",
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "800",
    letterSpacing: 0,
  },
  infoPanel: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(7,7,9,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  infoKicker: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  infoBody: {
    marginTop: 6,
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 0,
  },
  factGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  factTile: {
    width: "48%",
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  factLabel: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 0,
  },
  factValue: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "900",
    letterSpacing: 0,
  },
});
