/**
 * PostDiagram — Live SVG technical drawing of Infinity post configuration
 * Renders a dimensioned engineering-style diagram matching the installation guide details.
 * Updates dynamically based on mount type, rail height, glass reveal, post height, etc.
 *
 * Design: black/white engineering drawing style with gold (#B69A5A) dimension lines
 */

import React from 'react';

interface PostDiagramProps {
  mountType: 'surface' | 'fascia';
  railHeightActual: number;       // e.g. 42.125
  postHeightAboveDeck: number;    // e.g. 40
  topGlassReveal: number;         // e.g. 2.125
  bottomGlassGap: number;         // e.g. 2
  glassInsertLength: number;      // glass inside post
  settingBlockHeight: number;
  physicalPostLength?: number;    // fascia only
  fasciaOffset?: number;          // fascia only (0.4375 or 1.5)
  distTopBasePlateToDeck?: number;// fascia only
  isShortPost?: boolean;
}

// Dimension line arrow marker
const ARROW_SIZE = 5;

function fmt(n: number): string {
  // Format as fractional inches string for labels
  const whole = Math.floor(n);
  const frac = n - whole;
  const fracs: [number, string][] = [
    [0, ''],
    [0.0625, '1/16"'],
    [0.125, '1/8"'],
    [0.1875, '3/16"'],
    [0.25, '1/4"'],
    [0.3125, '5/16"'],
    [0.375, '3/8"'],
    [0.4375, '7/16"'],
    [0.5, '1/2"'],
    [0.5625, '9/16"'],
    [0.625, '5/8"'],
    [0.6875, '11/16"'],
    [0.75, '3/4"'],
    [0.8125, '13/16"'],
    [0.875, '7/8"'],
    [0.9375, '15/16"'],
    [1, ''],
  ];
  let closest = fracs[0];
  for (const f of fracs) {
    if (Math.abs(f[0] - frac) < Math.abs(closest[0] - frac)) closest = f;
  }
  const fracStr = closest[1];
  if (fracStr === '') {
    const w = whole + (closest[0] === 1 ? 1 : 0);
    return `${w}"`;
  }
  return whole > 0 ? `${whole}-${fracStr}` : fracStr;
}

interface DimLineProps {
  x1: number; y1: number;
  x2: number; y2: number;
  label: string;
  labelX: number; labelY: number;
  labelAnchor?: 'start' | 'middle' | 'end';
  labelAngle?: number;
  color?: string;
  extLine?: boolean; // draw extension lines
}

