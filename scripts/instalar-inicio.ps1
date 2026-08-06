# Deja el CRM listo para que arranque solo cada vez que enciendas el computador.
#
# Se ejecuta una sola vez, con clic derecho > "Ejecutar con PowerShell".
# Si Windows bloquea el script, abre PowerShell y corre primero:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

$ErrorActionPreference = "Stop"
$proyecto = Split-Path -Parent $PSScriptRoot
Set-Location -Path $proyecto

Write-Host "Preparando el CRM en $proyecto" -ForegroundColor Cyan

Write-Host "1/3 Instalando dependencias..." -ForegroundColor Cyan
npm install

Write-Host "2/3 Preparando la base de datos y compilando..." -ForegroundColor Cyan
npx prisma migrate deploy
npm run build

Write-Host "3/3 Registrando el arranque automatico..." -ForegroundColor Cyan

$tarea = "CRM WhatsApp"
$script = Join-Path $PSScriptRoot "iniciar.ps1"

# La tarea corre oculta al iniciar sesion y se reinicia sola si algo falla.
$accion = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$disparador = New-ScheduledTaskTrigger -AtLogOn
$opciones = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

Unregister-ScheduledTask -TaskName $tarea -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $tarea -Action $accion -Trigger $disparador `
    -Settings $opciones -Description "Mantiene encendido el CRM de WhatsApp" | Out-Null

Start-ScheduledTask -TaskName $tarea

Write-Host ""
Write-Host "Listo. El CRM ya esta encendido y arrancara solo al prender el PC." -ForegroundColor Green
Write-Host "Abrelo en http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Para apagarlo:    Stop-ScheduledTask -TaskName '$tarea'" -ForegroundColor DarkGray
Write-Host "Para encenderlo:  Start-ScheduledTask -TaskName '$tarea'" -ForegroundColor DarkGray
Write-Host "Para quitarlo:    Unregister-ScheduledTask -TaskName '$tarea'" -ForegroundColor DarkGray
