import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

// ---------------------------------------------------------------------------
// Mock music library — analyzed tempo (BPM) metadata from streaming catalog
// ---------------------------------------------------------------------------
type Song = { id: number; title: string; artist: string; bpm: number; g: string; genre: string; year: number; unlockKm: number };

const LIBRARY: Song[] = [
  { id: 1,  title: "Blinding Lights",    artist: "The Weeknd",              bpm: 171, g: "from-red-500 to-orange-400",     genre: "Pop",     year: 2019, unlockKm: 0 },
  { id: 2,  title: "Lose Yourself",      artist: "Eminem",                  bpm: 171, g: "from-slate-600 to-slate-400",    genre: "Hip-hop", year: 2002, unlockKm: 0 },
  { id: 3,  title: "Run Boy Run",        artist: "Woodkid",                 bpm: 172, g: "from-yellow-600 to-amber-400",   genre: "Indie",   year: 2011, unlockKm: 0 },
  { id: 4,  title: "Thunder",           artist: "Imagine Dragons",         bpm: 168, g: "from-indigo-500 to-violet-400",  genre: "Rock",    year: 2017, unlockKm: 0 },
  { id: 5,  title: "Physical",          artist: "Dua Lipa",                bpm: 148, g: "from-pink-500 to-rose-400",     genre: "Pop",     year: 2020, unlockKm: 0 },
  { id: 6,  title: "Can't Hold Us",     artist: "Macklemore & Ryan Lewis", bpm: 146, g: "from-teal-500 to-cyan-400",      genre: "Hip-hop", year: 2012, unlockKm: 0 },
  { id: 7,  title: "Radioactive",       artist: "Imagine Dragons",         bpm: 136, g: "from-emerald-600 to-lime-400", genre: "Rock",    year: 2012, unlockKm: 20 },
  { id: 8,  title: "Feel This Moment",  artist: "Pitbull ft. Christina",   bpm: 136, g: "from-orange-500 to-amber-400",  genre: "Pop",     year: 2012, unlockKm: 20 },
  { id: 9,  title: "Titanium",          artist: "David Guetta ft. Sia",    bpm: 126, g: "from-blue-600 to-sky-400",      genre: "EDM",     year: 2011, unlockKm: 40 },
  { id: 10, title: "One More Time",     artist: "Daft Punk",               bpm: 123, g: "from-zinc-500 to-slate-300",     genre: "EDM",     year: 2000, unlockKm: 40 },
  { id: 11, title: "Seven Nation Army", artist: "The White Stripes",       bpm: 124, g: "from-stone-600 to-stone-400",   genre: "Rock",    year: 2003, unlockKm: 60 },
  { id: 12, title: "Rather Be",          artist: "Clean Bandit",           bpm: 121, g: "from-cyan-600 to-teal-400",     genre: "EDM",     year: 2013, unlockKm: 60 },
  { id: 13, title: "Pump It",           artist: "Black Eyed Peas",         bpm: 90,  g: "from-fuchsia-600 to-purple-400", genre: "Hip-hop", year: 2005, unlockKm: 80 },
  { id: 14, title: "We Will Rock You",  artist: "Queen",                   bpm: 81,  g: "from-red-700 to-red-500",          genre: "Rock",    year: 1977, unlockKm: 100 },
  { id: 15, title: "Hall of Fame",      artist: "The Script",              bpm: 85,  g: "from-amber-600 to-yellow-400",   genre: "Pop",     year: 2012, unlockKm: 100 },
  { id: 16, title: "Chariots of Fire (130 Remix)", artist: "Vangelis",      bpm: 130, g: "from-sky-600 to-blue-400",      genre: "Remix",   year: 1981, unlockKm: 120 },
];

// ---------------------------------------------------------------------------
// Engine: pace → cadence → target BPM → song match
// ---------------------------------------------------------------------------
function paceSecToCadence(paceSec: number) {
  // ~140 spm at 8:00/km up to ~185 spm at 4:00/km
  return Math.round(140 + (480 - paceSec) * 0.1875);
}

function effectiveBpm(song: Song, feel: "full" | "half") {
  return feel === "half" ? song.bpm * 2 : song.bpm;
}

