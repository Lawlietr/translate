import type { AIProvider } from "./types";
import { webgpuProvider } from "./webgpu";
import { llamaServerProvider } from "./llama-server";

const providers: AIProvider[] = [webgpuProvider, llamaServerProvider];

export function getProvider(id: string): AIProvider | undefined {
  return providers.find((p) => p.id === id);
}

export function getProviderOrThrow(id: string): AIProvider {
  const provider = getProvider(id);
  if (!provider) throw new Error(`Unknown provider: ${id}`);
  return provider;
}

export function listProviders(): AIProvider[] {
  return providers;
}

export function enabledProviders(): AIProvider[] {
  return providers.filter((p) => p.enabled);
}
