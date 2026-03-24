/**
 * PostDiagram — Parametric 2D SVG render engine
 *
 * Draws the post, hardware, deck, and glass in real-time based on
 * the current calculator configuration.
 *
 * Design language (from CAD drawings):
 *   - Post body + all hardware: grey silhouette (#6B7280 fill, #374151 stroke)
 *   - Glass panel: faded cyan (rgba(103,232,249,0.35) fill, #06B6D4 stroke)
 *   - Glass above post top: dashed cyan stroke (no fill)
 *   - Deck line: dark brown/grey solid line
 *   - Fascia board: medium grey rectangle on right
 *   - Base plate (surface): wide flat rectangle
 *   - Base plate (fascia): L-bracket shape on fascia face
 *   - Setting block: lighter grey rectangle between base plate and post
 *   - Post cap: small rectangle on top of post
 *
 * Coordinate system:
 *   SVG viewBox: 0 0 200 480
 *   Deck line sits at a fixed Y position; everything is scaled from there.
 *   1 inch = SCALE pixels
 */

import React from 'react';

interface PostDiagramProps {
  mountType: 'surface' | 'fascia';
  railHeight: number;           // nominal: 36 or 42
  postHeightAboveDeck: number;  // inches above deck
  isShortPost?: boolean;
  topGlassReveal: number;       // inches above post top
  bottomGlassGap: number;       // inches from deck to bottom of glass
}

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  postFill:       '#9CA3AF',   // grey silhouette
  postStroke:     '#374151',
  postInner:      '#D1D5DB',   // inner channel lines
  hardwareFill:   '#6B7280',   // base plate, setting block, cap
  hardwareStroke: '#374151',
  fasciaBoardFill:'#9CA3AF',
  fasciaBoardStroke:'#374151',
  glassFill:      'rgba(103,232,249,0.30)',
  glassStroke:    '#0891B2',
  glassDash:      '#0891B2',
  deckFill:       '#6B7280',
  deckStroke:     '#374151',
  settingBlock:   '#B0B8C4',
  settingBlockStroke: '#374151',
};

// ── Layout constants (SVG units) ──────────────────────────────────────────────
const VW = 200;   // viewBox width
const VH = 500;   // viewBox height
const SCALE = 6.5; // pixels per inch — tuned so 42" post fits comfortably

// Horizontal layout — surface
const SFC_POST_X = 78;        // left edge of post body
const SFC_POST_W = 22;        // post body width
const SFC_GLASS_X = 87;       // left edge of glass (inside post channel)
const SFC_GLASS_W = 10;       // glass width (13mm ≈ 0.5")
const SFC_BASEPLATE_W = 42;   // base plate width
const SFC_BASEPLATE_H = 4;    // base plate height
const SFC_BASEPLATE_X = SFC_POST_X - (SFC_BASEPLATE_W - SFC_POST_W) / 2;
const SFC_CAP_W = 14;         // post cap width
const SFC_CAP_H = 3;
const SFC_CAP_X = SFC_POST_X + (SFC_POST_W - SFC_CAP_W) / 2;

// Horizontal layout — fascia
const FSC_FASCIA_X = 148;     // left edge of fascia board
const FSC_FASCIA_W = 18;      // fascia board width
const FSC_POST_X = 100;       // left edge of post body
const FSC_POST_W = 22;        // post body width
const FSC_GLASS_X = 109;      // glass left edge (inside post)
const FSC_GLASS_W = 10;
const FSC_BPLATE_W = 20;      // base plate horizontal extent (from fascia face)
const FSC_BPLATE_H = 5;       // base plate height
const FSC_CAP_W = 14;
const FSC_CAP_H = 3;
const FSC_CAP_X = FSC_POST_X + (FSC_POST_W - FSC_CAP_W) / 2;

// Deck line Y position (from bottom of SVG)
const DECK_Y_FROM_BOTTOM = 60; // pixels from bottom of viewBox
const DECK_Y = VH - DECK_Y_FROM_BOTTOM;

