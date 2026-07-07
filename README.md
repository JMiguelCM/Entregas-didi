# Control de Entregas · Alquiler de Carros

App web para registrar las entregas diarias de dos carros (**Kia Picanto** y **Chevrolet Sail**): registro, resumen, vista mensual y gráficas por día/semana/mes.

## Tecnología
- HTML + CSS + JavaScript (sin framework).
- [Chart.js](https://www.chartjs.org/) para las gráficas.
- [Firebase Firestore](https://firebase.google.com/docs/firestore) para sincronizar los datos en tiempo real entre dispositivos (con caché offline en `localStorage`).

## Configuración
La configuración de Firebase va en `app.js`, en la constante `FIREBASE_CONFIG`.
Requiere crear un proyecto en Firebase y habilitar **Firestore Database**.

## Despliegue
Sitio estático: se puede desplegar en Vercel apuntando a este repositorio.