function DimLine({ x1, y1, x2, y2, label, labelX, labelY, labelAnchor = 'middle', labelAngle = 0, color = '#B69A5A', extLine = true }: DimLineProps) {
  return (
    <g>
      {/* Main dimension line */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.8" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
      {/* Label */}
      <text
        x={labelX}
        y={labelY}
        fontSize="8"
        fill={color}
        textAnchor={labelAnchor}
        fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontWeight="600"
        transform={labelAngle ? `rotate(${labelAngle}, ${labelX}, ${labelY})` : undefined}
      >
        {label}
      </text>
    </g>
  );
}

export default function PostDiagram({
  mountType,
  railHeightActual,
  postHeightAboveDeck,
  topGlassReveal,
  bottomGlassGap,
  glassInsertLength,
  settingBlockHeight,
  physicalPostLength,
  fasciaOffset = 0.4375,
  distTopBasePlateToDeck = 3,
  isShortPost = false,
}: PostDiagramProps) {
  const isFascia = mountType === 'fascia';

  // ── SVG coordinate system ──────────────────────────────────────────────────
  // We draw the diagram in a 200×420 viewBox.
  // The "deck level" is at a fixed Y position; everything scales proportionally.
  // Scale: 1 real inch ≈ some pixels. We fit the full rail height + some margin.

  const SVG_W = 260;
  const SVG_H = 480;
  const MARGIN_TOP = 35;
  const MARGIN_BOTTOM = 65;

  // Total real height to display: rail height + base plate below deck
  const basePlateDepth = isFascia ? 8 : 6; // approximate below-deck depth
  const totalRealHeight = railHeightActual + basePlateDepth;
  const drawHeight = SVG_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = drawHeight / totalRealHeight; // px per inch

  // Deck Y in SVG coords
  const deckY = MARGIN_TOP + (railHeightActual * scale);

  // Post positions (centered horizontally)
  const postCX = 105; // center x of post
  const postW = 12;   // post width
  const glassW = 6;   // glass panel width
  const glassOffsetFromPost = 2; // glass sits just outside post

  // Key Y positions
  const topOfRailY = MARGIN_TOP; // rail top = top of SVG content
  const topOfPostY = deckY - (postHeightAboveDeck * scale);
  const topOfGlassY = topOfRailY; // glass top = rail height top
  const bottomOfGlassY = deckY - (bottomGlassGap * scale);
  const bottomOfPostY = isFascia
    ? deckY + ((physicalPostLength || postHeightAboveDeck + 10) - postHeightAboveDeck) * scale
    : deckY + (basePlateDepth * scale);

  // Base plate
  const bpW = isFascia ? 16 : 22;
  const bpH = 4;
  const bpY = isFascia ? deckY - (distTopBasePlateToDeck * scale) : deckY;

  // Glass top reveal marker
  const glassTopRevealY = topOfPostY + (topGlassReveal * scale);

  // Dimension line X positions (left side and right side)
  const leftDim1X = 18;
  const leftDim2X = 34;
  const leftDim3X = 50;
  const rightDim1X = 158;
  const rightDim2X = 178;
  const rightDim3X = 198;
  const rightDim4X = 218;

  const title = isFascia ? 'Fascia Mount Detail' : 'Surface Mount Detail';

  return (
    <div className="calc-card p-4 flex flex-col items-center">
      <h3 className="section-label mb-3 self-start">{title}</h3>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        style={{ maxHeight: '600px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
        aria-label={title}
      >
        <defs>
          <marker id="arrowEnd" markerWidth={ARROW_SIZE} markerHeight={ARROW_SIZE} refX={ARROW_SIZE} refY={ARROW_SIZE / 2} orient="auto">
            <path d={`M0,0 L0,${ARROW_SIZE} L${ARROW_SIZE},${ARROW_SIZE / 2} z`} fill="#B69A5A" />
          </marker>
          <marker id="arrowStart" markerWidth={ARROW_SIZE} markerHeight={ARROW_SIZE} refX="0" refY={ARROW_SIZE / 2} orient="auto-start-reverse">
            <path d={`M0,0 L0,${ARROW_SIZE} L${ARROW_SIZE},${ARROW_SIZE / 2} z`} fill="#B69A5A" />
          </marker>
          <marker id="arrowEndBlack" markerWidth={ARROW_SIZE} markerHeight={ARROW_SIZE} refX={ARROW_SIZE} refY={ARROW_SIZE / 2} orient="auto">
            <path d={`M0,0 L0,${ARROW_SIZE} L${ARROW_SIZE},${ARROW_SIZE / 2} z`} fill="#333" />
          </marker>
          <marker id="arrowStartBlack" markerWidth={ARROW_SIZE} markerHeight={ARROW_SIZE} refX="0" refY={ARROW_SIZE / 2} orient="auto-start-reverse">
            <path d={`M0,0 L0,${ARROW_SIZE} L${ARROW_SIZE},${ARROW_SIZE / 2} z`} fill="#333" />
          </marker>
        </defs>

        {/* ── Background ── */}
        <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="#FAFAFA" />

        {/* ── DECK LINE ── */}
        <line x1="10" y1={deckY} x2={SVG_W - 10} y2={deckY} stroke="#555" strokeWidth="2.5" strokeDasharray="none" />
        <text x="12" y={deckY + 11} fontSize="8" fill="#555" fontWeight="700">DECK LEVEL</text>

        {/* ── HATCHING below deck (deck material) ── */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={i}
            x1={postCX - 30 + i * 10}
            y1={deckY}
            x2={postCX - 40 + i * 10}
            y2={deckY + 12}
            stroke="#999"
            strokeWidth="0.8"
          />
        ))}

        {/* ── BASE PLATE ── */}
        {isFascia ? (
          // Fascia base plate (side-mounted)
          <>
            <rect
              x={postCX - bpW / 2}
              y={bpY}
              width={bpW}
              height={bpH + Math.abs(deckY - bpY)}
              fill="#CCC"
              stroke="#333"
              strokeWidth="0.8"
            />
            {/* Fascia board */}
            <rect x={postCX - bpW / 2 - 8} y={bpY - 4} width={8} height={Math.abs(deckY - bpY) + bpH + 8} fill="#D4A96A" stroke="#8B6914" strokeWidth="0.8" />
            <text x={postCX - bpW / 2 - 14} y={deckY + 12} fontSize="6" fill="#555" textAnchor="middle">Fascia</text>
          </>
        ) : (
          // Surface base plate
          <>
            <rect
              x={postCX - bpW / 2}
              y={bpY}
              width={bpW}
              height={bpH}
              fill="#CCC"
              stroke="#333"
              strokeWidth="0.8"
            />
            {/* Gasket below base plate */}
            <rect
              x={postCX - bpW / 2 + 2}
              y={bpY + bpH}
              width={bpW - 4}
              height={2}
              fill="#888"
              stroke="#555"
              strokeWidth="0.5"
            />
            {/* Anchor bolts */}
            <line x1={postCX - 7} y1={bpY + bpH + 2} x2={postCX - 7} y2={bpY + bpH + 14} stroke="#555" strokeWidth="1.2" />
            <line x1={postCX + 7} y1={bpY + bpH + 2} x2={postCX + 7} y2={bpY + bpH + 14} stroke="#555" strokeWidth="1.2" />
            <text x={postCX} y={bpY + bpH + 22} fontSize="7" fill="#555" textAnchor="middle">Base Plate Gasket</text>
            <text x={postCX} y={bpY + bpH + 31} fontSize="7" fill="#555" textAnchor="middle">Deck Fasteners</text>
          </>
        )}

        {/* ── POST ── */}
        <rect
          x={postCX - postW / 2}
          y={topOfPostY}
          width={postW}
          height={bottomOfPostY - topOfPostY}
          fill="#E8E8E8"
          stroke="#222"
          strokeWidth="1.2"
        />
        {/* Post center line */}
        <line
          x1={postCX}
          y1={topOfPostY - 4}
          x2={postCX}
          y2={topOfPostY + 10}
          stroke="#555"
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />

        {/* ── GLASS PANEL ── */}
        {/* Glass sits to the right of the post */}
        <rect
          x={postCX + postW / 2 + glassOffsetFromPost}
          y={topOfGlassY}
          width={glassW}
          height={bottomOfGlassY - topOfGlassY}
          fill="rgba(180,220,255,0.35)"
          stroke="#4A90B8"
          strokeWidth="1"
        />
        {/* Glass top cap / rail */}
        <rect
          x={postCX + postW / 2 + glassOffsetFromPost - 2}
          y={topOfGlassY - 3}
          width={glassW + 4}
          height={3}
          fill="#555"
          stroke="#222"
          strokeWidth="0.5"
        />

        {/* ── SETTING BLOCK (inside post at bottom of glass) ── */}
        <rect
          x={postCX - postW / 2 + 1}
          y={bottomOfGlassY - (settingBlockHeight * scale)}
          width={postW - 2}
          height={settingBlockHeight * scale}
          fill="#F5C842"
          stroke="#B8960A"
          strokeWidth="0.5"
          opacity="0.8"
        />

        {/* ── GLASS REVEAL MARKER (top of post to top of glass) ── */}
        {topGlassReveal > 0 && (
          <line
            x1={postCX - postW / 2 - 2}
            y1={topOfPostY}
            x2={postCX + postW / 2 + glassOffsetFromPost + glassW + 2}
            y2={topOfPostY}
            stroke="#B69A5A"
            strokeWidth="0.6"
            strokeDasharray="3,2"
          />
        )}

        {/* ══════════════════════════════════════════════
            DIMENSION LINES — LEFT SIDE
        ══════════════════════════════════════════════ */}

        {/* 1. Overall Rail Height (top of glass to deck) */}
        <line x1={leftDim1X + 6} y1={topOfGlassY} x2={postCX - postW / 2 - 4} y2={topOfGlassY} stroke="#B69A5A" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1={leftDim1X + 6} y1={deckY} x2={postCX - postW / 2 - 4} y2={deckY} stroke="#B69A5A" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1={leftDim1X} y1={topOfGlassY} x2={leftDim1X} y2={deckY} stroke="#B69A5A" strokeWidth="0.8" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
        <text
          x={leftDim1X - 3}
          y={(topOfGlassY + deckY) / 2}
          fontSize="7"
          fill="#B69A5A"
          textAnchor="middle"
          fontWeight="700"
          transform={`rotate(-90, ${leftDim1X - 3}, ${(topOfGlassY + deckY) / 2})`}
        >
          {fmt(railHeightActual)} Overall Rail Height
        </text>

        {/* 2. Post Height Above Deck */}
        <line x1={leftDim2X + 6} y1={topOfPostY} x2={postCX - postW / 2 - 4} y2={topOfPostY} stroke="#B69A5A" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1={leftDim2X} y1={topOfPostY} x2={leftDim2X} y2={deckY} stroke="#B69A5A" strokeWidth="0.8" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
        <text
          x={leftDim2X - 3}
          y={(topOfPostY + deckY) / 2}
          fontSize="8"
          fill="#B69A5A"
          textAnchor="middle"
          transform={`rotate(-90, ${leftDim2X - 3}, ${(topOfPostY + deckY) / 2})`}
        >
          {fmt(postHeightAboveDeck)}" From Deck to Top of Post
        </text>

        {/* 3. Glass height (bottom of glass to deck) */}
        {bottomGlassGap > 0 && (
          <>
            <line x1={leftDim3X + 6} y1={bottomOfGlassY} x2={postCX - postW / 2 - 4} y2={bottomOfGlassY} stroke="#B69A5A" strokeWidth="0.5" strokeDasharray="2,2" />
            <line x1={leftDim3X} y1={bottomOfGlassY} x2={leftDim3X} y2={deckY} stroke="#B69A5A" strokeWidth="0.8" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
            <text
              x={leftDim3X - 3}
              y={(bottomOfGlassY + deckY) / 2}
              fontSize="8"
              fill="#B69A5A"
              textAnchor="middle"
              transform={`rotate(-90, ${leftDim3X - 3}, ${(bottomOfGlassY + deckY) / 2})`}
            >
              {fmt(bottomGlassGap)}" Bottom Gap
            </text>
          </>
        )}

        {/* ══════════════════════════════════════════════
            DIMENSION LINES — RIGHT SIDE
        ══════════════════════════════════════════════ */}

        {/* R1. Glass height (top to bottom) */}
        <line x1={postCX + postW / 2 + glassOffsetFromPost + glassW + 2} y1={topOfGlassY} x2={rightDim1X - 6} y2={topOfGlassY} stroke="#B69A5A" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1={postCX + postW / 2 + glassOffsetFromPost + glassW + 2} y1={bottomOfGlassY} x2={rightDim1X - 6} y2={bottomOfGlassY} stroke="#B69A5A" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1={rightDim1X} y1={topOfGlassY} x2={rightDim1X} y2={bottomOfGlassY} stroke="#B69A5A" strokeWidth="0.8" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
        <text
          x={rightDim1X + 3}
          y={(topOfGlassY + bottomOfGlassY) / 2}
          fontSize="8"
          fill="#B69A5A"
          textAnchor="middle"
          transform={`rotate(90, ${rightDim1X + 3}, ${(topOfGlassY + bottomOfGlassY) / 2})`}
        >
          {fmt(glassInsertLength)}" Tall Glass
        </text>

        {/* R2. Top glass reveal (top of post to top of glass) */}
        {topGlassReveal > 0 && (
          <>
            <line x1={postCX + postW / 2 + glassOffsetFromPost + glassW + 2} y1={topOfPostY} x2={rightDim2X - 6} y2={topOfPostY} stroke="#B69A5A" strokeWidth="0.5" strokeDasharray="2,2" />
            <line x1={rightDim2X} y1={topOfGlassY} x2={rightDim2X} y2={topOfPostY} stroke="#B69A5A" strokeWidth="0.8" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
            <text
              x={rightDim2X + 3}
              y={(topOfGlassY + topOfPostY) / 2}
              fontSize="8"
              fill="#B69A5A"
              textAnchor="middle"
              transform={`rotate(90, ${rightDim2X + 3}, ${(topOfGlassY + topOfPostY) / 2})`}
            >
              {fmt(topGlassReveal)}" Glass Reveal
            </text>
          </>
        )}

        {/* R3. From deck to bottom of glass */}
        <line x1={postCX + postW / 2 + glassOffsetFromPost + glassW + 2} y1={deckY} x2={rightDim3X - 6} y2={deckY} stroke="#B69A5A" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1={rightDim3X} y1={bottomOfGlassY} x2={rightDim3X} y2={deckY} stroke="#B69A5A" strokeWidth="0.8" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
        <text
          x={rightDim3X + 3}
          y={(bottomOfGlassY + deckY) / 2}
          fontSize="8"
          fill="#B69A5A"
          textAnchor="middle"
          transform={`rotate(90, ${rightDim3X + 3}, ${(bottomOfGlassY + deckY) / 2})`}
        >
          {fmt(bottomGlassGap)}" Deck to Bottom of Glass
        </text>

        {/* R4. Post label */}
        <text
          x={rightDim4X}
          y={(topOfPostY + deckY) / 2}
          fontSize="8"
          fill="#333"
          textAnchor="middle"
          fontWeight="600"
          transform={`rotate(90, ${rightDim4X}, ${(topOfPostY + deckY) / 2})`}
        >
          {fmt(postHeightAboveDeck)}" {isFascia ? 'Fascia' : 'Infinity'} Post
        </text>

        {/* ── LABELS ── */}
        {/* Post top label */}
        <text x={postCX + postW / 2 + 3} y={topOfPostY - 2} fontSize="7.5" fill="#333" fontWeight="600">
          Top of Post
        </text>

        {/* Setting block label */}
        {settingBlockHeight > 0 && (
          <text x={postCX + postW / 2 + 3} y={bottomOfGlassY - (settingBlockHeight * scale) / 2 + 2} fontSize="7" fill="#8B6914">
            Setting Block
          </text>
        )}

        {/* Fascia: base plate label */}
        {isFascia && (
          <text x={postCX - bpW / 2 - 2} y={bpY + bpH / 2 + 2} fontSize="7" fill="#555" textAnchor="end">
            Base Plate
          </text>
        )}

        {/* Short post indicator */}
        {isShortPost && (
          <text x={postCX} y={topOfPostY - 8} fontSize="7.5" fill="#B69A5A" textAnchor="middle" fontWeight="700">
            SHORT POST CONFIG
          </text>
        )}

        {/* ── TITLE ── */}
        <text x={SVG_W / 2} y={SVG_H - 8} fontSize="9" fill="#333" textAnchor="middle" fontWeight="700" letterSpacing="0.08em">
          {title.toUpperCase()}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 text-[10px]" style={{ color: '#6B6B6B' }}>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: 'rgba(180,220,255,0.5)', border: '1px solid #4A90B8' }} />
          Glass
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: '#E8E8E8', border: '1px solid #222' }} />
          Post
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: '#F5C842', border: '1px solid #B8960A' }} />
          Setting Block
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: '#CCC', border: '1px solid #333' }} />
          Base Plate
        </span>
      </div>
    </div>
  );
}
