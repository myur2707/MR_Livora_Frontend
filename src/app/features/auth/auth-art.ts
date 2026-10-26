import { Component } from '@angular/core';
import { IconComponent } from '../../shared/icon';

/**
 * Always-on ambient lighting for the sign-in and registration story panels: drifting aurora
 * glows, a periodic light sweep and twinkling sparkles. Purely decorative and motion-safe.
 */
@Component({
  selector: 'se-auth-ambient',
  host: { class: 'auth-ambient', 'aria-hidden': 'true' },
  template: `<span class="auth-aurora auth-aurora-a"></span>
    <span class="auth-aurora auth-aurora-b"></span>
    <span class="auth-aurora auth-aurora-c"></span>
    <span class="auth-sweep"></span>
    @for (sparkle of sparkles; track $index) {
      <span
        class="auth-sparkle"
        [style.left.%]="sparkle.x"
        [style.top.%]="sparkle.y"
        [style.animation-delay.s]="sparkle.delay"
      ></span>
    }`,
})
export class AuthAmbientComponent {
  protected readonly sparkles = [
    { x: 12, y: 18, delay: 0 },
    { x: 78, y: 12, delay: 1.4 },
    { x: 64, y: 34, delay: 2.6 },
    { x: 24, y: 46, delay: 3.3 },
    { x: 88, y: 58, delay: 0.8 },
    { x: 44, y: 9, delay: 4.1 },
    { x: 8, y: 72, delay: 2.1 },
    { x: 56, y: 66, delay: 5 },
  ] as const;
}

interface Tower {
  readonly x: number;
  readonly width: number;
  readonly height: number;
  readonly windows: readonly { x: number; y: number; delay: number }[];
}

const GROUND = 214;
const WINDOW = 7;
const GAP = 6;

/** Lays out a lit-window grid for a tower, with staggered twinkle timings. */
function tower(x: number, width: number, height: number, seed: number): Tower {
  const columns = Math.max(1, Math.floor((width - GAP) / (WINDOW + GAP)));
  const rows = Math.max(1, Math.floor((height - 18) / (WINDOW + GAP + 2)));
  const windows: { x: number; y: number; delay: number }[] = [];
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++)
      windows.push({
        x: x + GAP + column * (WINDOW + GAP),
        y: GROUND - height + 12 + row * (WINDOW + GAP + 2),
        delay: ((row * 7 + column * 3 + seed) % 11) * 0.6,
      });
  return { x, width, height, windows };
}

/**
 * Animated night-time community skyline with floating activity cards, replacing the static
 * illustration on the sign-in screen. Decorative only; every card names a real feature.
 */
@Component({
  selector: 'se-auth-scene',
  imports: [IconComponent],
  host: { class: 'auth-scene', 'aria-hidden': 'true' },
  template: `<svg class="auth-skyline" viewBox="0 0 520 240" preserveAspectRatio="xMidYMax meet">
      <defs>
        <radialGradient id="auth-moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffd2d4" stop-opacity="0.9" />
          <stop offset="55%" stop-color="#ff5c61" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#ff5c61" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="auth-tower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#34343c" />
          <stop offset="100%" stop-color="#16161a" />
        </linearGradient>
        <linearGradient id="auth-ground" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#c8102e" stop-opacity="0" />
          <stop offset="50%" stop-color="#ff5c61" stop-opacity="0.65" />
          <stop offset="100%" stop-color="#c8102e" stop-opacity="0" />
        </linearGradient>
      </defs>
      <circle class="auth-moon-glow" cx="420" cy="58" r="54" fill="url(#auth-moon-glow)" />
      <circle cx="420" cy="58" r="17" fill="#ffe6e7" />
      <line class="auth-shooting-star" x1="80" y1="20" x2="128" y2="44" />
      @for (building of towers; track building.x) {
        <rect
          [attr.x]="building.x"
          [attr.y]="ground - building.height"
          [attr.width]="building.width"
          [attr.height]="building.height"
          rx="4"
          fill="url(#auth-tower)"
          class="auth-tower"
        />
        @for (light of building.windows; track $index) {
          <rect
            class="auth-window"
            [attr.x]="light.x"
            [attr.y]="light.y"
            [attr.width]="windowSize"
            [attr.height]="windowSize"
            rx="1.5"
            [style.animation-delay.s]="light.delay"
          />
        }
      }
      <rect x="20" [attr.y]="ground" width="480" height="2" fill="url(#auth-ground)" />
      <ellipse cx="260" [attr.cy]="ground + 12" rx="230" ry="9" fill="#ff5c61" opacity="0.12" />
    </svg>
    <span class="auth-float auth-float-a"><se-icon name="check" />Receipt ready</span>
    <span class="auth-float auth-float-b"><se-icon name="bell" />New notice published</span>
    <span class="auth-float auth-float-c"><se-icon name="message" />Complaint resolved</span>`,
})
export class AuthSceneComponent {
  protected readonly ground = GROUND;
  protected readonly windowSize = WINDOW;
  protected readonly towers: readonly Tower[] = [
    tower(36, 58, 104, 1),
    tower(102, 74, 150, 4),
    tower(184, 52, 120, 2),
    tower(244, 88, 178, 7),
    tower(340, 60, 132, 5),
    tower(408, 76, 96, 3),
  ];
}
