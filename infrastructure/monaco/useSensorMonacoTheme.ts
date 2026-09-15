import type { Monaco } from '@monaco-editor/react';
import { useEffect, useState } from 'react';
import {
  buildSensorMonacoThemeColors,
  getSensorEditorColors,
  getSensorMonacoThemeName,
  getSensorThemeSignal,
  NETCATTY_MONACO_THEME_DARK,
  NETCATTY_MONACO_THEME_LIGHT,
} from './netcattyMonacoTheme';

export const useSensorMonacoTheme = (
  monaco: Monaco | null | undefined,
): string => {
  const [isDarkTheme, setIsDarkTheme] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  const [themeSignal, setThemeSignal] = useState(() => getSensorThemeSignal());
  const themeName = getSensorMonacoThemeName(isDarkTheme);

  useEffect(() => {
    if (!monaco) return;

    const colors = getSensorEditorColors(isDarkTheme);
    const themeColors = buildSensorMonacoThemeColors(colors);

    monaco.editor.defineTheme(NETCATTY_MONACO_THEME_DARK, {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: themeColors,
    });

    monaco.editor.defineTheme(NETCATTY_MONACO_THEME_LIGHT, {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: themeColors,
    });

    monaco.editor.setTheme(themeName);
  }, [monaco, isDarkTheme, themeSignal, themeName]);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
    const root = document.documentElement;
    const updateTheme = () => {
      setIsDarkTheme(root.classList.contains('dark'));
      setThemeSignal(getSensorThemeSignal());
    };
    const observer = new MutationObserver(updateTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-active-chrome-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return themeName;
};
