# Publica el CRM en una direccion de internet temporal para que tu companero
# pueda entrar desde otra red.
#
#   powershell -ExecutionPolicy Bypass -File .\scripts\compartir.ps1
#
# Usa Cloudflare Tunnel: es gratis y no necesita cuenta ni tarjeta. La ventana
# debe quedar abierta mientras la otra persona trabaja; al cerrarla se corta el
# acceso de una vez.

$proyecto = Split-Path -Parent $PSScriptRoot
$cloudflared = Join-Path $PSScriptRoot "cloudflared.exe"

if (-not (Test-Path $cloudflared)) {
    Write-Host "Descargando Cloudflare Tunnel (solo la primera vez)..." -ForegroundColor Cyan
    $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    try {
        Invoke-WebRequest -Uri $url -OutFile $cloudflared -UseBasicParsing
    } catch {
        Write-Host "No se pudo descargar. Revisa tu internet e intenta de nuevo." -ForegroundColor Red
        exit 1
    }
}

# Si el CRM no esta encendido, la direccion no serviria de nada.
try {
    Invoke-WebRequest -Uri "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 5 | Out-Null
} catch {
    Write-Host "El CRM no responde en http://localhost:3000" -ForegroundColor Red
    Write-Host "Enciendelo primero con: .\scripts\iniciar.ps1" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Creando la direccion publica..." -ForegroundColor Cyan
Write-Host "Busca abajo el link que termina en .trycloudflare.com y compartelo." -ForegroundColor Yellow
Write-Host "Deja esta ventana abierta mientras la otra persona trabaja." -ForegroundColor Yellow
Write-Host ""

& $cloudflared tunnel --url http://localhost:3000