// ── Helper: clamp ─────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ── Surface Mount SVG ─────────────────────────────────────────────────────────
function SurfaceMountDiagram({
  postHeightAboveDeck,
  topGlassReveal,
  bottomGlassGap,
  railHeight,
}: {
  postHeightAboveDeck: number;
  topGlassReveal: number;
  bottomGlassGap: number;
  railHeight: number;
}) {
  // Derived pixel positions (Y increases downward)
  const postTopY    = DECK_Y - postHeightAboveDeck * SCALE;
  const postBotY    = DECK_Y;                              // post sits on setting block / base plate at deck level
  const postH       = postHeightAboveDeck * SCALE;

  // Setting block sits between base plate top and post bottom
  // For surface mount: setting block height ≈ 0.5" (simplified visual)
  const sbH         = 3;  // visual pixels for setting block
  const sbY         = postBotY - sbH;

  // Base plate sits at deck level
  const bpY         = DECK_Y;
  const bpH         = SFC_BASEPLATE_H;

  // Post cap on top
  const capY        = postTopY - SFC_CAP_H;

  // Glass: from (bottomGlassGap above deck) to (railHeight above deck)
  const glassBot    = DECK_Y - bottomGlassGap * SCALE;
  const glassTop    = DECK_Y - railHeight * SCALE;         // top of glass = rail height
  const glassH      = glassBot - glassTop;

  // Glass above post top (reveal section) — dashed
  const revealH     = topGlassReveal * SCALE;
  const revealTop   = postTopY - revealH;

  // Deck line
  const deckLineY   = DECK_Y;

  // Deck surface rectangle (visual ground)
  const deckSurfH   = 8;

  // Inner channel lines (decorative detail from CAD)
  const ch1X = SFC_POST_X + 4;
  const ch2X = SFC_POST_X + SFC_POST_W - 4;

  return (
    <>
      {/* ── Deck surface ── */}
      <rect
        x={SFC_BASEPLATE_X - 10}
        y={deckLineY}
        width={SFC_BASEPLATE_W + 20}
        height={deckSurfH}
        fill={C.deckFill}
        stroke={C.deckStroke}
        strokeWidth={0.5}
      />
      {/* Deck line */}
      <line
        x1={10} y1={deckLineY}
        x2={VW - 10} y2={deckLineY}
        stroke={C.deckStroke}
        strokeWidth={1.2}
      />

      {/* ── Base plate ── */}
      <rect
        x={SFC_BASEPLATE_X}
        y={bpY - bpH}
        width={SFC_BASEPLATE_W}
        height={bpH}
        fill={C.hardwareFill}
        stroke={C.hardwareStroke}
        strokeWidth={0.8}
        rx={0.5}
      />
      {/* Base plate anchor bolts (two small lines) */}
      <line x1={SFC_BASEPLATE_X + 8} y1={bpY} x2={SFC_BASEPLATE_X + 8} y2={bpY + 5}
        stroke={C.hardwareStroke} strokeWidth={1} />
      <line x1={SFC_BASEPLATE_X + SFC_BASEPLATE_W - 8} y1={bpY} x2={SFC_BASEPLATE_X + SFC_BASEPLATE_W - 8} y2={bpY + 5}
        stroke={C.hardwareStroke} strokeWidth={1} />

      {/* ── Setting block ── */}
      <rect
        x={SFC_POST_X + 2}
        y={sbY}
        width={SFC_POST_W - 4}
        height={sbH}
        fill={C.settingBlock}
        stroke={C.settingBlockStroke}
        strokeWidth={0.5}
      />

      {/* ── Post body ── */}
      <rect
        x={SFC_POST_X}
        y={postTopY}
        width={SFC_POST_W}
        height={postH}
        fill={C.postFill}
        stroke={C.postStroke}
        strokeWidth={1}
      />
      {/* Inner channel detail lines */}
      <line x1={ch1X} y1={postTopY + 4} x2={ch1X} y2={postBotY - 4}
        stroke={C.postStroke} strokeWidth={0.5} strokeDasharray="4,3" />
      <line x1={ch2X} y1={postTopY + 4} x2={ch2X} y2={postBotY - 4}
        stroke={C.postStroke} strokeWidth={0.5} strokeDasharray="4,3" />

      {/* ── Glass panel (solid, inside post) ── */}
      {glassH > 0 && (
        <rect
          x={SFC_GLASS_X}
          y={glassTop > postTopY ? glassTop : postTopY}
          width={SFC_GLASS_W}
          height={glassH - Math.max(0, postTopY - glassTop)}
          fill={C.glassFill}
          stroke={C.glassStroke}
          strokeWidth={0.8}
        />
      )}

      {/* ── Glass reveal above post top (dashed) ── */}
      {revealH > 1 && (
        <rect
          x={SFC_GLASS_X}
          y={revealTop}
          width={SFC_GLASS_W}
          height={revealH}
          fill={C.glassFill}
          stroke={C.glassDash}
          strokeWidth={0.8}
          strokeDasharray="4,3"
        />
      )}

      {/* ── Post cap ── */}
      <rect
        x={SFC_CAP_X}
        y={capY}
        width={SFC_CAP_W}
        height={SFC_CAP_H}
        fill={C.hardwareFill}
        stroke={C.hardwareStroke}
        strokeWidth={0.8}
        rx={0.5}
      />
      {/* Cap top nub */}
      <rect
        x={SFC_CAP_X + SFC_CAP_W / 2 - 2}
        y={capY - 4}
        width={4}
        height={4}
        fill={C.hardwareFill}
        stroke={C.hardwareStroke}
        strokeWidth={0.6}
      />

      {/* ── Tapered glass edge detail (from CAD — diagonal line on left) ── */}
      <line
        x1={SFC_POST_X - 2}
        y1={postTopY + 6}
        x2={SFC_POST_X + 3}
        y2={postBotY - 10}
        stroke={C.postStroke}
        strokeWidth={0.6}
        opacity={0.5}
      />
    </>
  );
}

