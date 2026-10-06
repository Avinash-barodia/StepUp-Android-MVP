import { requireOptionalNativeModule } from 'expo-modules-core';
export type Profile = { weight: number; height: number; goal: number; stepLength: number };
export type Day = { date: string; steps: number; km: number; kcal: number };
export type Walk = { id: string; started: number; status: 'recording' | 'paused' | 'interrupted' | 'review' | 'saved'; elapsedMs: number; steps: number; km: number; kcal: number };
export type Snapshot = { available: boolean; running: boolean; status: string; lastUpdate: number; configured: boolean; profile: Profile; days: Day[]; sessions: Walk[]; theme: 'blush' | 'charcoal' };
type Tracker = { snapshot(): Snapshot; setTheme(theme: 'blush' | 'charcoal'): void; sessionAction(action: 'begin' | 'pause' | 'resume' | 'finish' | 'save' | 'discard'): void; configure(weight: number, height: number, goal: number, stepLength: number): void; start(): void; stop(): void; clear(): void };
export default requireOptionalNativeModule<Tracker>('StepTracker');
