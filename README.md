# Configuracion del juego Robot Walking

Este proyecto se configura principalmente con el archivo `robot-config.json`. El juego lo carga al iniciar desde:

```text
public/config/robot-config.json
```

Durante desarrollo y build web, todo lo que esta dentro de `public` queda disponible como ruta publica desde la raiz de la app. Por ejemplo, el archivo `public/data/images/robot.gif` se referencia en el JSON como `/data/images/robot.gif`.

## 1. Agregar `robot-config.json`

1. Crear la carpeta `public/config` si no existe.
2. Agregar el archivo `robot-config.json` dentro de esa carpeta.
3. Guardarlo como JSON valido en UTF-8.
4. Evitar comentarios, comas finales y rutas relativas sin `/` inicial.

Ruta esperada:

```text
public/config/robot-config.json
```

Si el archivo no existe o no se puede cargar, el juego usa los valores por defecto definidos en la aplicacion.

## 2. Estructura completa del archivo

Ejemplo con todos los campos configurables:

```json
{
  "nivel": "basico",
  "autor": "Valeria C. Z.",
  "version": "1.0",
  "fecha": "2025-12-02",
  "descripcion": "Juego para el desarrollo de habilidades matematicas",
  "nombreApp": "STEAM-G",
  "plataformas": ["android"],
  "ar": {
    "inicio": {
      "activo": true,
      "contenido": {
        "texto": "Prepara la secuencia del robot",
        "imagen": "/data/images/greeting_V2_fast.gif",
        "audio": "/data/audio/inicio.mp3",
        "video": "/data/videos/inicio.mp4"
      }
    },
    "acierto": {
      "activo": true,
      "contenido": {
        "texto": "Ruta correcta",
        "imagen": "/data/images/jumping_transparent.gif"
      }
    },
    "fin": {
      "activo": true,
      "contenido": {
        "texto": "Mision completada",
        "imagen": "/data/images/walking_V3_fast_transparent.gif"
      }
    }
  }
}
```

No es obligatorio llenar todos los campos. Se pueden omitir los campos que no se necesiten.

## 3. Campos generales

| Campo | Tipo | Valores / formato | Uso en el juego |
| --- | --- | --- | --- |
| `nivel` | string | `basico`, `basic`, `intermedio`, `intermediate`, `avanzado`, `advanced` | Define la dificultad del juego. Si el valor no coincide, se usa `basic`. |
| `autor` | string | Texto libre | Se muestra en la ventana de informacion. |
| `version` | string | Texto libre, por ejemplo `1.0` | Se muestra en la ventana de informacion. |
| `fecha` | string | Formato recomendado `YYYY-MM-DD`, por ejemplo `2025-12-02` | Se muestra como fecha larga en la ventana de informacion. |
| `descripcion` | string | Texto libre | Se muestra en la informacion del juego. |
| `nombreApp` | string | Texto libre | Cambia el nombre visible de la app. |
| `plataformas` | array de strings | Recomendado: `android`, `ios`, `web` | Se muestra en la ventana de informacion. |
| `ar` | object | Ver seccion AR | Configura las pantallas/modalidades de realidad aumentada simulada. |

### Opciones de `nivel`

El campo `nivel` acepta estos valores:

```text
basico
basic
intermedio
intermediate
avanzado
advanced
```

Recomendacion: usar valores sin acentos y sin espacios.

Efectos por nivel:

| Nivel | Ejercicios mostrados | Intentos por ejercicio | Puntos por acierto | Tiempo total |
| --- | ---: | ---: | ---: | ---: |
| `basico` / `basic` | 3 | 3 | 10 | 120 s |
| `intermedio` / `intermediate` | 4 | 2 | 20 | 150 s |
| `avanzado` / `advanced` | 5 | 1 | 30 | 180 s |

### Opciones de `plataformas`

Valores recomendados:

```json
["android"]
["ios"]
["web"]
["android", "ios", "web"]
```

El juego capitaliza estos valores al mostrarlos. Si se agrega otro texto, tambien se mostrara, pero no activa comportamiento tecnico adicional.

## 4. Configuracion AR

El campo `ar` permite configurar tres momentos del juego:

| Seccion | Cuando aparece |
| --- | --- |
| `inicio` | Despues de la cuenta regresiva, antes de iniciar el juego. |
| `acierto` | Despues de resolver correctamente un ejercicio. Esta seccion intenta activar la camara frontal. |
| `fin` | Al terminar el juego, antes del resumen final. |

Cada seccion puede tener esta estructura:

```json
{
  "activo": true,
  "contenido": {
    "texto": "Mensaje para mostrar",
    "imagen": "/data/images/archivo.gif",
    "audio": "/data/audio/archivo.mp3",
    "video": "/data/videos/archivo.mp4"
  }
}
```

### Campos de cada seccion AR

