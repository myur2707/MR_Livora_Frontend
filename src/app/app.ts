import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastRegionComponent } from './shared/toast';

@Component({
  selector: 'se-root',
  imports: [RouterOutlet, ToastRegionComponent],
  template: '<router-outlet /><se-toast-region />',
})
export class AppComponent {}
