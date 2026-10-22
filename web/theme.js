/*! AimTheme — satu tema untuk semua overlay (warna, huruf, bentuk, animasi) */
(function (root) {
'use strict';
const FONTS = {
  ui: '"Bahnschrift","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif',
  mono: '"Cascadia Mono",Consolas,ui-monospace,monospace',
  rounded: '"Arial Rounded MT Bold","Nunito","Segoe UI",system-ui,sans-serif',
  impact: 'Impact,"Haettenschweiler","Arial Narrow Bold",sans-serif',
  serif: 'Georgia,"Times New Roman",serif'
};
const EASES = { smooth: 'cubic-bezier(.22,.61,.36,1)', spring: 'cubic-bezier(.34,1.56,.64,1)', inout: 'cubic-bezier(.65,0,.35,1)', linear: 'linear' };

const DEFAULT = {
  accent: '#38bdf8', accent2: '#0ea5e9', text: '#e0f2fe', muted: '#8aa0b8',
  panel: '#0f1b2e', panelOpacity: 0.78, border: '#263243', onAccent: '#04202e',
  glow: '#38bdf8', glowSize: 16, font: 'ui', radius: 10,
  animIn: 'slide-up', animOut: 'fade', animMs: 320, ease: 'smooth'
};

const PRESETS = {
  'Neon Biru': {},
  'Api': { accent: '#fb923c', accent2: '#ef4444', text: '#fff7ed', muted: '#c9a58e', panel: '#1a0f0a', border: '#4a2a1a', onAccent: '#2b0f00', glow: '#f97316' },
  'Matrix': { accent: '#4ade80', accent2: '#16a34a', text: '#f0fdf4', muted: '#4ade80', panel: '#04130a', border: '#14532d', onAccent: '#022c14', glow: '#22c55e', font: 'mono', radius: 4 },
  'Ungu Plasma': { accent: '#c084fc', accent2: '#7c3aed', text: '#faf5ff', muted: '#a78bda', panel: '#150b24', border: '#3b1d6b', onAccent: '#1e0a3c', glow: '#a855f7', radius: 14 },
  'Merah Gaming': { accent: '#ff2d55', accent2: '#be123c', text: '#fff1f3', muted: '#c98a98', panel: '#1a0b10', border: '#5b1a2a', onAccent: '#ffffff', glow: '#ff2d55', font: 'impact', radius: 6, glowSize: 20 },
  'Putih Bersih': { accent: '#ffffff', accent2: '#cbd5e1', text: '#ffffff', muted: '#cbd5e1', panel: '#111111', panelOpacity: 0.6, border: '#3a3a3a', onAccent: '#111111', glow: '#ffffff', glowSize: 8, radius: 8 },
  'Pastel': { accent: '#f472b6', accent2: '#a78bfa', text: '#831843', muted: '#9d174d', panel: '#fdf2f8', panelOpacity: 0.92, border: '#fbcfe8', onAccent: '#ffffff', glow: '#f472b6', font: 'rounded', radius: 16, glowSize: 6 }
};

const SCHEMA = [
  { g: 'Warna', items: [
    { k: 'accent', l: 'Warna utama (aksen)', t: 'color' },
    { k: 'accent2', l: 'Warna kedua (ekor, gradasi)', t: 'color' },
    { k: 'text', l: 'Teks terang', t: 'color' },
    { k: 'muted', l: 'Teks redup', t: 'color' },
    { k: 'panel', l: 'Latar kartu / tombol', t: 'color' },
    { k: 'panelOpacity', l: 'Opasitas latar', t: 'range', min: 0, max: 1, step: 0.01, p: 1 },
    { k: 'border', l: 'Garis tepi', t: 'color' },
    { k: 'onAccent', l: 'Teks di atas warna utama', t: 'color' },
    { k: 'glow', l: 'Warna glow', t: 'color' },
    { k: 'glowSize', l: 'Besar glow', t: 'range', min: 0, max: 50, step: 1, u: ' px' }
  ] },
  { g: 'Bentuk & huruf', items: [
    { k: 'font', l: 'Jenis huruf', t: 'select', o: { ui: 'Bahnschrift (gaming)', mono: 'Monospace', rounded: 'Membulat', impact: 'Impact (tebal)', serif: 'Serif' } },
    { k: 'radius', l: 'Sudut membulat', t: 'range', min: 0, max: 30, step: 1, u: ' px' }
  ] },
  { g: 'Animasi masuk & keluar', items: [
    { k: 'animIn', l: 'Animasi masuk', t: 'select', o: { 'slide-up': 'Naik dari bawah', 'slide-down': 'Turun dari atas', 'slide-left': 'Dari kiri', 'slide-right': 'Dari kanan', scale: 'Membesar halus', zoom: 'Zoom', fade: 'Memudar masuk', none: 'Tanpa animasi' } },
    { k: 'animOut', l: 'Animasi keluar', t: 'select', o: { fade: 'Memudar', 'slide-up': 'Naik', 'slide-down': 'Turun', 'slide-left': 'Ke kiri', 'slide-right': 'Ke kanan', scale: 'Mengecil halus', zoom: 'Zoom keluar', none: 'Tanpa animasi' } },
    { k: 'animMs', l: 'Durasi', t: 'range', min: 0, max: 1200, step: 20, u: ' ms' },
    { k: 'ease', l: 'Gaya gerak', t: 'select', o: { smooth: 'Halus', spring: 'Memantul', inout: 'Lambat-cepat-lambat', linear: 'Linear' } }
  ] }
];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function hex2rgb(h) {
  let s = String(h || '#fff').replace('#', '');
  if (s.length === 3) s = s.split('').map(x => x + x).join('');
  const n = parseInt(s, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (h, a) => { const c = hex2rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${clamp(a, 0, 1)})`; };
const merge = t => Object.assign({}, DEFAULT, t || {});

/** Variabel CSS --t-* untuk overlay berbasis DOM (metrik, controller, tema). */
function cssVars(t) {
  t = merge(t);
  return { '--t-accent': t.accent, '--t-accent2': t.accent2, '--t-text': t.text, '--t-muted': t.muted,
    '--t-panel': rgba(t.panel, t.panelOpacity), '--t-border': t.border, '--t-on': t.onAccent, '--t-glow': t.glow,
    '--t-gs': t.glowSize + 'px', '--t-font': FONTS[t.font] || FONTS.ui, '--t-radius': t.radius + 'px' };
}
function applyVars(el, t) { const v = cssVars(t); for (const k in v) el.style.setProperty(k, v[k]); }

/** Penerjemah tema -> pengaturan overlay lama (dipakai bila "Ikuti tema bersama" aktif). */
function trailOverrides(t) {
  t = merge(t);
  return { colorHead: t.accent, colorTail: t.accent2, glowColor: t.glow, headColor: t.text, ringColor: t.accent, borderColor: t.accent };
}
function keysOverrides(t) {
  t = merge(t);
  return { idleBg: t.panel, idleOpacity: t.panelOpacity, idleBorder: t.border, idleText: t.muted, pressBg: t.accent,
    pressBorder: t.text, pressText: t.onAccent, glow: t.glow, glowSize: t.glowSize, fontFamily: t.font, radius: t.radius };
}

root.AimTheme = { DEFAULT, PRESETS, SCHEMA, FONTS, EASES, merge, cssVars, applyVars, trailOverrides, keysOverrides, rgba, hex2rgb };
if (typeof module !== 'undefined' && module.exports) module.exports = root.AimTheme;
})(typeof window !== 'undefined' ? window : globalThis);
