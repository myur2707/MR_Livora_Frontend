import { inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';

/** Sets the search/share description for a public page; call from a component constructor. */
export function describePage(description: string): void {
  inject(Meta).updateTag({ name: 'description', content: description });
}
