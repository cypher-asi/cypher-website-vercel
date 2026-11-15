/**
 * Provider-agnostic analytics boundary.
 *
 * It is a no-op until a real provider is wired via `setAnalyticsProvider`
 * (Mixpanel, see ./mixpanel). Call sites import `track` / `pageview` and never
 * depend on a specific vendor.
 */

export interface AnalyticsEvent {
  name: string;
  props?: Record<string, unknown>;
}

export interface AnalyticsProvider {
  track(event: AnalyticsEvent): void;
  pageview(path: string): void;
}

const noopProvider: AnalyticsProvider = {
  track: () => {},
  pageview: () => {},
};

let provider: AnalyticsProvider = noopProvider;

export function setAnalyticsProvider(next: AnalyticsProvider): void {
  provider = next;
}

export function track(name: string, props?: Record<string, unknown>): void {
  provider.track({ name, props });
}

export function pageview(path: string): void {
  provider.pageview(path);
}
