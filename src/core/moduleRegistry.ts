import type { AppModule } from "./types";

const modules = new Map<string, AppModule>();

export function registerModule(module: AppModule): void {
  if (modules.has(module.id)) {
    throw new Error(`module "${module.id}" is already registered`);
  }
  modules.set(module.id, module);
}

export function getModules(): AppModule[] {
  return Array.from(modules.values());
}
