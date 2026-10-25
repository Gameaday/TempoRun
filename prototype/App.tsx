import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  { id: 7,  title: "Radioactive",        artist: "Imagine Dragons",         bpm: 136, g: "from-emerald-600 to-lime-400", genre: "Rock",    year: 2012, unlockKm: 20 },
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

function pickSong(target: number, feel: "full" | "half", recent: number[], lifeKm: number) {
  let best: Song | null = null;
  let bestScore = Infinity;
  for (const s of LIBRARY) {
    if (s.unlockKm > lifeKm) continue; // locked songs never auto-queue
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
// Icons (inline SVG)
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
const Shoe = () => (<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14h13a4 4 0 0 1 4 4v2H4z" /><path d="M4 14V8m4 6V8m4 6V8m4 6V8" /></svg>);
const Lock = () => (<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);
const Star = () => (<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.6 1.4-6.8L2.2 9.1l6.9-.8z" /></svg>);

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
  const [score, setScore] = useState(0);
  const [comboSec, setComboSec] = useState(0);
  const [lockSecThisSong, setLockSecThisSong] = useState(0);
  const [pb, setPb] = useState<Record<number, number>>({ 1: 96, 4: 74, 5: 82 });
  const comboRef = useRef(0);
  const lockRef = useRef(0);
  const BASE_LIFE_KM = 46.2;

  const cadence = paceSecToCadence(paceSec);
  const zone = zoneFor(paceSec);
  const eff = effectiveBpm(current, feel);
  const locked = Math.abs(eff - cadence) <= 2;
  const lifeKm = BASE_LIFE_KM + distM / 1000;
  const mult = Math.min(1 + comboSec * 0.05, 4);
  const isUnlocked = (s: Song) => s.unlockKm <= lifeKm;
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
    const { song, delta: d } = pickSong(target, f, recentRef.current, lifeKm);
    recentRef.current = [song.id, ...recentRef.current].slice(0, 4);
    setCurrent(song);
    setDelta(d);
    setSongProg(5);
    setSwitched(`Switched → ${song.title} · Δ ${d.toFixed(0)} BPM`);
    setTimeout(() => setSwitched(null), 2600);
  }, [current, lifeKm]);

  // React to manual pace slider changes
  const onPaceChange = (v: number[]) => {
    setPaceSec(v[0]);
    if (autoSync) {
      const t = paceSecToCadence(v[0]);
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center text-zinc-900 font-black text-lg">T</div>
            <div>
              <div className="text-xl font-black tracking-tight leading-none">TempoRun</div>
              <div className="text-[11px] text-zinc-500 leading-none mt-1">run to the beat · Android + Wear OS</div>
            </div>
          </div>
          <Badge variant="outline" className="border-lime-500/40 text-lime-400 gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
            On-device tempo engine · no cloud · $0/mo
          </Badge>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_240px] gap-6 items-start">
          {/* ---------------- PHONE ---------------- */}
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
            <Tabs value={tab} onValueChange={setTab}>
              <div className="px-5 pt-4 pb-1 flex items-center justify-between">
                <TabsList className="bg-zinc-800/70">
                  <TabsTrigger value="run" className="data-[state=active]:bg-zinc-700 text-zinc-300 data-[state=active]:text-white gap-1.5"><Shoe /> Run</TabsTrigger>
                  <TabsTrigger value="passport" className="data-[state=active]:bg-zinc-700 text-zinc-300 data-[state=active]:text-white">Passport</TabsTrigger>
                  <TabsTrigger value="music" className="data-[state=active]:bg-zinc-700 text-zinc-300 data-[state=active]:text-white">Music</TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-zinc-700 text-zinc-300 data-[state=active]:text-white">History</TabsTrigger>
                </TabsList>
                {running && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Badge className="bg-red-500/90 text-white gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE · {RUN_SCRIPT[phaseIdx].label}
                    </Badge>
                  </motion.div>
                )}
              </div>

              {/* ============ RUN TAB ============ */}
              <TabsContent value="run" className="px-5 pb-6 pt-2 mt-0">
                {/* Combo / score strip */}
                <div className="flex items-center justify-between rounded-xl border border-lime-500/25 bg-lime-500/5 px-4 py-2.5 mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Run score</div>
                    <div className="text-xl font-black tabular-nums text-lime-300">{score.toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Combo</div>
                    <div className={`text-lg font-black tabular-nums ${comboSec >= 20 ? "text-lime-300" : comboSec > 0 ? "text-zinc-200" : "text-zinc-500"}`}>×{mult.toFixed(1)}</div>
                    <div className="h-1 w-16 bg-zinc-800 rounded overflow-hidden mt-0.5 mx-auto">
                      <div className="h-full bg-lime-400 rounded transition-all" style={{ width: `${(comboSec % 10) * 10}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Song PB</div>
                    <div className="text-sm font-bold tabular-nums">{Math.max(pb[current.id] || 0, lockSecThisSong)}s locked</div>
                    {lockSecThisSong > (pb[current.id] || 0) && lockSecThisSong > 0 && (
                      <span className="text-[9px] font-black text-amber-300">NEW PB!</span>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { l: "Pace", v: `${fmtPace(paceSec)}`, s: "/km" },
                    { l: "Dist", v: (distM / 1000).toFixed(2), s: "km" },
                    { l: "Time", v: fmtClock(elapsed), s: "" },
                    { l: "Cadence", v: `${cadence}`, s: "spm" },
                  ].map((m) => (
                    <div key={m.l} className="rounded-xl bg-zinc-800/60 px-2 py-2.5 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{m.l}</div>
                      <div className="text-lg font-bold tabular-nums leading-tight">{m.v}</div>
                      <div className="text-[10px] text-zinc-500">{m.s}</div>
                    </div>
                  ))}
                </div>

                {/* Zone bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                    <span>Recovery</span><span>Easy</span><span>Tempo</span><span>Interval</span><span>Sprint</span>
                  </div>
                  <div className="relative h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="absolute inset-0 flex">
                      <div className="flex-[240px] bg-sky-900/60" /><div className="flex-[45px] bg-emerald-900/60" />
                      <div className="flex-[45px] bg-lime-900/60" /><div className="flex-[30px] bg-amber-900/60" />
                      <div className="flex-[15px] bg-orange-900/60" />
                    </div>
                    <motion.div
                      className="absolute top-0 h-full w-1.5 rounded bg-white"
                      animate={{ left: `${((480 - paceSec) / 240) * 100}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className={`text-xs font-semibold ${zone.color}`}>{zone.name} zone</span>
                    <span className="text-[10px] text-zinc-500 tabular-nums">target {cadence} BPM</span>
                  </div>
                </div>

                {/* Pace control */}
                <Card className="bg-zinc-800/40 border-zinc-700/60 mb-4">
                  <CardContent className="py-4 px-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-zinc-400">Drag your pace — music follows</span>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                        <Switch checked={autoSync} onCheckedChange={setAutoSync} className="data-[state=checked]:bg-lime-500 scale-90" />
                        Auto-sync
                      </div>
                    </div>
                    <Slider value={[paceSec]} onValueChange={onPaceChange} min={240} max={480} step={5} />
                    <div className="flex justify-between text-[10px] text-zinc-500 mt-1"><span>4:00</span><span>6:00</span><span>8:00</span></div>
                  </CardContent>
                </Card>

                {/* Now playing */}
                <Card className="bg-zinc-800/40 border-zinc-700/60 mb-4 overflow-hidden">
                  <CardContent className="py-4 px-4">
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${current.g} flex items-center justify-center`}>
                          <motion.div
                            className="w-8 h-8 rounded-full border-2 border-white/70"
                            animate={{ scale: [1, 1.25, 1] }}
                            transition={{ duration: 60 / Math.max(eff, 60), repeat: Infinity, ease: "easeInOut" }}
                          />
                        </div>
                        <div
                          className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full ${locked ? "bg-lime-400" : "bg-amber-400"} animate-pulse`}
                          style={{ animationDuration: `${60 / Math.max(eff, 60)}s` }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{current.title}</span>
                          <Badge className="bg-lime-500/15 text-lime-400 border-lime-500/30 text-[10px] tabular-nums">{current.bpm} BPM</Badge>
                        </div>
                        <div className="text-xs text-zinc-400 truncate">{current.artist} · {current.genre} · {current.year}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {feel === "half" ? "half-time feel (×2)" : "full-time"} · {locked
                            ? <span className="text-lime-400 font-semibold">⚡ LOCKED to cadence (Δ {delta.toFixed(0)})</span>
                            : <span className="text-amber-400">drifting · Δ {Math.abs(eff - cadence)} BPM</span>}
                        </div>
                        <Progress value={songProg} className="h-1 mt-2 bg-zinc-700 [&>div]:bg-lime-400" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                        <Switch
                          checked={feel === "half"}
                          onCheckedChange={(c) => { const f = c ? "half" : "full"; setFeel(f); resync(cadence, f); }}
                          className="data-[state=checked]:bg-violet-500 scale-90"
                        />
                        Half-time matching
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-400" onClick={() => setLiked((l) => l.includes(current.id) ? l.filter((x) => x !== current.id) : [...l, current.id])}>
                          <Heart filled={liked.includes(current.id)} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-400" onClick={() => resync(cadence, feel)}><Skip /></Button>
                        <Button size="sm" className="h-8 bg-lime-500 hover:bg-lime-400 text-zinc-900 font-semibold px-4" onClick={running ? stopRun : startRun}>
                          {running ? <Pause /> : <Play />} {running ? "Pause" : "Start run"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <AnimatePresence>
                  {switched && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="rounded-lg bg-lime-500/10 border border-lime-500/30 px-3 py-2 text-xs text-lime-300"
                    >
                      {switched}
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              {/* ============ PASSPORT TAB ============ */}
              <TabsContent value="passport" className="px-5 pb-6 pt-2 mt-0">
                {/* Active passport */}
                <Card className="bg-zinc-800/40 border-zinc-700/60 mb-4 overflow-hidden relative">
                  <CardContent className="py-4 px-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="min-w-0">
                        <div className="text-sm font-black truncate">{passport.title}</div>
                        <div className="text-[11px] text-zinc-500 truncate">{passport.subtitle}</div>
                      </div>
                      <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/30 text-[10px] shrink-0">ACTIVE</Badge>
                    </div>
                    <Progress value={Math.min((passKm / passport.gates[passport.gates.length - 1]) * 100, 100)} className="h-1.5 mt-2.5 bg-zinc-700 [&>div]:bg-violet-400" />
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-zinc-500 tabular-nums">{passKm.toFixed(1)} / {passport.gates[passport.gates.length - 1]} km with this passport</span>
                      <span className="text-[10px] text-zinc-400 font-semibold">{passDoneCount}/{passport.tracks.length} tracks → Free Run</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Journey path */}
                <div className="text-xs font-semibold text-zinc-400 mb-2">Journey — run the milestones to unlock tracks</div>
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                  {passport.tracks.map((tid, i) => {
                    const s = LIBRARY.find((x) => x.id === tid)!;
                    const gate = passport.gates[i];
                    const done = passDone.includes(tid);
                    const isCurrent = !done && gate > passKm && (i === 0 || passport.gates[i - 1] <= passKm);
                    return (
                      <div key={tid} className={`shrink-0 w-28 rounded-xl border p-2.5 ${done ? "border-lime-500/40 bg-lime-500/5" : isCurrent ? "border-violet-400/50 bg-violet-500/10" : "border-zinc-700/60 bg-zinc-800/40"}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black tabular-nums ${done ? "bg-lime-400 text-zinc-900" : isCurrent ? "bg-violet-400 text-zinc-900 animate-pulse" : "bg-zinc-700 text-zinc-400"}`}>
                            {done ? "✓" : isCurrent ? "▶" : gate}
                          </div>
                          <span className="text-[9px] text-zinc-500 tabular-nums">{gate} km</span>
                        </div>
                        <div className={`text-[11px] font-semibold truncate ${!done && !isCurrent ? "text-zinc-500" : ""}`}>{s.title}</div>
                        <div className="text-[9px] text-zinc-500 truncate">{s.artist}</div>
                        <div className="mt-1.5">
                          {done
                            ? <Badge className="bg-lime-500/15 text-lime-400 border-lime-500/30 text-[9px]">UNLOCKED</Badge>
                            : isCurrent
                              ? <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/30 text-[9px]">UP NEXT</Badge>
                              : <Badge variant="outline" className="text-zinc-500 border-zinc-700 text-[9px]">LOCKED</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Completed & upcoming */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-xl border border-lime-500/25 bg-lime-500/5 p-3">
                    <div className="text-[10px] uppercase text-zinc-500 mb-1">Completed</div>
                    <div className="text-sm font-semibold">First Mile ✓</div>
                    <div className="text-[10px] text-zinc-500">8/8 tracks · finished Oct 20</div>
                  </div>
                  <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/40 p-3 opacity-70">
                    <div className="text-[10px] uppercase text-zinc-500 mb-1">Up next</div>
                    <div className="text-sm font-semibold flex items-center gap-1.5"><Lock /> EDM Sprint Lab</div>
                    <div className="text-[10px] text-zinc-500">unlocks when Rock Road Trip completes</div>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-600">
                  Passports are curated playlist journeys bundled with the app (new ones arrive with updates — zero server). Completing a milestone permanently unlocks that track for Free Run playlists.
                </p>
              </TabsContent>

              {/* ============ MUSIC TAB ============ */}
              <TabsContent value="music" className="px-5 pb-6 pt-2 mt-0">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex rounded-lg bg-zinc-800 p-0.5 text-xs">
                    {(["spotify", "ytm"] as const).map((s) => (
                      <button key={s} onClick={() => setSource(s)}
                        className={`px-3 py-1.5 rounded-md font-semibold ${source === s ? "bg-zinc-600 text-white" : "text-zinc-500"}`}>
                        {s === "spotify" ? "Spotify" : "YT Music"}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-zinc-500">1,284 tracks analyzed on-device · 0 API calls</span>
                </div>

                <Card className="bg-zinc-800/40 border-zinc-700/60 mb-4">
                  <CardContent className="py-3.5 px-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold">Library scan</div>
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">done · overnight, Wi-Fi + charging</Badge>
                    </div>
                    <Progress value={100} className="h-1.5 bg-zinc-700 [&>div]:bg-emerald-400" />
                    <div className="text-[10px] text-zinc-500 mt-1.5">1,284 local tracks analyzed on-device · 41 low-confidence excluded · cache stored offline in Room</div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-800/40 border-zinc-700/60 mb-4">
                  <CardContent className="py-3.5 px-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold">Free Run rotation · {unlockedCount}/{LIBRARY.length} tracks unlocked</div>
                      <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/30 text-[10px] tabular-nums">
                        {passNextGate ? `${(passNextGate - passKm).toFixed(1)} km → next milestone` : "journey complete"}
                      </Badge>
                    </div>
                    <Progress value={Math.min((passKm / passport.gates[passport.gates.length - 1]) * 100, 100)} className="h-1.5 bg-zinc-700 [&>div]:bg-violet-400" />
                    <div className="text-[10px] text-zinc-500 mt-1.5">
                      {lifeKm.toFixed(1)} km lifetime · complete Playlist Passport milestones (Passport tab) to unlock more tracks for Free Run playlists
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-800/40 border-zinc-700/60 mb-4">
                  <CardContent className="py-3.5 px-4">
                    <div className="text-xs font-semibold mb-1.5">Match queue — built from your target cadence ({cadence} spm)</div>
                    <div className="flex flex-wrap gap-1.5">
                      {LIBRARY
                        .filter(isUnlocked)
                        .sort((a, b) => Math.abs(effectiveBpm(a, feel) - cadence) - Math.abs(effectiveBpm(b, feel) - cadence))
                        .slice(0, 5)
                        .map((s, i) => (
                          <Badge key={s.id} className={`${i === 0 ? "bg-lime-500/20 text-lime-300 border-lime-500/40" : "bg-zinc-800 text-zinc-300 border-zinc-700"} tabular-nums gap-1`}>
                            {i === 0 && "▶ "}{s.title} · {s.bpm}
                          </Badge>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                  {["All", "Sprint/Interval", "Tempo", "Easy", "Recovery / halftime"].map((z) => (
                    <button key={z} onClick={() => setZoneFilter(z === "All" ? null : z)}
                      className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${zoneFilter === z || (z === "All" && !zoneFilter) ? "bg-zinc-100 text-zinc-900 border-zinc-100" : "border-zinc-700 text-zinc-400"}`}>
                      {z}
                    </button>
                  ))}
                </div>

                <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                  {["All", "Rock", "Hip-hop", "Pop", "EDM", "70s–80s", "2000s", "2010s+"].map((g) => (
                    <button key={g} onClick={() => setGenreFilter(g === "All" ? null : g)}
                      className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${genreFilter === g || (g === "All" && !genreFilter) ? "bg-violet-400 text-zinc-900 border-violet-400" : "border-zinc-700 text-zinc-400"}`}>
                      {g}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {filteredLibrary.map((s) => {
                    const eb = effectiveBpm(s, feel);
                    const d = Math.abs(eb - cadence);
                    const ok = isUnlocked(s);
                    const isMatch = d <= 4 && ok;
                    const barPct = Math.min(((eb - 70) / 130) * 100, 100);
                    return (
                      <div key={s.id} onClick={() => { if (!ok) return; setCurrent(s); setDelta(d); recentRef.current = [s.id, ...recentRef.current].slice(0, 4); setTab("run"); }}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-zinc-800/70 ${current.id === s.id ? "bg-zinc-800 ring-1 ring-lime-500/40" : ""} ${!ok ? "opacity-45 cursor-not-allowed" : ""}`}>
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.g} shrink-0 flex items-center justify-center ${!ok ? "text-zinc-100" : ""}`}>
                          {!ok && <Lock />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate flex items-center gap-2">
                            {s.title}
                            {isMatch && <Badge className="bg-lime-500/15 text-lime-400 border-lime-500/30 text-[9px] px-1">MATCH</Badge>}
                            {ok && pb[s.id] ? <Badge variant="outline" className="text-amber-400/80 border-amber-500/30 text-[9px] px-1 tabular-nums">PB {pb[s.id]}s</Badge> : null}
                            {!ok && <span className="text-[10px] text-zinc-500 shrink-0">unlocks at {s.unlockKm} km</span>}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate">{s.artist} · {s.genre} · {s.year}</div>
                        </div>
                        <div className="w-20 shrink-0">
                          <div className="h-1 rounded bg-zinc-800 overflow-hidden">
                            <div className={`h-full ${feel === "half" ? "bg-violet-400" : "bg-lime-400"}`} style={{ width: `${barPct}%` }} />
                          </div>
                        </div>
                        <div className="text-xs tabular-nums text-zinc-400 w-14 text-right">{s.bpm} <span className="text-zinc-600">bpm</span></div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* ============ HISTORY TAB ============ */}
              <TabsContent value="history" className="px-5 pb-6 pt-2 mt-0">
                <div className="space-y-3">
                  {HISTORY.map((h) => (
                    <Card key={h.date} className="bg-zinc-800/40 border-zinc-700/60">
                      <CardContent className="py-3.5 px-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold">{h.date}</span>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-amber-400 border-amber-500/40 tabular-nums gap-1"><Star /> {h.score.toLocaleString()}</Badge>
                            <Badge variant="outline" className="text-lime-400 border-lime-500/40 tabular-nums">Sync {h.sync}%</Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center mb-2.5">
                          <div><div className="text-[9px] text-zinc-500 uppercase">Dist</div><div className="text-sm font-bold">{h.dist}</div></div>
                          <div><div className="text-[9px] text-zinc-500 uppercase">Pace</div><div className="text-sm font-bold tabular-nums">{h.pace}</div></div>
                          <div><div className="text-[9px] text-zinc-500 uppercase">Time</div><div className="text-sm font-bold tabular-nums">{h.dur}</div></div>
                          <div><div className="text-[9px] text-zinc-500 uppercase">Avg BPM</div><div className="text-sm font-bold tabular-nums">{h.bpm}</div></div>
                        </div>
                        <div className="flex items-center gap-1">
                          {h.zones.map((z, i) => (
                            <div key={i} className={`flex-1 h-1.5 rounded-full ${zoneFor(z === "Sprint" ? 250 : z === "Interval" ? 270 : z === "Tempo" ? 300 : z === "Easy" ? 345 : 390).bar} opacity-70`} />
                          ))}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1.5">Zone map · avg cadence {h.cadence} spm · {h.pb} song PBs beaten</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="text-xs font-semibold text-zinc-400 mb-2">Song records — best lock streaks</div>
                  <div className="space-y-1.5">
                    {LIBRARY.filter((s) => pb[s.id]).sort((a, b) => (pb[b.id] || 0) - (pb[a.id] || 0)).map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-[11px]">
                        <div className={`w-6 h-6 rounded bg-gradient-to-br ${s.g} shrink-0`} />
                        <span className="truncate flex-1">{s.title}</span>
                        <span className="text-zinc-600 tabular-nums">{s.bpm} BPM</span>
                        <span className="tabular-nums text-amber-400 font-semibold w-10 text-right">{pb[s.id]}s</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-zinc-600 mt-3">Sync score = share of run time where track tempo stayed within ±2% of cadence.</p>
              </TabsContent>
            </Tabs>
          </div>

          {/* ---------------- WEAR OS ---------------- */}
          <div className="mx-auto">
            <div className="text-center text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Wear OS companion</div>
            <div className="mx-auto w-44 h-52 rounded-[2.6rem] bg-zinc-800 border-4 border-zinc-700 shadow-xl p-2">
              <div className="w-full h-full rounded-[2.1rem] bg-black overflow-hidden relative">
                <div className="px-3 pt-4 text-center">
                  <div className="text-[9px] text-zinc-500 tabular-nums">{RUN_SCRIPT[phaseIdx].label.toUpperCase()}</div>
                  <div className={`text-2xl font-black tabular-nums ${zone.color}`}>{fmtPace(paceSec)}</div>
                  <div className="text-[9px] text-zinc-500">pace · {(distM / 1000).toFixed(1)} km</div>
                </div>
                <div className="px-3 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${locked ? "bg-lime-400 animate-pulse" : "bg-amber-400"}`} style={{ animationDuration: `${60 / Math.max(eff, 60)}s` }} />
                    <div className="text-[10px] text-zinc-300 truncate">{current.title}</div>
                  </div>
                  <div className="text-[9px] text-zinc-500 tabular-nums">{current.bpm} BPM · {cadence} spm</div>
                  <div className="text-[9px] text-lime-400/80 tabular-nums font-semibold">⭐ {score.toLocaleString()} · combo ×{mult.toFixed(1)}</div>
                </div>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                  <button onClick={() => resync(cadence, feel)} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300"><Skip /></button>
                  <button onClick={running ? stopRun : startRun} className="w-11 h-11 rounded-full bg-lime-500 flex items-center justify-center text-zinc-900">
                    {running ? <Pause /> : <Play />}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 text-center text-[10px] text-zinc-500 max-w-[210px] mx-auto">
              Phone-free runs: tempo-tagged playlist cached on watch, GPS + HR on-device
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-zinc-600 mt-6">
          Prototype · production analyzes your library on-device (TarsosDSP-style beat detection) — no cloud, no API keys, $0/month to operate
        </p>
      </div>
    </div>
  );
}
