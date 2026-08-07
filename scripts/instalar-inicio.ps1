# Deja el CRM listo y hace que arranque solo cada vez que enciendas el computador.
#
# Se ejecuta con:
#   powershell -ExecutionPolicy Bypass -File .\scripts\instalar-inicio.ps1
#
# No necesita permisos de administrador: el arranque se registra en la carpeta
# de Inicio de tu usuario, no en las tareas del sistema.

$proyecto = Split-Path -Parent $PSScriptRoot
Set-Location -Path $proyecto

Write-Host "Preparando el CRM en $proyecto" -ForegroundColor Cyan

Write-Host ""
Write-Host "1/4 Instalando dependencias..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "Fallo la instalacion de dependencias." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "2/4 Actualizando la base de datos..." -ForegroundColor Cyan
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { Write-Host "Fallo la base de datos." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "3/4 Compilando..." -ForegroundColor Cyan
# Se borra la compilacion anterior: si quedan archivos de una version vieja,
# la verificacion de tipos falla buscando pantallas que ya se movieron.
if (Test-Path ".next") { Remove-Item ".next" -Recurse -Force }
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Fallo la compilacion." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "4/4 Registrando el arranque automatico..." -ForegroundColor Cyan

# Un lanzador que abre PowerShell sin ventana visible.
$vbs = Join-Path $PSScriptRoot "iniciar-oculto.vbs"
$iniciar = Join-Path $PSScriptRoot "iniciar.ps1"
@"
Set shell = CreateObject("WScript.Shell")
shell.Run "powershell -NoProfile -ExecutionPolicy Bypass -File ""$iniciar""", 0, False
"@ | Set-Content -Path $vbs -Encoding ASCII

# Acceso directo en la carpeta de Inicio del usuario.
$inicio = [Environment]::GetFolderPath("Startup")
$acceso = Join-Path $inicio "CRM WhatsApp.lnk"
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut($acceso)
$link.TargetPath = "wscript.exe"
$link.Arguments = "`"$vbs`""
$link.WorkingDirectory = $proyecto
$link.Description = "Enciende el CRM de WhatsApp"
$link.Save()

# Lo dejamos encendido de una vez.
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -like "*next*start*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Process "wscript.exe" -ArgumentList "`"$vbs`"" -WorkingDirectory $proyecto

Write-Host ""
Write-Host "Listo. El CRM ya esta encendido y arrancara solo al prender el PC." -ForegroundColor Green
Write-Host "Abrelo en http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Para apagarlo:  .\scripts\apagar.ps1" -ForegroundColor DarkGray
Write-Host "Para quitar el arranque automatico, borra este acceso directo:" -ForegroundColor DarkGray
Write-Host "  $acceso" -ForegroundColor DarkGray
