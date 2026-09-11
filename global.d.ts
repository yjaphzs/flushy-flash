/// <reference types="expo-router/types" />

/**
 * Metro turns the CSS entry into a side-effect module; TypeScript needs to be
 * told it exists. Uniwind also emits uniwind-env.d.ts at build time for the
 * className prop augmentations.
 */
declare module '*.css' {}
