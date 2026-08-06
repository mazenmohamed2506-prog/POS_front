; ──────────────────────────────────────────────────────────────
;  POS Installer — Silent SQL Server Express Detection & Install
; ──────────────────────────────────────────────────────────────

!define SQLEXPRESS_SERVICE "MSSQL$$SQLEXPRESS"

!macro customInstall
  ; Check if SQL Server Express instance already exists
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL" "SQLEXPRESS"

  ${If} $0 != ""
    DetailPrint "SQL Server Express (SQLEXPRESS) detected: $0"
  ${Else}
    ; Also check 32-bit registry view (WOW6432Node)
    SetRegView 32
    ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL" "SQLEXPRESS"
    SetRegView 64

    ${If} $0 != ""
      DetailPrint "SQL Server Express (SQLEXPRESS) detected (32-bit): $0"
    ${Else}
      DetailPrint "SQL Server Express not found. Installing silently..."

      ; Run the SQL Server Express installer silently
      ; The installer (SQL2022-SSEI-Expr.exe) is bundled in the scripts resource folder
      nsExec::ExecToLog '"$INSTDIR\resources\scripts\install_sqlexpress.ps1"'
      Pop $1
      DetailPrint "SQL Server Express install script returned: $1"
    ${EndIf}
  ${EndIf}

  ; Ensure SQL Server service is set to auto-start
  nsExec::ExecToLog 'sc config `${SQLEXPRESS_SERVICE}` start= auto'
  Pop $1

  ; Start the SQL Server service if not running
  nsExec::ExecToLog 'net start `${SQLEXPRESS_SERVICE}`'
  Pop $1

!macroend

!macro customUnInstall
  ; We do NOT uninstall SQL Server when POS is removed —
  ; other applications on the machine may depend on it.
!macroend
