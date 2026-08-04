# CRM WhatsApp + Dropi

CRM sencillo para vender por WhatsApp los productos que promocionas con Meta Ads.
El bot atiende los chats con la informacion que tu le cargas de cada producto, y
cuando cierra la venta el pedido queda listo para montarlo en Dropi.

## Que incluye

- **Chats**: bandeja tipo WhatsApp Web. Puedes tomar el control de una conversacion
  cuando quieras y devolverla al bot despues.
- **Productos**: cada producto tiene su propia ficha de entrenamiento (precio,
  promociones, argumentos de venta, preguntas frecuentes, objeciones, restricciones,
  reglas de cierre y datos que debe recoger el bot).
- **Pedidos**: las ventas confirmadas aparecen con todos los campos listos para
  copiar de un clic y pegarlos en Dropi, mas un boton para enviarlos por API.
- **Configuracion**: numeros de WhatsApp, comportamiento del bot e integracion con Dropi.

## Requisitos

- Node.js 20 o superior
- Una API key de Claude (console.anthropic.com) para el bot
- Un telefono con WhatsApp para escanear el QR

## Instalacion

```bash
npm install
cp .env.example .env      # pon aqui tu ANTHROPIC_API_KEY (o cargala desde el panel)
npx prisma migrate deploy
npm run dev
```

Abre http://localhost:3000.

Para produccion:

```bash
npm run build
npm start
```

## Primeros pasos

1. **Configuracion → Numeros de WhatsApp**: agrega un numero, presiona *Conectar* y
   escanea el QR desde WhatsApp (Dispositivos vinculados).
2. **Productos**: crea el producto y llena la pestaña *Entrenamiento del bot*. Entre
   mas completa este la ficha, mejor vende el bot.
3. **Configuracion**: asigna a cada numero su producto por defecto (util si usas un
   numero por campaña) y pega tu API key de Claude.
4. Manda un mensaje al numero desde otro telefono para probar el flujo completo.

### Si Meta bloquea un numero

El numero es solo un dato de configuracion. En **Configuracion → Numeros**:

- *Cambiar de numero* borra la sesion actual y muestra un QR nuevo para vincular otro
  telefono en el mismo espacio.
- O agrega un numero adicional y deja los dos trabajando a la vez.

Los productos, chats y pedidos no se pierden en ninguno de los dos casos.

## Integracion con Dropi

El token se genera en Dropi, en **Mis Integraciones**: pones un nombre de tienda,
eliges un tipo y guardas. El token que aparece es el que autentica las peticiones y
se envia en el header `dropi-integration-key`.

En **Configuracion → Integracion con Dropi** pegas ese token y puedes ajustar la URL
de la API y la ruta que crea pedidos, porque Dropi no publica documentacion oficial y
esos valores cambian segun el pais. El boton *Probar conexion* muestra la respuesta
cruda del servidor para ver si el token quedo bien.

Si activas *Enviar automaticamente*, el pedido se manda a Dropi apenas el bot cierra
la venta. Si algo falla, el pedido queda marcado con error y siempre puedes usar los
campos de copiar y pegar, que no dependen de la API.

Para que el envio automatico funcione, cada producto necesita sus IDs de Dropi
(producto, variacion y bodega) en la pestaña *Cierre y Dropi*.

## Notas tecnicas

- Next.js 16 + Prisma + SQLite. La base de datos es un solo archivo en `data/crm.db`.
- La conexion a WhatsApp usa [Baileys](https://github.com/WhiskeySockets/Baileys)
  (WhatsApp Web por QR). Las credenciales de cada numero se guardan en `data/wa/`.
- El servidor debe estar siempre encendido para recibir los mensajes. Sirve cualquier
  VPS pequeño o un plan basico de Railway, Render o Fly.io.
- El codigo esta preparado para agregar despues la API oficial de WhatsApp Cloud sin
  reescribir el CRM: la sesion ya tiene los campos del proveedor `cloud`.

## Costos

- CRM, base de datos y conexion a WhatsApp: gratis.
- Bot con IA: se paga por uso segun el modelo elegido (Haiku es el mas economico).
- Servidor: el unico costo fijo, desde unos pocos dolares al mes.