| Campo | Tipo | Obligatorio | Valores / formato | Comportamiento |
| --- | --- | --- | --- | --- |
| `activo` | boolean | No | `true` o `false` | Si es `true` y hay contenido, se muestra la experiencia AR. Si es `false`, se omite. |
| `contenido` | object | No | Ver tabla siguiente | Define texto, imagen, audio y/o video. |

### Campos de `contenido`

| Campo | Tipo | Obligatorio | Valores / formato | Comportamiento |
| --- | --- | --- | --- | --- |
| `texto` | string | No | Texto libre | Se renderiza como texto 3D. Puede incluir saltos de linea con `\n`. |
| `imagen` | string | No | Ruta publica o URL, por ejemplo `/data/images/robot.gif` | Se renderiza como imagen dentro de la escena 3D. |
| `audio` | string | No | Ruta publica o URL, por ejemplo `/data/audio/sonido.mp3` | Se reproduce en bucle. Si solo hay audio, se muestra un reproductor. Si hay texto/imagen/video, se reproduce oculto. |
| `video` | string | No | Ruta publica o URL, por ejemplo `/data/videos/intro.mp4` | Se renderiza como video dentro de la escena 3D. El video se reproduce en bucle y sin sonido. |

Una seccion AR solo se muestra si:

1. `activo` es `true`.
2. Existe al menos un campo no vacio dentro de `contenido`.

Se pueden combinar varios tipos de contenido en la misma seccion. Por ejemplo, `texto` + `imagen` + `audio`.

## 5. Carpetas para imagenes, videos y audios

Todos los archivos configurables deben colocarse dentro de `public`, porque Vite/Capacitor copia esa carpeta como assets publicos de la aplicacion.

Estructura recomendada:

```text
public/
  config/
    robot-config.json
  data/
    images/
      greeting_V2_fast.gif
      jumping_transparent.gif
      walking_V3_fast_transparent.gif
    audio/
      inicio.mp3
      acierto.mp3
      fin.mp3
    videos/
      intro.mp4
      acierto.mp4
      cierre.mp4
```

Rutas que se deben escribir en `robot-config.json`:

| Archivo fisico | Ruta en el JSON |
| --- | --- |
| `public/data/images/robot.gif` | `/data/images/robot.gif` |
| `public/data/audio/inicio.mp3` | `/data/audio/inicio.mp3` |
| `public/data/videos/intro.mp4` | `/data/videos/intro.mp4` |

La carpeta `public/assets` contiene imagenes internas del juego base. Para contenido configurable desde `robot-config.json`, se recomienda usar `public/data/images`, `public/data/audio` y `public/data/videos`.

Tambien se pueden usar URLs externas, pero para Android y uso sin conexion es mas estable guardar los archivos dentro de `public`. Si se usan URLs externas para imagenes o videos, el servidor remoto debe permitir su carga desde la app.

## 6. Formatos recomendados

| Tipo | Formatos recomendados |
| --- | --- |
| Imagen | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` |
| Audio | `.mp3`, `.wav`, `.ogg` |
| Video | `.mp4`, `.webm` |

Para mejor compatibilidad en Android y navegadores, usar:

- Imagenes: `.png`, `.jpg`, `.webp` o `.gif`.
- Audio: `.mp3`.
- Video: `.mp4` con codec H.264.

## 7. Ejemplos de configuracion

### Solo cambiar datos generales

```json
{
  "nivel": "intermedio",
  "autor": "Equipo STEAM",
  "version": "1.2",
  "fecha": "2026-01-15",
  "descripcion": "Actividad para practicar pensamiento computacional",
  "nombreApp": "Robot Challenge",
  "plataformas": ["android", "web"]
}
```

### Activar solo la pantalla AR de inicio

```json
{
  "nivel": "basico",
  "nombreApp": "STEAM-G",
  "ar": {
    "inicio": {
      "activo": true,
      "contenido": {
        "texto": "Listos para programar",
        "imagen": "/data/images/greeting_V2_fast.gif"
      }
    },
    "acierto": {
      "activo": false
    },
    "fin": {
      "activo": false
    }
  }
}
```

### Usar audio y video en el cierre

```json
{
  "nivel": "avanzado",
  "ar": {
    "fin": {
      "activo": true,
      "contenido": {
        "texto": "Mision completada",
        "audio": "/data/audio/final.mp3",
        "video": "/data/videos/final.mp4"
      }
    }
  }
}
```

## 8. Validacion rapida

Antes de entregar una configuracion, revisar:

- El archivo existe en `public/config/robot-config.json`.
- El JSON es valido.
- `nivel` no tiene acentos ni espacios.
- `fecha` usa el formato `YYYY-MM-DD`.
- Las rutas de archivos empiezan con `/`.
- Los archivos referenciados existen dentro de `public`.
- Cada seccion AR activa tiene al menos un contenido no vacio.
