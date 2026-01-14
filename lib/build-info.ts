// This file will be updated by build scripts
// For now, we'll use a fallback approach
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();