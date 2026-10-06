import { requireOptionalNativeModule } from 'expo-modules-core';
export type Profile = { weight: number; height: number; goal: number; stepLength: number };
export type Day = { date: string; steps: number; km: number; kcal: number };
export type Snapshot = { available: boolean; running: boolean; status: string; lastUpdate: number; configured: boolean; profile: Profile; days: Day[] };
type Tracker = { snapshot(): Snapshot; configure(weight: number, height: number, goal: number, stepLength: number): void; start(): void; stop(): void; clear(): void };
export default requireOptionalNativeModule<Tracker>('StepTracker');
