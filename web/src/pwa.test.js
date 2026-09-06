import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA', () => {
  it('vite.config.js contient VitePWA + manifest', () => {
    const cfg = fs.readFileSync(path.resolve('vite.config.js'), 'utf-8');
    expect(cfg).toContain('VitePWA');
    expect(cfg).toContain('Babyfoot au boulot');
    expect(cfg).toContain('icon-192.png');
    expect(cfg).toContain('icon-512.png');
    expect(cfg).toContain('NetworkFirst');
  });

  it('icônes 192 et 512 existent', () => {
    expect(fs.existsSync(path.resolve('public/icon-192.png'))).toBe(true);
    expect(fs.existsSync(path.resolve('public/icon-512.png'))).toBe(true);
    const s192 = fs.statSync(path.resolve('public/icon-192.png')).size;
    const s512 = fs.statSync(path.resolve('public/icon-512.png')).size;
    expect(s192).toBeGreaterThan(500);
    expect(s512).toBeGreaterThan(500);
  });

  it('index.html a theme-color + apple-touch-icon', () => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf-8');
    expect(html).toContain('theme-color');
    expect(html).toContain('#7c3aed');
    expect(html).toContain('apple-touch-icon');
    expect(html).toContain('icon-192.png');
  });

  it('package.json a vite-plugin-pwa', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
    expect(pkg.devDependencies['vite-plugin-pwa']).toBeDefined();
  });
});
