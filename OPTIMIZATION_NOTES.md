# Notas de Optimización de Recursos - NoRulete

## Compresión de Video (`vidInicio.mp4` — ~14 MB)

El video pesa casi 14 MB, lo cual es excesivo para una web móvil.

### Opción 1: HandBrake (Gratis, Desktop)
1. Descarga [HandBrake](https://handbrake.fr/)
2. Abre `vidInicio.mp4`
3. Selecciona el preset **"Web > Gmail Medium 5 Minutes 720p30"**
4. En **Video**, ajusta:
   - Codec: H.264
   - Quality: RF 28 (menor = mejor calidad, mayor tamaño)
   - Framerate: 30 fps
5. Guarda como `vidInicio.mp4` (reemplazando el original)
6. **Tamaño objetivo:** 2-3 MB

### Opción 2: Convertir a WebM  
El formato WebM es más ligero y soportado por navegadores modernos.
- Usa [CloudConvert](https://cloudconvert.com/mp4-to-webm)
- En el HTML, agrega una fuente WebM como primera opción:
```html
<video id="splashVideo" playsinline preload="auto" autoplay loop muted>
    <source src="vidInicio.webm" type="video/webm">
    <source src="vidInicio.mp4" type="video/mp4">
</video>
```

## Compresión de Imágenes

| Archivo              | Tamaño actual | Tamaño objetivo |
|----------------------|:-------------:|:---------------:|
| custom_hub_logo.png  | 731 KB        | ~50 KB          |
| luck_fixed.png       | 350 KB        | ~30 KB          |
| yape_qr.png          | 58 KB         | ~20 KB          |
| assets/logo.png      | 234 KB        | ~30 KB          |

### Cómo comprimir:
1. Abre [Squoosh.app](https://squoosh.app/) (Google, gratis)
2. Arrastra cada imagen
3. Elige formato **WebP** con calidad 80%
4. Descarga el resultado
5. Actualiza las referencias en el código si cambias la extensión

### Formato recomendado:
- **WebP** para fotos y logos complejos (hasta 90% más liviano que PNG)
- **AVIF** para máxima compresión (soporte más limitado)
- Mantén el PNG original como fallback si necesitas compatibilidad total
