export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return s >= 3600 ? `${Math.floor(s/3600)}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}` : `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}
export function pace(ms: number, km: number): string {
  if(km < 0.05 || ms < 10000) return '—';
  const seconds = Math.round(ms / 1000 / km);
  return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}
export function cadence(ms: number, steps: number): string { return ms < 10000 ? '—' : String(Math.round(steps / (ms / 60000))); }
export function speed(ms: number, km: number): string { return km < 0.05 || ms < 10000 ? '—' : (km/(ms/3600000)).toFixed(1); }
export function dateKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