// ── Fascia Mount SVG ──────────────────────────────────────────────────────────
function FasciaMountDiagram({
  postHeightAboveDeck,
  topGlassReveal,
  bottomGlassGap,
  railHeight,
}: {
  postHeightAboveDeck: number;
  topGlassReveal: number;
  bottomGlassGap: number;
  railHeight: number;
}) {
  const postTopY  = DECK_Y - postHeightAboveDeck * SCALE;
  const postH     = postHeightAboveDeck * SCALE;
  const postBotY  = DECK_Y;

  // Fascia board: extends from below deck up to deck level (and a bit above)
  const fasciaTop = postTopY - 10;  // fascia board taller than post
  const fasciaH   = VH - fasciaTop - DECK_Y_FROM_BOTTOM + 20;

  // Base plate: horizontal bracket at bottom of post, attached to fascia face
  const bpY       = postBotY - FSC_BPLATE_H / 2;
  const bpX       = FSC_FASCIA_X - FSC_BPLATE_W;

  // Setting block (small, between base plate and post bottom)
  const sbH       = 3;
  const sbY       = postBotY - sbH;

  // Post cap
  const capY      = postTopY - FSC_CAP_H;

  // Glass
  const glassBot  = DECK_Y - bottomGlassGap * SCALE;
  const glassTop  = DECK_Y - railHeight * SCALE;
  const glassH    = glassBot - glassTop;
  const revealH   = topGlassReveal * SCALE;
  const revealTop = postTopY - revealH;

  // Inner channel lines
  const ch1X = FSC_POST_X + 4;
  const ch2X = FSC_POST_X + FSC_POST_W - 4;

  // Deck line
  const deckLineY = DECK_Y;

  return (
    <>
      {/* ── Fascia board ── */}
      <rect
        x={FSC_FASCIA_X}
        y={fasciaTop}
        width={FSC_FASCIA_W}
        height={fasciaH}
        fill={C.fasciaBoardFill}
        stroke={C.fasciaBoardStroke}
        strokeWidth={1}
      />
      {/* Deck line */}
      <line
        x1={10} y1={deckLineY}
        x2={FSC_FASCIA_X} y2={deckLineY}
        stroke={C.deckStroke}
        strokeWidth={1.2}
      />

      {/* ── Base plate L-bracket ── */}
      {/* Horizontal arm */}
      <rect
        x={bpX}
        y={bpY}
        width={FSC_BPLATE_W}
        height={FSC_BPLATE_H}
        fill={C.hardwareFill}
        stroke={C.hardwareStroke}
        strokeWidth={0.8}
        rx={0.5}
      />
      {/* Vertical back plate on fascia */}
      <rect
        x={FSC_FASCIA_X - 3}
        y={bpY - 5}
        width={3}
        height={FSC_BPLATE_H + 10}
        fill={C.hardwareFill}
        stroke={C.hardwareStroke}
        strokeWidth={0.6}
      />

      {/* ── Setting block ── */}
      <rect
        x={FSC_POST_X + 2}
        y={sbY}
        width={FSC_POST_W - 4}
        height={sbH}
        fill={C.settingBlock}
        stroke={C.settingBlockStroke}
        strokeWidth={0.5}
      />

      {/* ── Post body ── */}
      <rect
        x={FSC_POST_X}
        y={postTopY}
        width={FSC_POST_W}
        height={postH}
        fill={C.postFill}
        stroke={C.postStroke}
        strokeWidth={1}
      />
      {/* Inner channel detail lines */}
      <line x1={ch1X} y1={postTopY + 4} x2={ch1X} y2={postBotY - 4}
        stroke={C.postStroke} strokeWidth={0.5} strokeDasharray="4,3" />
      <line x1={ch2X} y1={postTopY + 4} x2={ch2X} y2={postBotY - 4}
        stroke={C.postStroke} strokeWidth={0.5} strokeDasharray="4,3" />

      {/* ── Glass panel (solid, inside post) ── */}
      {glassH > 0 && (
        <rect
          x={FSC_GLASS_X}
          y={glassTop > postTopY ? glassTop : postTopY}
          width={FSC_GLASS_W}
          height={glassH - Math.max(0, postTopY - glassTop)}
          fill={C.glassFill}
          stroke={C.glassStroke}
          strokeWidth={0.8}
        />
      )}

      {/* ── Glass reveal above post top (dashed) ── */}
      {revealH > 1 && (
        <rect
          x={FSC_GLASS_X}
          y={revealTop}
          width={FSC_GLASS_W}
          height={revealH}
          fill={C.glassFill}
          stroke={C.glassDash}
          strokeWidth={0.8}
          strokeDasharray="4,3"
        />
      )}

      {/* ── Post cap ── */}
      <rect
        x={FSC_CAP_X}
        y={capY}
        width={FSC_CAP_W}
        height={FSC_CAP_H}
        fill={C.hardwareFill}
        stroke={C.hardwareStroke}
        strokeWidth={0.8}
        rx={0.5}
      />
      {/* Cap top nub */}
      <rect
        x={FSC_CAP_X + FSC_CAP_W / 2 - 2}
        y={capY - 4}
        width={4}
        height={4}
        fill={C.hardwareFill}
        stroke={C.hardwareStroke}
        strokeWidth={0.6}
      />

      {/* ── Tapered glass edge detail (diagonal line on left, from CAD) ── */}
      <line
        x1={FSC_POST_X - 2}
        y1={postTopY + 6}
        x2={FSC_POST_X + 3}
        y2={postBotY - 10}
        stroke={C.postStroke}
        strokeWidth={0.6}
        opacity={0.5}
      />
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PostDiagram({
  mountType,
  railHeight,
  postHeightAboveDeck,
  isShortPost = false,
  topGlassReveal,
  bottomGlassGap,
}: PostDiagramProps) {
  // Clamp values to safe ranges for rendering
  const safePost   = clamp(postHeightAboveDeck, 24, 50);
  const safeReveal = clamp(topGlassReveal, 0, 20);
  const safeGap    = clamp(bottomGlassGap, 0, 6);
  const safeRail   = railHeight >= 40 ? 42.125 : 36.125;

  const mountLabel = mountType === 'surface' ? 'Surface Mount' : 'Fascia Mount';
  const railLabel  = railHeight >= 40 ? '42"' : '36"';
  const postLabel  = isShortPost
    ? 'Short Post'
    : `${Math.round(safePost)}" Above Deck`;

  return (
    <div className="calc-card p-4 flex flex-col items-center">
      <h3 className="section-label mb-3 self-start">CONFIGURATION DETAIL</h3>
      <div
        style={{
          background: '#FAFAFA',
          borderRadius: '6px',
          border: '1px solid #E8E4DC',
          width: '100%',
          padding: '8px 4px',
        }}
      >
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          width="100%"
          style={{ display: 'block', maxHeight: '380px' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {mountType === 'surface' ? (
            <SurfaceMountDiagram
              postHeightAboveDeck={safePost}
              topGlassReveal={safeReveal}
              bottomGlassGap={safeGap}
              railHeight={safeRail}
            />
          ) : (
            <FasciaMountDiagram
              postHeightAboveDeck={safePost}
              topGlassReveal={safeReveal}
              bottomGlassGap={safeGap}
              railHeight={safeRail}
            />
          )}
        </svg>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginTop: '8px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: 12, height: 12, background: C.postFill, border: `1px solid ${C.postStroke}`, borderRadius: 2 }} />
          <span style={{ fontSize: '9px', color: '#6B6B6B', fontFamily: 'Helvetica, Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Post & Hardware</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: 12, height: 12, background: C.glassFill, border: `1px solid ${C.glassStroke}`, borderRadius: 2 }} />
          <span style={{ fontSize: '9px', color: '#6B6B6B', fontFamily: 'Helvetica, Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Glass</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: 12, height: 12, background: C.deckFill, border: `1px solid ${C.deckStroke}`, borderRadius: 2 }} />
          <span style={{ fontSize: '9px', color: '#6B6B6B', fontFamily: 'Helvetica, Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deck</span>
        </div>
      </div>

      {/* Caption */}
      <p
        className="mt-1 text-center"
        style={{
          fontSize: '10px',
          color: '#888',
          letterSpacing: '0.05em',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          textTransform: 'uppercase',
        }}
      >
        {mountLabel} · {railLabel} Rail · {postLabel}
      </p>
    </div>
  );
}
