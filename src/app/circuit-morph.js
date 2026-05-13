import { useRouter } from "expo-router";

import CircuitMorphScreen from "../features/race/CircuitMorphScreen";

export default function CircuitMorphRoute() {
  const router = useRouter();

  return <CircuitMorphScreen onBack={() => router.back()} />;
}
