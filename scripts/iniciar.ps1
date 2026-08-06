# Enciende el CRM. Lo usa la tarea programada que creo instalar-inicio.ps1,
# pero tambien sirve para arrancarlo a mano con doble clic.
$ErrorActionPreference = "Stop"
Set-Location -Path (Split-Path -Parent $PSScriptRoot)

# Espera a que haya internet: al prender el PC la red suele tardar un poco.
for ($i = 0; $i -lt 30; $i++) {
    if (Test-Connection -ComputerName "8.8.8.8" -Count 1 -Quiet) { break }
    Start-Sleep -Seconds 2
}

npm run start
