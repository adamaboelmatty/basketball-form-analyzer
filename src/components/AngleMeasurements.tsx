import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";

/**
 * Shooting angles from MediaPipe analysis
 */
export interface ShootingAngles {
  elbowAngleAtRelease: number;
  kneeFlexionAtSetPoint: number;
  bodyLean: number;
  setPointHeight: number;
}

/**
 * Ideal ranges for shooting mechanics
 */
const IDEAL_RANGES = {
  elbowAngle: { min: 85, max: 100, label: "Elbow Angle", unit: "°", icon: "hand-right-outline" as const },
  kneeFlexion: { min: 30, max: 45, label: "Knee Bend", unit: "°", icon: "fitness-outline" as const },
  bodyLean: { min: -5, max: 5, label: "Body Lean", unit: "°", icon: "body-outline" as const },
  setPointHeight: { min: 1.0, max: 1.5, label: "Set Point", unit: "", icon: "arrow-up-outline" as const },
};

type MetricStatus = "good" | "close" | "needs_work";

interface MetricDisplayProps {
  label: string;
  value: number;
  idealMin: number;
  idealMax: number;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
  delay: number;
}

function getStatus(value: number, min: number, max: number): MetricStatus {
  if (value >= min && value <= max) {
    return "good";
  }
  
  // Check if within 20% of range
  const range = max - min;
  const buffer = range * 0.5;
  
  if (value >= min - buffer && value <= max + buffer) {
    return "close";
  }
  
  return "needs_work";
}

function getStatusColor(status: MetricStatus): string {
  switch (status) {
    case "good":
      return "#22c55e";
    case "close":
      return "#f97316";
    case "needs_work":
      return "#ef4444";
  }
}

function getStatusBgColor(status: MetricStatus): string {
  switch (status) {
    case "good":
      return "rgba(34, 197, 94, 0.1)";
    case "close":
      return "rgba(249, 115, 22, 0.1)";
    case "needs_work":
      return "rgba(239, 68, 68, 0.1)";
  }
}

function formatValue(value: number, unit: string): string {
  if (unit === "°") {
    return `${Math.round(value)}°`;
  }
  return value.toFixed(2);
}

function formatIdeal(min: number, max: number, unit: string): string {
  if (unit === "°") {
    return `${min}-${max}°`;
  }
  return `>${min}`;
}

function MetricCard({
  label,
  value,
  idealMin,
  idealMax,
  unit,
  icon,
  delay,
}: MetricDisplayProps) {
  const status = getStatus(value, idealMin, idealMax);
  const color = getStatusColor(status);
  const bgColor = getStatusBgColor(status);

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(400)}
      style={[styles.metricCard, { backgroundColor: bgColor, borderColor: color + "30" }]}
    >
      <View style={styles.metricHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      
      <View style={styles.metricValues}>
        <Text style={[styles.metricValue, { color }]}>
          {formatValue(value, unit)}
        </Text>
        <Text style={styles.metricIdeal}>
          Ideal: {formatIdeal(idealMin, idealMax, unit)}
        </Text>
      </View>

      {/* Status indicator */}
      <View style={[styles.statusBadge, { backgroundColor: color + "20" }]}>
        <Text style={[styles.statusText, { color }]}>
          {status === "good" ? "Good" : status === "close" ? "Close" : "Work on this"}
        </Text>
      </View>
    </Animated.View>
  );
}

interface AngleMeasurementsProps {
  angles: ShootingAngles | null;
  showTitle?: boolean;
}

export default function AngleMeasurements({
  angles,
  showTitle = true,
}: AngleMeasurementsProps) {
  if (!angles) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={32} color="#525252" />
        <Text style={styles.emptyText}>No measurements available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showTitle && (
        <View style={styles.header}>
          <Ionicons name="speedometer-outline" size={18} color="#a3a3a3" />
          <Text style={styles.headerTitle}>Measured Angles</Text>
        </View>
      )}

      <View style={styles.metricsGrid}>
        <MetricCard
          label={IDEAL_RANGES.elbowAngle.label}
          value={angles.elbowAngleAtRelease}
          idealMin={IDEAL_RANGES.elbowAngle.min}
          idealMax={IDEAL_RANGES.elbowAngle.max}
          unit={IDEAL_RANGES.elbowAngle.unit}
          icon={IDEAL_RANGES.elbowAngle.icon}
          delay={100}
        />
        <MetricCard
          label={IDEAL_RANGES.kneeFlexion.label}
          value={angles.kneeFlexionAtSetPoint}
          idealMin={IDEAL_RANGES.kneeFlexion.min}
          idealMax={IDEAL_RANGES.kneeFlexion.max}
          unit={IDEAL_RANGES.kneeFlexion.unit}
          icon={IDEAL_RANGES.kneeFlexion.icon}
          delay={200}
        />
        <MetricCard
          label={IDEAL_RANGES.bodyLean.label}
          value={Math.abs(angles.bodyLean)}
          idealMin={0}
          idealMax={IDEAL_RANGES.bodyLean.max}
          unit={IDEAL_RANGES.bodyLean.unit}
          icon={IDEAL_RANGES.bodyLean.icon}
          delay={300}
        />
        <MetricCard
          label={IDEAL_RANGES.setPointHeight.label}
          value={angles.setPointHeight}
          idealMin={IDEAL_RANGES.setPointHeight.min}
          idealMax={IDEAL_RANGES.setPointHeight.max}
          unit={IDEAL_RANGES.setPointHeight.unit}
          icon={IDEAL_RANGES.setPointHeight.icon}
          delay={400}
        />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#22c55e" }]} />
          <Text style={styles.legendText}>Good</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#f97316" }]} />
          <Text style={styles.legendText}>Close</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
          <Text style={styles.legendText}>Needs work</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#171717",
    borderRadius: 16,
    gap: 8,
  },
  emptyText: {
    color: "#525252",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  headerTitle: {
    color: "#a3a3a3",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    width: "48%",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    color: "#a3a3a3",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  metricValues: {
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  metricIdeal: {
    color: "#525252",
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#262626",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: "#737373",
    fontSize: 11,
  },
});
