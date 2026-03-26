/**
 * PostDiagram — Displays the correct CAD drawing based on current configuration.
 *
 * Selection logic:
 *   Mount: surface | fascia
 *   Rail:  36 | 42
 *   Post:  tall-40 (post >= 38") | tall-34 (post < 38") | short (isShortPost)
 *
 * All images hosted on CDN.
 */

import React from 'react';

interface PostDiagramProps {
  mountType: 'surface' | 'fascia';
  railHeight: number;              // nominal: 36 or 42
  postHeightAboveDeck: number;     // inches
  isShortPost?: boolean;
}

// ── CDN image map ─────────────────────────────────────────────────────────────
const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663093943154/Vxc6ufyoD2HuhTpJtdEazX';

const IMAGES: Record<string, string> = {
  'fascia-42-tall-40': `${CDN}/cad-fascia-42-40_02d85b57.png`,
  'fascia-42-tall-34': `${CDN}/cad-fascia-42-34_78905730.png`,
  'fascia-42-short':   `${CDN}/cad-fascia-42-short_55aca834.png`,
  'fascia-36-tall-34': `${CDN}/cad-fascia-36-34_e689e276.png`,
  'fascia-36-short':   `${CDN}/cad-fascia-36-short_2170a2fc.png`,
  'surface-42-tall-40':`${CDN}/cad-surface-42-40_2772c61d.png`,
  'surface-42-tall-34':`${CDN}/cad-surface-42-34_9a1af8bb.png`,
  'surface-42-short':  `${CDN}/cad-surface-42-short_7a60c83d.png`,
  'surface-36-tall-34':`${CDN}/cad-surface-36-34_17124c48.png`,
  'surface-36-short':  `${CDN}/cad-surface-36-short_baf39e92.png`,
};

function getImageKey(
  mountType: 'surface' | 'fascia',
  railHeight: number,
  postHeightAboveDeck: number,
  isShortPost: boolean,
): string {
  const mount = mountType;
  const rail = railHeight >= 40 ? '42' : '36';

  if (isShortPost) {
    return `${mount}-${rail}-short`;
  }

  // Tall post: >=38" above deck -> "40" drawing, <38" -> "34" drawing
  if (rail === '42') {
    const variant = postHeightAboveDeck >= 38 ? 'tall-40' : 'tall-34';
    return `${mount}-42-${variant}`;
  } else {
    // 36" rail only has one tall-post drawing (34" above deck)
    return `${mount}-36-tall-34`;
  }
}

function getCaption(
  mountType: 'surface' | 'fascia',
  railHeight: number,
  postHeightAboveDeck: number,
  isShortPost: boolean,
): string {
  const mount = mountType === 'surface' ? 'Surface Mount' : 'Fascia Mount';
  const rail = railHeight >= 40 ? '42 1/8"' : '36 1/8"';
  if (isShortPost) return `${mount} \u00b7 ${rail} Rail \u00b7 Short Post`;
  return `${mount} \u00b7 ${rail} Rail \u00b7 Post finishes ${Math.round(postHeightAboveDeck)}" above deck`;
}

export default function PostDiagram({
  mountType,
  railHeight,
  postHeightAboveDeck,
  isShortPost = false,
}: PostDiagramProps) {
  const key = getImageKey(mountType, railHeight, postHeightAboveDeck, isShortPost);
  const src = IMAGES[key];
  const caption = getCaption(mountType, railHeight, postHeightAboveDeck, isShortPost);

  return (
    <div className="calc-card p-4 flex flex-col items-center">
      <h3 className="section-label mb-3 self-start">CONFIGURATION DETAIL</h3>
      <div
        className="w-full flex items-center justify-center"
        style={{
          background: '#FFFFFF',
          borderRadius: '6px',
          border: '1px solid #E8E4DC',
          minHeight: '260px',
          padding: '12px 8px',
        }}
      >
        {src ? (
          <img
            src={src}
            alt={caption}
            style={{
              maxHeight: '340px',
              maxWidth: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        ) : (
          <div style={{ color: '#999', fontSize: '13px', textAlign: 'center' }}>
            No drawing available for this configuration.
          </div>
        )}
      </div>
      <p
        className="mt-2 text-center"
        style={{
          fontSize: '10px',
          color: '#888',
          letterSpacing: '0.05em',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          textTransform: 'uppercase',
        }}
      >
        {caption}
      </p>
    </div>
  );
}
