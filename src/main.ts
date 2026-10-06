import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app';
import { appConfig } from './app/app.config';

void bootstrapApplication(AppComponent, appConfig).catch(() => {
  const message = document.createElement('p');
  message.textContent = 'Mr. Livora could not start. Please refresh the page.';
  document.body.replaceChildren(message);
});