function pickSong(pool: Song[], target: number, feel: "full" | "half", recent: number[]) {
  let best: Song | null = null;
  let bestScore = Infinity;
  for (const s of pool) {
    const d = Math.abs(effectiveBpm(s, feel) - target);
    const score = d + (recent.includes(s.id) ? 8 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return { song: best!, delta: Math.abs(effectiveBpm(best!, feel) - target) };
}

function zoneFor(paceSec: number) {
  if (paceSec > 375) return { name: "Recovery", color: "text-sky-400",     bar: "bg-sky-400" };
  if (paceSec > 330) return { name: "Easy",     color: "text-emerald-400", bar: "bg-emerald-400" };
  if (paceSec > 285) return { name: "Tempo",    color: "text-lime-400",    bar: "bg-lime-400" };
  if (paceSec > 255) return { name: "Interval", color: "text-amber-400",   bar: "bg-amber-400" };
  return                      { name: "Sprint",   color: "text-orange-500", bar: "bg-orange-400" };
}

function fmtPace(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtClock(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${h > 0 ? h + ":" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Icons (inline SVG, Material-style)
// ---------------------------------------------------------------------------
const ico = "w-5 h-5";
const Play = () => (<svg className={ico} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>);
const Pause = () => (<svg className={ico} viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>);
const Skip = () => (<svg className={ico} viewBox="0 0 24 24" fill="currentColor"><path d="M6 5v14l9-7zm11 0h2v14h-2z" /></svg>);
const Heart = ({ filled }: { filled: boolean }) => (
  <svg className={ico} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M12 21C7 16.5 3 13.2 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 4.2-4 7.5-9 12z" />
  </svg>
);
const Shoe = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14h13a4 4 0 0 1 4 4v2H4z" /><path d="M4 14V8m4 6V8m4 6V8m4 6V8" /></svg>);
const Lock = () => (<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);
const Star = () => (<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.6 1.4-6.8L2.2 9.1l6.9-.8z" /></svg>);
const PassportIco = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 18H6V4h12v16zM8 6h8v2H8V6zm0 4h8v2H8v-2z" /></svg>);
const MusicIco = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>);
const StoreIco = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 7V4m12 3V4M4 7h16l-1 13H5L4 7zm4 4h.01M16 11h.01M10 15h4" /></svg>);
const HistoryIco = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3.05 11a9 9 0 1 1 .5 4L3 16" /><path d="M3 11v5h5" /><path d="M12 7v5l4 2" /></svg>);

// ---------------------------------------------------------------------------
// Live-run simulation script
// ---------------------------------------------------------------------------
const RUN_SCRIPT = [
  { label: "Warm-up",  paceSec: 390, dur: 16 },
  { label: "Build",   paceSec: 345, dur: 16 },
  { label: "Tempo",   paceSec: 300, dur: 20 },
  { label: "Push",    paceSec: 262, dur: 18 },
  { label: "Cooldown", paceSec: 400, dur: 14 },
];

const HISTORY = [
  { date: "Sat · Oct 24",  dist: "10.2 km", pace: "5:12 /km", cadence: 178, sync: 94, bpm: 172, dur: "53:06",  score: 1240, pb: 2, zones: ["Easy", "Tempo", "Tempo", "Interval"] },
  { date: "Thu · Oct 22",  dist: "6.4 km",  pace: "5:48 /km", cadence: 170, sync: 91, bpm: 168, dur: "37:07",  score: 890,  pb: 0, zones: ["Easy", "Easy", "Tempo"] },
  { date: "Tue · Oct 20",  dist: "14.0 km", pace: "5:31 /km", cadence: 174, sync: 96, bpm: 170, dur: "1:17:20", score: 1815, pb: 3, zones: ["Easy", "Tempo", "Tempo", "Tempo", "Easy"] },
];

// ---------------------------------------------------------------------------
// Playlist Passports — Finch-style content journeys (bundled, zero server)
// ---------------------------------------------------------------------------
const PASSPORTS = [
  { id: "first-mile", title: "First Mile",     subtitle: "Starter journey · 8 tracks · 40 km",       tracks: [1, 2, 3, 4, 5, 6, 7, 8],  gates: [2, 6, 11, 16, 22, 28, 33, 40] },
  { id: "rock-road",  title: "Rock Road Trip", subtitle: "Guitars across the decades · 6 tracks · 50 km", tracks: [11, 4, 7, 14, 16, 15], gates: [8, 16, 24, 32, 41, 50] },
  { id: "edm-lab",    title: "EDM Sprint Lab", subtitle: "Four-on-the-floor intervals · 6 tracks · 60 km", tracks: [9, 10, 12, 13, 5, 16],  gates: [10, 20, 30, 40, 50, 60] },
];

// ---------------------------------------------------------------------------
// Material 3 helpers
// ---------------------------------------------------------------------------
const NAV = [
  { id: "run", label: "Run", Icon: Shoe },
  { id: "passport", label: "Passport", Icon: PassportIco },
  { id: "music", label: "Music", Icon: MusicIco },
  { id: "store", label: "Store", Icon: StoreIco },
  { id: "history", label: "History", Icon: HistoryIco },
];

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-3xl bg-[#1d1b20] border border-[#2b2930] ${className}`}>{children}</div>
);

const Linear = ({ value, tone = "bg-lime-400", track = "bg-[#36343b]" }: { value: number; tone?: string; track?: string }) => (
  <div className={`h-1.5 rounded-full overflow-hidden ${track}`}>
    <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);

const Chip = ({ active, onClick, children, tone = "lime" }: { active?: boolean; onClick?: () => void; children: React.ReactNode; tone?: string }) => (
  <button
    onClick={onClick}
    className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
      active
        ? tone === "violet" ? "bg-violet-400/15 text-violet-300 border-violet-400/40" : "bg-lime-400/15 text-lime-300 border-lime-400/40"
        : "border-[#49454f] text-[#c8c4d0]"
    }`}
  >
    {children}
  </button>
);

const Tag = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${className}`}>{children}</span>
);

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const [tab, setTab] = useState("run");
  const [source, setSource] = useState<"spotify" | "ytm">("spotify");
  const [feel, setFeel] = useState<"full" | "half">("full");
  const [paceSec, setPaceSec] = useState(330);
  const [running, setRunning] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [distM, setDistM] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const tickRef = useRef(0);
  const [current, setCurrent] = useState<Song>(LIBRARY[4]);
  const [delta, setDelta] = useState(2);
  const [liked, setLiked] = useState<number[]>([3, 7]);
  const [songProg, setSongProg] = useState(28);
  const [switched, setSwitched] = useState<string | null>(null);
  const recentRef = useRef<number[]>([5]);
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [passIdx, setPassIdx] = useState(1);
  const [passKm, setPassKm] = useState(22.5);
  const [passDone, setPassDone] = useState<number[]>([11, 4]);
  const [points, setPoints] = useState(240);
  const [purchased, setPurchased] = useState<number[]>([]);
  const [ownedCosmetics, setOwnedCosmetics] = useState<string[]>([]);
  const [walkMode, setWalkMode] = useState(false);
  const [score, setScore] = useState(0);
  const [comboSec, setComboSec] = useState(0);
  const [lockSecThisSong, setLockSecThisSong] = useState(0);
  const [pb, setPb] = useState<Record<number, number>>({ 1: 96, 4: 74, 5: 82 });
  const comboRef = useRef(0);
  const lockRef = useRef(0);
  const BASE_LIFE_KM = 46.2;

  const cadence = Math.max(100, paceSecToCadence(paceSec) - (walkMode ? 22 : 0));
  const zone = zoneFor(paceSec);
  const eff = effectiveBpm(current, feel);
  const locked = Math.abs(eff - cadence) <= 2;
  const lifeKm = BASE_LIFE_KM + distM / 1000;
  const mult = Math.min(1 + comboSec * 0.05, 4);
  const isUnlocked = (s: Song) => s.unlockKm <= lifeKm || purchased.includes(s.id);
  const unlockedCount = LIBRARY.filter(isUnlocked).length;
  const passport = PASSPORTS[passIdx];
  const passNextGate = passport.gates.find((g) => g > passKm) ?? null;
  const passDoneCount = passDone.filter((id) => passport.tracks.includes(id)).length;

  // Pick a new song when target drifts from the current track
  const resync = useCallback((target: number, f: "full" | "half") => {
    // bank the outgoing song's lock streak as a personal best
    const finished = lockRef.current;
    setPb((prev) => (finished > (prev[current.id] || 0) ? { ...prev, [current.id]: finished } : prev));
    lockRef.current = 0;
    setLockSecThisSong(0);
    const pool = LIBRARY.filter((s) => s.unlockKm <= lifeKm || purchased.includes(s.id));
    const { song, delta: d } = pickSong(pool, target, f, recentRef.current);
    recentRef.current = [song.id, ...recentRef.current].slice(0, 4);
    setCurrent(song);
    setDelta(d);
    setSongProg(5);
    setSwitched(`Switched → ${song.title} · Δ ${d.toFixed(0)} BPM`);
    setTimeout(() => setSwitched(null), 2600);
  }, [current, lifeKm, purchased]);

  // React to manual pace slider changes
  const onPaceChange = (v: number[]) => {
    setPaceSec(v[0]);
    if (autoSync) {
      const t = Math.max(100, paceSecToCadence(v[0]) - (walkMode ? 22 : 0));
      if (Math.abs(effectiveBpm(current, feel) - t) > 4) resync(t, feel);
    }
  };

  // Live-run ticker
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed((e) => e + 1);
      setDistM((d) => d + 1000 / paceSec);
      tickRef.current += 1;
      const phase = RUN_SCRIPT[phaseIdx];
      if (tickRef.current >= phase.dur) {
        tickRef.current = 0;
        setPhaseIdx((i) => (i + 1) % RUN_SCRIPT.length);
      }
      // ease pace toward the current phase target
      const target = RUN_SCRIPT[phaseIdx].paceSec;
      setPaceSec((p) => p + (target - p) * 0.25);
      setSongProg((p) => (p + 1.4) % 100);
    }, 1000);
    return () => clearInterval(id);
  }, [running, phaseIdx]);

  // Combo scoring: every second locked builds the multiplier; breaking lock resets it
  useEffect(() => {
    if (elapsed === 0) return;
    if (locked) {
      comboRef.current += 1;
      lockRef.current += 1;
      setComboSec(comboRef.current);
      setLockSecThisSong(lockRef.current);
      setScore((s) => s + Math.round(10 * Math.min(1 + comboRef.current * 0.05, 4)));
      if (comboRef.current % 5 === 0) setPoints((p) => p + 5); // TempoPoints accrue from play
    } else {
      comboRef.current = 0;
      setComboSec(0);
    }
  }, [elapsed, locked]);

  // Keep music locked during live run
  useEffect(() => {
    if (running && autoSync && Math.abs(eff - cadence) > 4) resync(cadence, feel);
  }, [cadence, running, autoSync]);

  const filteredLibrary = useMemo(() => {
    return LIBRARY.filter((s) => {
      const b = s.bpm;
      if (zoneFilter) {
        const z = zoneFilter;
        const zoneOk = z === "Sprint/Interval" ? b >= 160 : z === "Tempo" ? b >= 140 && b < 160 : z === "Easy" ? b >= 120 && b < 140 : b < 120;
        if (!zoneOk) return false;
      }
      if (genreFilter) {
        const g = genreFilter;
        const genreOk =
          g === "Rock" ? s.genre === "Rock" :
          g === "Hip-hop" ? s.genre === "Hip-hop" :
          g === "Pop" ? s.genre === "Pop" :
          g === "EDM" ? s.genre === "EDM" :
          g === "70s–80s" ? s.year < 1990 :
          g === "2000s" ? s.year >= 1990 && s.year < 2010 :
          s.year >= 2010;
        if (!genreOk) return false;
      }
      return true;
    });
  }, [zoneFilter, genreFilter]);

  const startRun = () => { setRunning(true); setElapsed(0); setDistM(0); setPhaseIdx(0); tickRef.current = 0; comboRef.current = 0; lockRef.current = 0; setComboSec(0); setScore(0); setLockSecThisSong(0); };
  const stopRun = () => setRunning(false);

  return (
    <div className="min-h-screen bg-[#0f0d13] text-[#e6e1e9] font-sans">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_240px] gap-6 items-start">
          {/* ---------------- PHONE ---------------- */}
          <div className="relative rounded-[2.5rem] border border-[#49454f] bg-[#141218] shadow-2xl overflow-hidden min-h-[820px] flex flex-col">
            {/* Top app bar */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-[#2b2930] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center text-zinc-900 font-black text-sm">T</div>
                <span className="font-bold tracking-tight">TempoRun</span>
              </div>
              {running ? (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  LIVE · {RUN_SCRIPT[phaseIdx].label.toUpperCase()}
                </span>
              ) : (
                <Tag className="text-lime-300 bg-lime-400/10 border-lime-400/30">On-device · $0/mo</Tag>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 px-5 pt-4 pb-32">
              {/* ============ RUN ============ */}
              {tab === "run" && (
                <div className="space-y-4">
                  {/* Pace hero */}
                  <Card className="p-5 text-center relative overflow-hidden">
                    <div className="flex items-center justify-center gap-2 mb-1.5">
                      <span className={`text-[11px] font-bold tracking-widest uppercase ${zone.color}`}>{zone.name}</span>
                      <span className="text-[10px] text-[#9a939f] tabular-nums">target {cadence} BPM</span>
                      {walkMode && <Tag className="bg-sky-400/15 text-sky-300 border-sky-400/40">WALK</Tag>}
                    </div>
                    <div className={`text-6xl font-black tracking-tighter tabular-nums leading-none ${zone.color}`}>{fmtPace(paceSec)}</div>
                    <div className="text-[11px] text-[#9a939f] mt-1">min / km</div>

                    {/* Zone bar */}
                    <div className="mt-4">
                      <div className="relative h-2 rounded-full bg-[#36343b] overflow-hidden">
                        <div className="absolute inset-0 flex">
                          <div className="flex-[240px] bg-sky-500/20" /><div className="flex-[45px] bg-emerald-500/25" />
                          <div className="flex-[45px] bg-lime-500/25" /><div className="flex-[30px] bg-amber-500/25" />
                          <div className="flex-[15px] bg-orange-500/25" />
                        </div>
                        <motion.div
                          className="absolute top-0 h-full w-1.5 rounded bg-white"
                          animate={{ left: `${((480 - paceSec) / 240) * 100}%` }}
                          transition={{ type: "spring", stiffness: 120, damping: 20 }}
                        />
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {[
                        { l: "Distance", v: (distM / 1000).toFixed(2), u: "km" },
                        { l: "Time", v: fmtClock(elapsed), u: "" },
                        { l: "Cadence", v: `${cadence}`, u: "spm" },
                      ].map((m) => (
                        <div key={m.l} className="rounded-2xl bg-[#141218] border border-[#2b2930] px-2 py-2 text-center">
                          <div className="text-[10px] uppercase tracking-wide text-[#9a939f]">{m.l}</div>
                          <div className="text-lg font-bold tabular-nums leading-tight">{m.v}</div>
                          <div className="text-[10px] text-[#9a939f]">{m.u}</div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Score / combo / PB strip */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`rounded-2xl border px-3 py-2.5 text-center transition-colors ${comboSec >= 20 ? "bg-lime-400/10 border-lime-400/40" : "bg-[#1d1b20] border-[#2b2930]"}`}>
                      <div className="text-[10px] uppercase tracking-wide text-[#9a939f]">Score</div>
                      <div className="text-xl font-black tabular-nums text-lime-300">{score.toLocaleString()}</div>
                    </div>
                    <div className={`rounded-2xl border px-3 py-2.5 text-center ${comboSec >= 20 ? "bg-lime-400/10 border-lime-400/40" : "bg-[#1d1b20] border-[#2b2930]"}`}>
                      <div className="text-[10px] uppercase tracking-wide text-[#9a939f]">Combo</div>
                      <div className={`text-xl font-black tabular-nums ${comboSec >= 20 ? "text-lime-300" : comboSec > 0 ? "text-[#e6e1e9]" : "text-[#9a939f]"}`}>×{mult.toFixed(1)}</div>
                      <div className="mt-1"><Linear value={(comboSec % 10) * 10} /></div>
                    </div>
                    <div className="rounded-2xl bg-[#1d1b20] border border-[#2b2930] px-3 py-2.5 text-center">
                      <div className="text-[10px] uppercase tracking-wide text-[#9a939f]">Song PB</div>
                      <div className="text-base font-bold tabular-nums pt-0.5">{Math.max(pb[current.id] || 0, lockSecThisSong)}s</div>
                      {lockSecThisSong > (pb[current.id] || 0) && lockSecThisSong > 0 && (
                        <span className="text-[9px] font-black text-amber-300">NEW PB!</span>
                      )}
                    </div>
                  </div>

                  {/* Now playing */}
                  <Card className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${current.g} flex items-center justify-center`}>
                          <motion.div
                            className="w-10 h-10 rounded-full border-2 border-white/70"
                            animate={{ scale: [1, 1.25, 1] }}
                            transition={{ duration: 60 / Math.max(eff, 60), repeat: Infinity, ease: "easeInOut" }}
                          />
                        </div>
                        <div
                          className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1d1b20] ${locked ? "bg-lime-400" : "bg-amber-400"} animate-pulse`}
                          style={{ animationDuration: `${60 / Math.max(eff, 60)}s` }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">{current.title}</span>
                          <Tag className="bg-lime-400/15 text-lime-300 border-lime-400/40 tabular-nums">{current.bpm} BPM</Tag>
                        </div>
                        <div className="text-xs text-[#c8c4d0] truncate">{current.artist} · {current.genre} · {current.year}</div>
                        <div className="text-[10px] mt-0.5">
                          {locked
                            ? <span className="text-lime-400 font-bold">⚡ LOCKED to cadence (Δ {delta.toFixed(0)})</span>
                            : <span className="text-amber-400">drifting · Δ {Math.abs(eff - cadence)} BPM</span>}
                        </div>
                        <div className="mt-2"><Linear value={songProg} /></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#9a939f]">
                        <Switch
                          checked={feel === "half"}
                          onCheckedChange={(c) => { const f = c ? "half" : "full"; setFeel(f); resync(cadence, f); }}
                          className="data-[state=checked]:bg-violet-400 scale-90"
                        />
                        Half-time matching
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setLiked((l) => l.includes(current.id) ? l.filter((x) => x !== current.id) : [...l, current.id])}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${liked.includes(current.id) ? "text-pink-400 bg-pink-400/10" : "text-[#c8c4d0] bg-[#272529]"}`}>
                          <Heart filled={liked.includes(current.id)} />
                        </button>
                        <button onClick={() => resync(cadence, feel)}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-[#c8c4d0] bg-[#272529]">
                          <Skip />
                        </button>
                      </div>
                    </div>
                  </Card>

                  {/* Pace control */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <span className="text-xs font-bold text-[#c8c4d0]">Set your pace — music follows</span>
                      <div className="flex items-center gap-3 text-[10px] text-[#9a939f]">
                        <div className="flex items-center gap-1.5">
                          <Switch checked={walkMode} onCheckedChange={setWalkMode} className="data-[state=checked]:bg-sky-400 scale-90" />
                          Walk
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Switch checked={autoSync} onCheckedChange={setAutoSync} className="data-[state=checked]:bg-lime-400 scale-90" />
                          Auto-sync
                        </div>
                      </div>
                    </div>
                    <Slider value={[paceSec]} onValueChange={onPaceChange} min={240} max={480} step={5} />
                    <div className="flex justify-between text-[10px] text-[#9a939f] mt-1"><span>4:00</span><span>6:00</span><span>8:00</span></div>
                  </Card>

                  <AnimatePresence>
                    {switched && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="rounded-xl bg-lime-400/10 border border-lime-400/30 px-3 py-2 text-xs text-lime-300"
                      >
                        {switched}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ============ PASSPORT ============ */}
              {tab === "passport" && (
                <div className="space-y-4">
                  {/* Active passport */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="min-w-0">
                        <div className="text-base font-bold truncate">{passport.title}</div>
                        <div className="text-[11px] text-[#9a939f] truncate">{passport.subtitle}</div>
                      </div>
                      <Tag className="bg-violet-400/15 text-violet-300 border-violet-400/40 shrink-0">ACTIVE</Tag>
                    </div>
                    <Linear value={Math.min((passKm / passport.gates[passport.gates.length - 1]) * 100, 100)} tone="bg-violet-400" />
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-[#9a939f] tabular-nums">{passKm.toFixed(1)} / {passport.gates[passport.gates.length - 1]} km</span>
                      <span className="text-[10px] text-[#c8c4d0] font-semibold">{passDoneCount}/{passport.tracks.length} tracks → Free Run</span>
                    </div>
                  </Card>

                  {/* Journey path */}
                  <div className="text-xs font-bold text-[#c8c4d0] mb-1">Journey — run or walk the milestones to unlock tracks</div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {passport.tracks.map((tid, i) => {
                      const s = LIBRARY.find((x) => x.id === tid)!;
                      const gate = passport.gates[i];
                      const done = passDone.includes(tid);
                      const isCurrent = !done && gate > passKm && (i === 0 || passport.gates[i - 1] <= passKm);
                      return (
                        <div key={tid} className={`shrink-0 w-28 rounded-2xl border p-2.5 ${done ? "border-lime-400/40 bg-lime-400/5" : isCurrent ? "border-violet-400/50 bg-violet-400/10" : "border-[#2b2930] bg-[#1d1b20]"}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black tabular-nums ${done ? "bg-lime-400 text-zinc-900" : isCurrent ? "bg-violet-400 text-zinc-900 animate-pulse" : "bg-[#36343b] text-[#9a939f]"}`}>
                              {done ? "✓" : isCurrent ? "▶" : gate}
                            </div>
                            <span className="text-[9px] text-[#9a939f] tabular-nums">{gate} km</span>
                          </div>
                          <div className={`text-[11px] font-semibold truncate ${!done && !isCurrent ? "text-[#9a939f]" : ""}`}>{s.title}</div>
                          <div className="text-[9px] text-[#9a939f] truncate">{s.artist}</div>
                          <div className="mt-1.5">
                            {done
                              ? <Tag className="bg-lime-400/15 text-lime-300 border-lime-400/40">UNLOCKED</Tag>
                              : isCurrent
                                ? <Tag className="bg-violet-400/15 text-violet-300 border-violet-400/40">UP NEXT</Tag>
                                : <Tag className="text-[#9a939f] border-[#49454f]">LOCKED</Tag>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Completed & upcoming */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-lime-400/25 bg-lime-400/5 p-3">
                      <div className="text-[10px] uppercase text-[#9a939f] mb-1">Completed</div>
                      <div className="text-sm font-semibold">First Mile ✓</div>
                      <div className="text-[10px] text-[#9a939f]">8/8 tracks · finished Oct 20</div>
                    </div>
                    <div className="rounded-2xl border border-[#2b2930] bg-[#1d1b20] p-3 opacity-70">
                      <div className="text-[10px] uppercase text-[#9a939f] mb-1">Up next</div>
                      <div className="text-sm font-semibold flex items-center gap-1.5"><Lock /> EDM Sprint Lab</div>
                      <div className="text-[10px] text-[#9a939f]">unlocks when Rock Road Trip completes</div>
                    </div>
                  </div>

                  <p className="text-[10px] text-[#9a939f]">
                    Passports are curated playlist journeys bundled with the app (new ones arrive with updates — zero server). Completing a milestone permanently unlocks that track for Free Run playlists.
                  </p>
                </div>
              )}

              {/* ============ MUSIC ============ */}
              {tab === "music" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex rounded-full bg-[#272529] p-1 text-xs">
                      {(["spotify", "ytm"] as const).map((s) => (
                        <button key={s} onClick={() => setSource(s)}
                          className={`px-4 py-1.5 rounded-full font-bold transition-colors ${source === s ? "bg-[#e6e1e9] text-zinc-900" : "text-[#9a939f]"}`}>
                          {s === "spotify" ? "Spotify" : "YT Music"}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-[#9a939f]">1,284 tracks analyzed on-device · 0 API calls</span>
                  </div>

                  {/* Free-run rotation */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="text-xs font-bold">Free Run rotation · {unlockedCount}/{LIBRARY.length} tracks</div>
                      <Tag className="bg-violet-400/15 text-violet-300 border-violet-400/40 tabular-nums shrink-0">
                        {passNextGate ? `${(passNextGate - passKm).toFixed(1)} km → next` : "complete"}
                      </Tag>
                    </div>
                    <Linear value={Math.min((passKm / passport.gates[passport.gates.length - 1]) * 100, 100)} tone="bg-violet-400" />
                    <div className="text-[10px] text-[#9a939f] mt-1.5">
                      {lifeKm.toFixed(1)} km lifetime · complete Passport milestones to unlock more tracks for Free Run
                    </div>
                  </Card>

                  {/* Match queue */}
                  <Card className="p-4">
                    <div className="text-xs font-bold mb-2">Match queue — target cadence {cadence} spm</div>
                    <div className="flex flex-wrap gap-1.5">
                      {LIBRARY
                        .filter(isUnlocked)
                        .sort((a, b) => Math.abs(effectiveBpm(a, feel) - cadence) - Math.abs(effectiveBpm(b, feel) - cadence))
                        .slice(0, 5)
                        .map((s, i) => (
                          <Tag key={s.id} className={`${i === 0 ? "bg-lime-400/15 text-lime-300 border-lime-400/40" : "bg-[#272529] text-[#c8c4d0] border-[#49454f]"} tabular-nums`}>
                            {i === 0 && "▶ "}{s.title} · {s.bpm}
                          </Tag>
                        ))}
                    </div>
                  </Card>

                  {/* Filters */}
                  <div className="space-y-2">
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {["All", "Sprint/Interval", "Tempo", "Easy", "Recovery / halftime"].map((z) => (
                        <Chip key={z} active={zoneFilter === z || (z === "All" && !zoneFilter)} onClick={() => setZoneFilter(z === "All" ? null : z)}>{z}</Chip>
                      ))}
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {["All", "Rock", "Hip-hop", "Pop", "EDM", "70s–80s", "2000s", "2010s+"].map((g) => (
                        <Chip key={g} tone="violet" active={genreFilter === g || (g === "All" && !genreFilter)} onClick={() => setGenreFilter(g === "All" ? null : g)}>{g}</Chip>
                      ))}
                    </div>
                  </div>

                  {/* Library */}
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {filteredLibrary.map((s) => {
                      const eb = effectiveBpm(s, feel);
                      const d = Math.abs(eb - cadence);
                      const ok = isUnlocked(s);
                      const isMatch = d <= 4 && ok;
                      const barPct = Math.min(((eb - 70) / 130) * 100, 100);
                      return (
                        <div key={s.id} onClick={() => { if (!ok) return; setCurrent(s); setDelta(d); recentRef.current = [s.id, ...recentRef.current].slice(0, 4); setTab("run"); }}
                          className={`flex items-center gap-3 rounded-2xl px-3 py-2 cursor-pointer hover:bg-[#272529] ${current.id === s.id ? "bg-[#272529] ring-1 ring-lime-400/40" : ""} ${!ok ? "opacity-45 cursor-not-allowed" : ""}`}>
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.g} shrink-0 flex items-center justify-center text-[#e6e1e9]`}>
                            {!ok && <Lock />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate flex items-center gap-2 flex-wrap">
                              {s.title}
                              {isMatch && <Tag className="bg-lime-400/15 text-lime-300 border-lime-400/40">MATCH</Tag>}
                              {ok && pb[s.id] ? <Tag className="text-amber-300/80 border-amber-400/30 tabular-nums">PB {pb[s.id]}s</Tag> : null}
                              {!ok && <span className="text-[10px] text-[#9a939f] shrink-0">unlocks at {s.unlockKm} km</span>}
                            </div>
                            <div className="text-[11px] text-[#9a939f] truncate">{s.artist} · {s.genre} · {s.year}</div>
                          </div>
                          <div className="w-16 shrink-0"><Linear value={barPct} tone={feel === "half" ? "bg-violet-400" : "bg-lime-400"} /></div>
                          <div className="text-xs tabular-nums text-[#c8c4d0] w-12 text-right">{s.bpm}<span className="text-[#9a939f]"> bpm</span></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ============ STORE ============ */}
              {tab === "store" && (
                <div className="space-y-4">
                  {/* Balance */}
                  <div className="flex items-center justify-between rounded-3xl border border-amber-400/25 bg-amber-400/5 px-5 py-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-[#9a939f]">TempoPoints</div>
                      <div className="text-2xl font-black tabular-nums text-amber-300">{points.toLocaleString()}</div>
                    </div>
                    <div className="text-right text-[10px] text-[#9a939f] max-w-[170px]">Earned by running & walking — combos, PBs, passport milestones</div>
                  </div>

                  {/* One-off songs */}
                  <div className="text-xs font-bold text-[#c8c4d0]">One-off songs → your collection</div>
                  <div className="space-y-1.5">
                    {([{ id: 9, price: 150 }, { id: 11, price: 200 }, { id: 14, price: 300 }] as const).map((item) => {
                      const s = LIBRARY.find((x) => x.id === item.id)!;
                      const owned = isUnlocked(s);
                      const canBuy = points >= item.price && !owned;
                      return (
                        <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-[#1d1b20] border border-[#2b2930] px-3 py-2.5">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.g} shrink-0`} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{s.title}</div>
                            <div className="text-[10px] text-[#9a939f] truncate">{s.artist} · {s.bpm} BPM · or earn free at {s.unlockKm} km</div>
                          </div>
                          <button disabled={!canBuy} onClick={() => { if (canBuy) { setPoints((p) => p - item.price); setPurchased((list) => [...list, item.id]); } }}
                            className={`h-8 px-3.5 rounded-full text-[11px] font-bold shrink-0 transition-colors ${owned ? "bg-[#272529] text-[#9a939f]" : canBuy ? "bg-amber-400 text-zinc-900" : "bg-[#272529] text-[#9a939f]"}`}>
                            {owned ? "IN COLLECTION" : `${item.price} pts`}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cosmetics */}
                  <div className="text-xs font-bold text-[#c8c4d0]">Cosmetics</div>
                  <div className="flex gap-2">
                    {([{ key: "vu", label: "Watch face · VU-Meter", price: 120 }, { key: "cover", label: "Passport cover · Neon Grid", price: 80 }, { key: "fx", label: "Milestone FX pack", price: 100 }] as const).map((c) => {
                      const owned = ownedCosmetics.includes(c.key);
                      const canBuy = points >= c.price && !owned;
                      return (
                        <div key={c.key} className="flex-1 rounded-2xl border border-[#2b2930] bg-[#1d1b20] p-2.5">
                          <div className="text-[10px] text-[#c8c4d0] font-medium truncate">{c.label}</div>
                          <button disabled={!canBuy} onClick={() => { if (canBuy) { setPoints((p) => p - c.price); setOwnedCosmetics((list) => [...list, c.key]); } }}
                            className={`h-7 px-2 mt-2 rounded-full text-[10px] font-bold w-full transition-colors ${owned ? "bg-[#272529] text-[#9a939f]" : canBuy ? "bg-amber-400 text-zinc-900" : "bg-[#272529] text-[#9a939f]"}`}>
                            {owned ? "OWNED" : `${c.price} pts`}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Supporter */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <div className="text-sm font-bold">Supporter Pass</div>
                      <Tag className="bg-lime-400/15 text-lime-300 border-lime-400/40 shrink-0">$2.99/mo · cancel anytime</Tag>
                    </div>
                    <p className="text-[11px] text-[#c8c4d0] leading-relaxed">
                      You never pay for content. Supporting funds runners — gift a month to another runner — and adds an expanded shop, early passports (free for everyone later), and extra playlist slots.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button className="h-8 px-4 rounded-full text-[11px] font-bold bg-lime-400 text-zinc-900 hover:bg-lime-300 transition-colors">Become a Supporter</button>
                      <button className="h-8 px-4 rounded-full text-[11px] font-bold border border-[#49454f] text-[#c8c4d0]">Gift a month</button>
                    </div>
                  </Card>

                  <p className="text-[10px] text-[#9a939f]">
                    Nothing here gates progression: points come from moving, and every song, passport, and feature stays earnable free — Finch-style healthy habit design.
                  </p>
                </div>
              )}

              {/* ============ HISTORY ============ */}
              {tab === "history" && (
                <div className="space-y-3">
                  {HISTORY.map((h) => (
                    <Card key={h.date} className="p-4">
                      <div className="flex items-center justify-between mb-2.5 gap-2">
                        <span className="text-sm font-bold">{h.date}</span>
                        <div className="flex gap-1.5 shrink-0">
                          <Tag className="text-amber-300 border-amber-400/40 tabular-nums">★ {h.score.toLocaleString()}</Tag>
                          <Tag className="text-lime-300 border-lime-400/40 tabular-nums">Sync {h.sync}%</Tag>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center mb-2.5">
                        <div><div className="text-[9px] text-[#9a939f] uppercase">Dist</div><div className="text-sm font-bold">{h.dist}</div></div>
                        <div><div className="text-[9px] text-[#9a939f] uppercase">Pace</div><div className="text-sm font-bold tabular-nums">{h.pace}</div></div>
                        <div><div className="text-[9px] text-[#9a939f] uppercase">Time</div><div className="text-sm font-bold tabular-nums">{h.dur}</div></div>
                        <div><div className="text-[9px] text-[#9a939f] uppercase">Avg BPM</div><div className="text-sm font-bold tabular-nums">{h.bpm}</div></div>
                      </div>
                      <div className="flex items-center gap-1">
                        {h.zones.map((z, i) => (
                          <div key={i} className={`flex-1 h-1.5 rounded-full ${zoneFor(z === "Sprint" ? 250 : z === "Interval" ? 270 : z === "Tempo" ? 300 : z === "Easy" ? 345 : 390).bar} opacity-70`} />
                        ))}
                      </div>
                      <div className="text-[10px] text-[#9a939f] mt-1.5">avg cadence {h.cadence} spm · {h.pb} song PBs beaten</div>
                    </Card>
                  ))}

                  {/* Song records */}
                  <Card className="p-4">
                    <div className="text-xs font-bold text-[#c8c4d0] mb-2.5">Song records — best lock streaks</div>
                    <div className="space-y-2">
                      {LIBRARY.filter((s) => pb[s.id]).sort((a, b) => (pb[b.id] || 0) - (pb[a.id] || 0)).map((s) => (
                        <div key={s.id} className="flex items-center gap-2.5 text-[11px]">
                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.g} shrink-0`} />
                          <span className="truncate flex-1">{s.title}</span>
                          <span className="text-[#9a939f] tabular-nums">{s.bpm} BPM</span>
                          <span className="tabular-nums text-amber-300 font-bold w-10 text-right">{pb[s.id]}s</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <p className="text-[10px] text-[#9a939f]">Sync score = share of run time where track tempo stayed within ±2% of cadence.</p>
                </div>
              )}
            </div>

            {/* Extended FAB — the primary action */}
            {tab === "run" && (
              <motion.button
                layout
                onClick={running ? stopRun : startRun}
                className="absolute right-5 bottom-[86px] z-10 flex items-center gap-2 rounded-2xl bg-lime-400 text-zinc-900 px-5 py-3.5 font-bold shadow-xl shadow-lime-400/20 hover:bg-lime-300 transition-colors"
              >
                {running ? <Pause /> : <Play />}
                {running ? "Pause" : "Start run"}
              </motion.button>
            )}

            {/* Bottom navigation bar */}
            <nav className="flex border-t border-[#2b2930] bg-[#141218] px-1 pb-1 pt-1.5 shrink-0">
              {NAV.map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setTab(id)} className="flex-1 flex flex-col items-center gap-0.5 py-1">
                  <span className={`w-14 h-8 rounded-full flex items-center justify-center transition-colors ${tab === id ? "bg-lime-400/15 text-lime-300" : "text-[#9a939f]"}`}>
                    <Icon />
                  </span>
                  <span className={`text-[10px] font-bold ${tab === id ? "text-lime-300" : "text-[#9a939f]"}`}>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* ---------------- WEAR OS ---------------- */}
          <div className="mx-auto">
            <div className="text-center text-[10px] uppercase tracking-widest text-[#9a939f] mb-3">Wear OS companion</div>
            <div className="mx-auto w-44 h-52 rounded-[2.6rem] bg-[#272529] border-4 border-[#49454f] shadow-xl p-2">
              <div className="w-full h-full rounded-[2.1rem] bg-black overflow-hidden relative">
                <div className="px-3 pt-4 text-center">
                  <div className="text-[9px] text-[#9a939f] tabular-nums">{RUN_SCRIPT[phaseIdx].label.toUpperCase()}</div>
                  <div className={`text-2xl font-black tabular-nums ${zone.color}`}>{fmtPace(paceSec)}</div>
                  <div className="text-[9px] text-[#9a939f]">pace · {(distM / 1000).toFixed(1)} km</div>
                </div>
                <div className="px-3 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${locked ? "bg-lime-400 animate-pulse" : "bg-amber-400"}`} style={{ animationDuration: `${60 / Math.max(eff, 60)}s` }} />
                    <div className="text-[10px] text-[#e6e1e9] truncate">{current.title}</div>
                  </div>
                  <div className="text-[9px] text-[#9a939f] tabular-nums">{current.bpm} BPM · {cadence} spm</div>
                  <div className="text-[9px] text-lime-400/80 tabular-nums font-bold mt-0.5">★ {score.toLocaleString()} · combo ×{mult.toFixed(1)}</div>
                </div>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                  <button onClick={() => resync(cadence, feel)} className="w-9 h-9 rounded-full bg-[#272529] flex items-center justify-center text-[#c8c4d0]"><Skip /></button>
                  <button onClick={running ? stopRun : startRun} className="w-11 h-11 rounded-full bg-lime-400 flex items-center justify-center text-zinc-900">
                    {running ? <Pause /> : <Play />}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 text-center text-[10px] text-[#9a939f] max-w-[210px] mx-auto">
              Phone-free runs: tempo-tagged playlist cached on watch, GPS + HR on-device
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#9a939f] mt-6">
          Material 3 prototype · production analyzes your library on-device (TarsosDSP-style beat detection) — no cloud, no API keys, $0/month to operate
        </p>
      </div>
    </div>
  );
}
