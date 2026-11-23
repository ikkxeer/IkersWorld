# Iker’s World

Un portfolio jugable de Iker Aramburu Muñoz. La cámara sobrevuela la costa y aterriza en el muelle, que da acceso a una isla 3D con una casa, un laboratorio, seis expositores de proyectos, una estación, una cafetería y un buzón.

## Desarrollo local

Usa Node.js 22.12 o posterior. Desde la raíz del repositorio ejecuta los siguientes comandos.

```sh
npm ci
npm run dev
```

Abre la URL que muestra Vite. Para comprobar el código y probar la compilación de producción, ejecuta lo siguiente.

```sh
npm run lint
npm run build
npm run preview
```

## Jugar

Camina con WASD, las flechas, los botones táctiles o un toque en el terreno; mantén Shift para correr. Pulsa Q para saludar (Pip te devuelve el saludo) y P para entrar o salir del modo foto, que oculta la interfaz. La tecla E abre el lugar cercano. También puedes pulsar directamente sobre un edificio o expositor. Usa M para viajar por el mapa y la rueda del ratón o los botones + y − para ajustar la cámara. En la plaza, el expositor seleccionado se ilumina y muestra el nombre y la tecnología del proyecto. Pulsa E o el botón del cartel para abrirlo. Llegas a la isla flotando entre las nubes con un paraguas y aterrizas en el muelle. Al final del muelle puedes pescar: pulsa E para lanzar, espera sin impacientarte mientras el pez ronda la boya y vuelve a pulsar E justo cuando se hunda; cada especie lleva el nombre de una tecnología y la colección se guarda en el navegador. La isla tiene un campo de tulipanes, un estanque con ranas, una playa con palmeras y un mirador con catalejo. De vez en cuando cruza el cielo un globo con un regalo: haz clic para reventarlo y descubrir uno de los proyectos. Junto al puente hay una fogata: acércate y pulsa E (o haz clic en ella) para sentarte en un tronco a descansar; cualquier tecla de movimiento te levanta. Pulsa E junto a un árbol, o haz clic en su copa, para sacudirlo. Mochi, la gata, duerme en el banco junto a la casa y se despierta si te acercas, y los gorriones echan a volar si pasas a su lado. Pip, un pingüino con gorra de capitán, da la bienvenida junto al muelle: se gira hacia ti, saluda con la aleta y, cuando está solo, se balancea o da una vueltecita. Entra en la casa de Iker por su puerta o desde el mapa y abre el álbum de la sala para ver su perfil. Escape cierra la ventana activa o te lleva al exterior de la casa. Al cruzar la puerta, una transición circular cierra y vuelve a abrir la vista.

El reloj y la iluminación siguen la hora local del navegador: de noche se encienden las farolas, las ventanas y la hoguera, y salen las luciérnagas; de día el río fluye, el humo sale de las chimeneas, flota el polen y las gaviotas sobrevuelan el mar. El sonido se activa desde el altavoz: además del oleaje y los pájaros, hay efectos sintetizados para los pasos, la pesca, la fogata, las ranas y el globo. El juego recuerda el idioma y respeta la preferencia de movimiento reducido. La guía de controles da acceso a la versión ligera con mapa, que también se abre cuando WebGL no está disponible.

## Editar el portfolio

- `src/data/portfolio.ts` contiene el perfil, los seis proyectos, las tecnologías, la trayectoria, las asignaturas, las habilidades y los enlaces de contacto en los tres idiomas.
- `src/data/village.ts` contiene los nombres de los lugares, los textos de la interfaz y los destinos del mapa.
- `src/data/fish.ts` define las especies que se pueden pescar.
- `src/data/island.ts` define el tamaño de la isla y sitúa los árboles, arbustos, farolas, bancos y la fogata; las colisiones se generan a partir de esa misma lista.
- `src/world/` contiene los modelos procedurales, el personaje, el movimiento y las interacciones. El motor Three.js se carga al entrar al pueblo. `character.ts` define al protagonista, a Pip y a Mochi con sus animaciones; `curve.ts`, la curvatura de mundo tipo diorama; `fishing.ts`, la pesca; `water.ts`, el río, el mar y las cascadas; `ambience.ts`, las luces, el humo, el polen, los peces y las gaviotas.
- `src/environment/` contiene los horarios de las fases de luz y la atmósfera de la isla.
- `public/art/` contiene la portada original y las versiones optimizadas de la fotografía y del logo.

El buzón incluye los enlaces de GitHub y LinkedIn del portfolio. Para habilitar el envío desde el juego, configura un formulario de Formspree que entregue mensajes a tu correo, define su identificador público en `VITE_FORMSPREE_ID` dentro de `.env.local` o del entorno de compilación y vuelve a compilar. Los secretos del proveedor deben permanecer fuera de las variables públicas de Vite.

Las rutas anteriores `/sobre-mi` y `/asignaturas` abren sus fichas dentro del juego. Al alojar `dist/` en un servidor estático, configura el retorno a `index.html` para las rutas de la aplicación.
