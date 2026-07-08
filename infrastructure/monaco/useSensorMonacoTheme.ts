// Re-export shim so upstream imports of useSensorMonacoTheme resolve correctly.
// The implementation lives in useNetcattyMonacoTheme.ts; this file just aliases it
// to match what ScriptCodeEditor.tsx expects.
export { useSensorMonacoTheme } from './useNetcattyMonacoTheme';
