import DisplayPropertiesApp from './display-properties-app.js';

export async function launchDisplayPropertiesApp(data = null) {
  const app = new DisplayPropertiesApp(DisplayPropertiesApp.config);
  return app.launch(data);
}
