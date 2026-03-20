/**
 * PostDiagram — Simple scaled illustration of post, glass, and deck relationship.
 * No dimension callouts — just a clean visual showing proportional heights.
 *
 * Design: minimal engineering sketch style, gold/black/grey palette.
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
  fasciaOffset?: number;          // fascia only
  distTopBasePlateToDeck?: number;// fascia only
  isShortPost?: boolean;
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

  // ── SVG canvas ─────────────────────────────────────────────────────────────
  const W = 160;
  const H = 320;
  const MT = 20; // margin top
  const MB = 50; // margin bottom (below deck for base plate / fascia board)

  // Scale: fit rail height into the drawable area
  const drawH = H - MT - MB;
  const scale = drawH / railHeightActual; // px per inch

  // Key Y coords
  const deckY = MT + railHeightActual * scale;
  const topGlassY = MT; // glass top = rail height top
  const topPostY = deckY - postHeightAboveDeck * scale;
  const bottomGlassY = deckY - bottomGlassGap * scale;

  // Horizontal layout — post left, glass right
  const postX = 52;
  const postW = 14;
  const glassX = postX + postW + 4;
  const glassW = 7;

  // Base plate / fascia board below deck
  const bpH = 5;
  const bpW = isFascia ? 14 : 22;

  // Fascia board
  const fasciaH = isFascia
    ? (physicalPostLength ? (physicalPostLength - postHeightAboveDeck) * scale : 40)
    : 0;
  const fasciaW = 12;
  const fasciaX = postX - fasciaW - 2;

  // Setting block inside post (yellow band near bottom of glass)
  const sbH = Math.max(2, settingBlockHeight * scale);
  const sbY = bottomGlassY - sbH;

  const title = isFascia ? 'FASCIA MOUNT' : 'SURFACE MOUNT';

  return (
    <div className="calc-card p-4 flex flex-col items-center">
      <h3 className="section-label mb-3 self-start">{title}</h3>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxHeight: '360px' }}
        aria-label={title}
      >
        {/* Background */}
        <rect x="0" y="0" width={W} height={H} fill="#F8F7F5" />

        {/* ── DECK LINE ── */}
        <rect x="8" y={deckY} width={W - 16} height="3" fill="#555" rx="1" />

        {/* Deck hatching */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={i}
            x1={12 + i * 14}
            y1={deckY + 3}
            x2={6 + i * 14}
            y2={deckY + 14}
            stroke="#999"
            strokeWidth="1"
          />
        ))}

        {/* ── SURFACE MOUNT: Base plate + anchor bolts ── */}
        {!isFascia && (
          <>
            {/* Base plate */}
            <rect
              x={postX - (bpW - postW) / 2}
              y={deckY}
              width={bpW}
              height={bpH}
              fill="#CCCCCC"
              stroke="#555"
              strokeWidth="1"
              rx="1"
            />
            {/* Gasket strip */}
            <rect
              x={postX - (bpW - postW) / 2 + 3}
              y={deckY + bpH}
              width={bpW - 6}
              height={2.5}
              fill="#888"
              rx="0.5"
            />
            {/* Anchor bolts */}
            <line
              x1={postX - (bpW - postW) / 2 + 4}
              y1={deckY + bpH + 2.5}
              x2={postX - (bpW - postW) / 2 + 4}
              y2={deckY + bpH + 16}
              stroke="#666"
              strokeWidth="2"
            />
            <line
              x1={postX + (bpW + postW) / 2 - 4}
              y1={deckY + bpH + 2.5}
              x2={postX + (bpW + postW) / 2 - 4}
              y2={deckY + bpH + 16}
              stroke="#666"
              strokeWidth="2"
            />
            {/* Bolt heads */}
            <rect
              x={postX - (bpW - postW) / 2 + 2}
              y={deckY + bpH + 16}
              width={4}
              height={3}
              fill="#555"
              rx="0.5"
            />
            <rect
              x={postX + (bpW + postW) / 2 - 6}
              y={deckY + bpH + 16}
              width={4}
              height={3}
              fill="#555"
              rx="0.5"
            />
          </>
        )}

        {/* ── FASCIA MOUNT: Fascia board + base plate on side ── */}
        {isFascia && (
          <>
            {/* Fascia board (wood grain texture via lines) */}
            <rect
              x={fasciaX}
              y={deckY - distTopBasePlateToDeck * scale}
              width={fasciaW}
              height={fasciaH + distTopBasePlateToDeck * scale + 10}
              fill="#D4A96A"
              stroke="#8B6914"
              strokeWidth="1"
              rx="1"
            />
            {/* Wood grain lines */}
            {Array.from({ length: 4 }).map((_, i) => (
              <line
                key={i}
                x1={fasciaX + 2}
                y1={deckY - distTopBasePlateToDeck * scale + 8 + i * 10}
                x2={fasciaX + fasciaW - 2}
                y2={deckY - distTopBasePlateToDeck * scale + 8 + i * 10}
                stroke="#C49050"
                strokeWidth="0.5"
              />
            ))}
            {/* Fascia base plate */}
            <rect
              x={fasciaX + fasciaW}
              y={deckY - distTopBasePlateToDeck * scale - 2}
              width={bpW}
              height={bpH + 4}
              fill="#CCCCCC"
              stroke="#555"
              strokeWidth="1"
              rx="1"
            />
          </>
        )}

        {/* ── POST ── */}
        {/* Post shadow for depth */}
        <rect
          x={postX + 2}
          y={topPostY + 2}
          width={postW}
          height={deckY - topPostY}
          fill="rgba(0,0,0,0.08)"
          rx="1"
        />
        {/* Post body */}
        <rect
          x={postX}
          y={topPostY}
          width={postW}
          height={deckY - topPostY}
          fill="#E0E0E0"
          stroke="#333"
          strokeWidth="1.5"
          rx="1"
        />
        {/* Post highlight (left edge) */}
        <rect
          x={postX + 1.5}
          y={topPostY + 2}
          width={2}
          height={deckY - topPostY - 4}
          fill="rgba(255,255,255,0.5)"
          rx="0.5"
        />
        {/* Post top cap */}
        <rect
          x={postX - 1}
          y={topPostY - 3}
          width={postW + 2}
          height={4}
          fill="#444"
          stroke="#222"
          strokeWidth="1"
          rx="1"
        />

        {/* ── SETTING BLOCK (gold band inside post near glass bottom) ── */}
        {settingBlockHeight > 0 && (
          <rect
            x={postX + 1}
            y={sbY}
            width={postW - 2}
            height={sbH}
            fill="#F5C842"
            stroke="#B8960A"
            strokeWidth="0.5"
            opacity="0.9"
          />
        )}

        {/* ── GLASS PANEL ── */}
        {/* Glass shadow */}
        <rect
          x={glassX + 2}
          y={topGlassY + 2}
          width={glassW}
          height={bottomGlassY - topGlassY}
          fill="rgba(0,0,0,0.06)"
          rx="1"
        />
        {/* Glass body */}
        <rect
          x={glassX}
          y={topGlassY}
          width={glassW}
          height={bottomGlassY - topGlassY}
          fill="rgba(180,220,255,0.30)"
          stroke="#4A90B8"
          strokeWidth="1.2"
          rx="0.5"
        />
        {/* Glass inner highlight */}
        <rect
          x={glassX + 1.5}
          y={topGlassY + 3}
          width={2}
          height={(bottomGlassY - topGlassY) * 0.6}
          fill="rgba(255,255,255,0.4)"
          rx="0.5"
        />
        {/* Glass top rail cap */}
        <rect
          x={glassX - 2}
          y={topGlassY - 4}
          width={glassW + 4}
          height={5}
          fill="#444"
          stroke="#222"
          strokeWidth="0.8"
          rx="1"
        />

        {/* ── GLASS REVEAL INDICATOR (dashed line at top of post) ── */}
        {topGlassReveal > 0.05 && (
          <line
            x1={postX - 4}
            y1={topPostY}
            x2={glassX + glassW + 4}
            y2={topPostY}
            stroke="#B69A5A"
            strokeWidth="1"
            strokeDasharray="3,2"
          />
        )}

        {/* ── SHORT POST INDICATOR ── */}
        {isShortPost && (
          <rect
            x={postX - 2}
            y={topPostY - 10}
            width={postW + 4}
            height={8}
            fill="#B69A5A"
            rx="2"
            opacity="0.9"
          />
        )}

        {/* ── TITLE ── */}
        <text
          x={W / 2}
          y={H - 6}
          fontSize="8.5"
          fill="#444"
          textAnchor="middle"
          fontWeight="700"
          fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
          letterSpacing="0.06em"
        >
          {title}
        </text>

        {/* Short post label */}
        {isShortPost && (
          <text
            x={W / 2}
            y={H - 16}
            fontSize="7"
            fill="#B69A5A"
            textAnchor="middle"
            fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
            fontWeight="600"
          >
            SHORT POST CONFIG
          </text>
        )}
      </svg>
    </div>
  );
}
