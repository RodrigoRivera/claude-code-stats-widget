<#
  Claude Stats — sincronizar este PC con los demás.

  Registra una tarea en el Programador de tareas de Windows que actualiza el resumen de
  este PC en la carpeta compartida (por defecto OneDrive\claude-stats), al iniciar sesión
  y cada hora. Corre oculta: no abre ventanas.

  Instalar:  powershell -ExecutionPolicy Bypass -File instalar-sync.ps1
  Quitar:    powershell -ExecutionPolicy Bypass -File instalar-sync.ps1 -Quitar
#>
param(
  [switch]$Quitar,
  [string]$Nombre = 'Claude Stats sync'
)
$ErrorActionPreference = 'Stop'
$carpeta = $PSScriptRoot
$vbs = Join-Path $carpeta 'Abrir Claude Stats.vbs'

if ($Quitar) {
  if (Get-ScheduledTask -TaskName $Nombre -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $Nombre -Confirm:$false
    Write-Host "Listo: quité la tarea '$Nombre'."
  } else {
    Write-Host "No había ninguna tarea '$Nombre'."
  }
  exit 0
}

if (-not (Test-Path -LiteralPath $vbs)) { throw "No encontré '$vbs'. Ejecuta este script desde la carpeta de Claude Stats." }

# Carpeta compartida y nombre del PC: la misma lógica que server.js (config.json o los valores por defecto).
$config = Join-Path $env:USERPROFILE '.claude\claude-stats\config.json'
$syncDir = if ($env:OneDrive) { Join-Path $env:OneDrive 'claude-stats' } else { '' }
$pc = [System.Net.Dns]::GetHostName()
if (Test-Path -LiteralPath $config) {
  $c = Get-Content -LiteralPath $config -Raw | ConvertFrom-Json
  if ($null -ne $c.syncDir) { $syncDir = $c.syncDir }
  if ($c.deviceName) { $pc = $c.deviceName }
}
if (-not $syncDir) { throw "No hay carpeta compartida: OneDrive no está configurado en este PC y config.json no tiene 'syncDir'." }
if (-not (Test-Path -LiteralPath $syncDir)) {
  New-Item -ItemType Directory -Path $syncDir | Out-Null
  Write-Host "Creé la carpeta compartida: $syncDir"
}

# La tarea: wscript + "Abrir Claude Stats.vbs /sync" (sin ventana), al iniciar sesión y cada hora.
$usuario = "$env:USERDOMAIN\$env:USERNAME"
$accion = New-ScheduledTaskAction -Execute "$env:WINDIR\System32\wscript.exe" -Argument "`"$vbs`" /sync" -WorkingDirectory $carpeta
$alIniciar = New-ScheduledTaskTrigger -AtLogOn -User $usuario
$cadaHora = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Hours 1)
$ajustes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew
$quien = New-ScheduledTaskPrincipal -UserId $usuario -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $Nombre -Action $accion -Trigger $alIniciar, $cadaHora -Settings $ajustes -Principal $quien `
  -Description 'Claude Stats: actualiza el resumen de este PC en la carpeta compartida (al iniciar sesión y cada hora).' -Force | Out-Null

# Primera sincronización ahora mismo.
Start-ScheduledTask -TaskName $Nombre

Write-Host ''
Write-Host "Listo: la tarea '$Nombre' quedó registrada (al iniciar sesión y cada hora)."
Write-Host "  Este PC:            $pc"
Write-Host "  Carpeta compartida: $syncDir"
Write-Host "  Para quitarla:      powershell -ExecutionPolicy Bypass -File instalar-sync.ps1 -Quitar"
