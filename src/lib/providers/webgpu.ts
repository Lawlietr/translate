import type { AIProvider, ProviderConfig, TranslationRequest, TranslationResponse } from "./types";
import { isWebGpuSupported } from "./webgpu-support";

export const webgpuProvider: AIProvider = {
  id: "webgpu",
  name: "WebGPU (in-browser)",
  enabled: true,
  configSchema: [],

  async translate(
    _request: TranslationRequest,
    _config: ProviderConfig,
    _signal?: AbortSignal
  ): Promise<TranslationResponse> {
    throw new Error("WebGPU inference pipeline is not wired yet (TODO #4).");
  },

  async testConnection(_config: ProviderConfig): Promise<boolean> {
    if (typeof window !== "undefined" && !window.isSecureContext) return false;
    return isWebGpuSupported();
  },
};
