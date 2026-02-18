import { AboutApp } from './about-app.js';

export async function launchAboutApp(data = null) {
  const app = new AboutApp(AboutApp.config);
  return app.launch(data);
}
