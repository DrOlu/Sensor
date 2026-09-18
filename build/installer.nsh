!macro customInstall
  ; Open a selected folder in a new Sensor local terminal.
  ; Args go after `--` so Electron/Chromium does not swallow them. Use
  ; `--open-terminal-path="%1."` so paths with spaces stay one token and drive
  ; roots (`C:\`) do not break Windows quote parsing.
  WriteRegStr SHCTX "Software\Classes\Directory\shell\Sensor" "MUIVerb" "Open in Sensor"
  WriteRegStr SHCTX "Software\Classes\Directory\shell\Sensor" "Icon" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr SHCTX "Software\Classes\Directory\shell\Sensor\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" -- --open-terminal-path="%1."'

  ; Open the directory currently displayed by Explorer.
  WriteRegStr SHCTX "Software\Classes\Directory\Background\shell\Sensor" "MUIVerb" "Open in Sensor"
  WriteRegStr SHCTX "Software\Classes\Directory\Background\shell\Sensor" "Icon" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr SHCTX "Software\Classes\Directory\Background\shell\Sensor\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" -- --open-terminal-path="%V."'
!macroend

!macro customUnInstall
  DeleteRegKey SHCTX "Software\Classes\Directory\shell\Sensor"
  DeleteRegKey SHCTX "Software\Classes\Directory\Background\shell\Sensor"
!macroend
