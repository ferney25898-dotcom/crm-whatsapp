# Apaga el CRM. Vuelve a encenderse solo al reiniciar el computador,
# o a mano con: powershell -ExecutionPolicy Bypass -File .\scripts\iniciar.ps1

# Primero el vigilante que lo reinicia, luego el servidor.
Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe' OR Name = 'wscript.exe'" |
    Where-Object { $_.CommandLine -like "*iniciar*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -like "*next*start*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Write-Host "CRM apagado." -ForegroundColor Yellow
