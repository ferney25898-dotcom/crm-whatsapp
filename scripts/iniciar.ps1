# Enciende el CRM y lo mantiene encendido.
# Lo lanza el acceso directo que crea instalar-inicio.ps1 al prender el PC,
# pero tambien sirve para arrancarlo a mano.
Set-Location -Path (Split-Path -Parent $PSScriptRoot)

# Al prender el computador la red tarda un poco en levantar.
for ($i = 0; $i -lt 30; $i++) {
    if (Test-Connection -ComputerName "8.8.8.8" -Count 1 -Quiet -ErrorAction SilentlyContinue) { break }
    Start-Sleep -Seconds 2
}

# Si el proceso se cae, vuelve a levantarlo solo.
while ($true) {
    npm run start
    Start-Sleep -Seconds 5
}
