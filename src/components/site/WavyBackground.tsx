// Full-bleed layered wave background, inspired by aardvarkbookclub.com's
// treatment — their version colors 100% of the section edge-to-edge (no
// pale gaps), with waves adding depth/movement on top of that base rather
// than being the only source of color. First version here only had the
// wave shapes themselves, which left the top of the section
// pale/uncolored — this adds a full-bleed base fill first, then layers
// waves on top: a light one for movement, a second pooling toward the
// bottom (like light spilling from a lamp, not just decoration).
//
// The three blobs below sit on top of that static base, each its own
// full-bleed <svg> so it can drift independently via a plain CSS transform
// (position: absolute; inset: 0 — same shape, just nudged/scaled a few
// percent). Paths are Catmull-Rom-smoothed closed splines through a
// randomized ring of points (the same technique blob-generator tools like
// haikei/blobmaker use under the hood), generated once and hardcoded here
// rather than computed with Math.random at render time, so the shapes are
// stable across every render/build instead of reshuffling on each request.
//
// `palette` swaps only the fill colors, never the shapes — used so the
// "how it's made" section can echo the hero's wavy treatment as a
// recognizable family resemblance while reading as a distinct section
// rather than a repeat of the hero.
type Palette = "hero" | "dusk";

const PALETTES: Record<
  Palette,
  { base: string; waveA: string; waveB: string; blobA: string; blobB: string; blobC: string }
> = {
  hero: {
    base: "var(--blush)",
    waveA: "var(--papier)",
    waveB: "var(--lueur)",
    blobA: "var(--papier)",
    blobB: "var(--lueur)",
    blobC: "var(--blush)",
  },
  dusk: {
    base: "var(--crepuscule)",
    waveA: "var(--papier)",
    waveB: "var(--sauge)",
    blobA: "var(--papier)",
    blobB: "var(--sauge)",
    blobC: "var(--lueur)",
  },
};

export function WavyBackground({ palette = "hero" }: { palette?: Palette }) {
  const c = PALETTES[palette];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <svg viewBox="0 0 1440 800" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <rect width="1440" height="800" fill={c.base} />
        <path
          d="M0,300 C240,200 420,400 680,320 C940,240 1140,380 1440,280 L1440,800 L0,800 Z"
          fill={c.waveA}
          opacity="0.35"
        />
        <path
          d="M0,520 C260,440 460,600 760,520 C1040,450 1220,560 1440,500 L1440,800 L0,800 Z"
          fill={c.waveB}
          opacity="0.3"
        />
      </svg>

      <svg
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
        className="blob-drift absolute inset-0 h-full w-full [animation-duration:16s]"
      >
        <path
          d="M 170.4,100.0 C 170.1,115.5 163.9,133.6 154.3,145.6 C 144.7,157.6 127.9,169.4 112.7,172.3 C 97.6,175.2 78.4,170.5 63.6,163.1 C 48.8,155.7 28.9,142.3 23.8,127.7 C 18.8,113.1 25.1,88.5 33.1,75.6 C 41.1,62.8 58.4,58.4 71.6,50.8 C 84.8,43.2 98.2,29.8 112.3,30.1 C 126.4,30.4 146.5,41.2 156.2,52.8 C 165.9,64.5 170.7,84.5 170.4,100.0 Z"
          fill={c.blobA}
          opacity="0.4"
        />
      </svg>
      <svg
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
        className="blob-drift absolute inset-0 h-full w-full [animation-duration:19s] [animation-direction:alternate-reverse]"
      >
        <path
          d="M 171.4,100.0 C 170.7,116.3 158.7,133.5 146.8,146.8 C 134.9,160.2 116.5,179.1 100.0,180.0 C 83.5,180.9 57.3,165.5 47.8,152.2 C 38.3,138.8 42.5,116.8 43.1,100.0 C 43.6,83.2 41.8,61.3 51.3,51.3 C 60.8,41.2 83.4,40.1 100.0,39.7 C 116.6,39.3 139.2,38.9 151.1,48.9 C 163.0,59.0 172.1,83.7 171.4,100.0 Z"
          fill={c.blobB}
          opacity="0.25"
        />
      </svg>
      <svg
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
        className="blob-drift absolute inset-0 h-full w-full [animation-duration:15s]"
      >
        <path
          d="M 153.1,100.0 C 150.7,112.4 148.8,119.5 144.0,132.0 C 139.2,144.5 135.3,168.8 124.3,174.7 C 113.3,180.7 91.0,173.7 78.0,167.8 C 65.0,161.8 53.1,150.4 46.1,139.1 C 39.2,127.8 36.3,112.9 36.5,100.0 C 36.7,87.1 39.8,71.1 47.3,61.7 C 54.9,52.4 69.5,48.1 81.7,43.8 C 94.0,39.5 108.1,33.6 120.8,35.9 C 133.6,38.2 152.9,47.0 158.3,57.6 C 163.7,68.3 155.5,87.6 153.1,100.0 Z"
          fill={c.blobC}
          opacity="0.35"
        />
      </svg>
    </div>
  );
}
