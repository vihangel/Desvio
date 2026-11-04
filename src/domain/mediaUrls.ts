// Addresses that only exist in this browser and can never be stored remotely.
export const isSessionUrl = (url?: string) => !!url?.startsWith("blob:");
export const isInlineUrl = (url?: string) => !!url?.startsWith("data:");
export const isLocalOnlyUrl = (url?: string) =>
  isSessionUrl(url) || isInlineUrl(url);
