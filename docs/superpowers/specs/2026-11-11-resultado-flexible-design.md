# Resultado flexible de partidos

Estado: diseno aprobado por el usuario; implementacion y verificacion en dev.

## Necesidad y decisiones aprobadas

Registrar el resultado de un partido aunque nadie haya cargado el minuto a minuto. Solo la cuenta con rol real `admin` puede usar esta nueva edicion; todo el equipo consulta el resultado.

- Permitir cargar y corregir goles de ambos equipos sin exigir goleador ni minuto.
- Completar o corregir despues los goleadores propios para las estadisticas.
- Permitirlo tambien en partidos con eventos existentes, conservando sus datos conocidos.
- Al reducir el marcador, quitar primero goles sin asignar. Si no alcanza, exigir elegir que goles identificados eliminar antes de guardar.

## Enfoques

El enfoque propuesto reutiliza `match_events`: cada gol cuenta una vez aunque no tenga protagonista ni minuto. Cambiar su goleador modifica ese mismo registro. `match_results` conserva el resultado final, calculado desde los goles guardados.

La alternativa de guardar un marcador independiente y sumar goleadores por separado introduce dos fuentes que pueden contradecirse en En vivo, Resultado y Estadisticas. No aporta una ventaja para esta necesidad. Reutilizar los eventos es el unico enfoque recomendado por su alcance y por conservar el modelo actual.

## Comportamiento propuesto

- Agregar la edicion en la pantalla de Resultado existente, sin una ruta nueva. Para admin, respetar el modo de previsualizacion: los controles se muestran en vista DT, no en vista Jugador.
- Ingresar dos enteros no negativos, uno por equipo. Guardar tambien permite registrar un 0-0 y marcar el partido como finalizado, como el resultado actual.
- Decision de implementacion: limitar cada marcador a 99 para evitar crear accidentalmente cantidades desproporcionadas de eventos. El limite se valida tambien en la RPC.
- Mostrar los goles agrupados por equipo y los propios con un selector de jugador de la plantilla o "Sin asignar". El mismo jugador puede tener varios goles. Los rivales pueden permanecer sin identificar.
- Aumentar el marcador agrega la cantidad faltante de goles sin asignar y sin minuto. Reducirlo prepara las eliminaciones acordadas y muestra cuales se quitaran antes de guardar. Ninguna eliminacion se aplica hasta guardar.
- Los goles conservados mantienen su identificador, minuto, nota y datos del protagonista, salvo la asignacion que el admin cambie expresamente. Asignar o desasignar un goleador no cambia el marcador.
- Mostrar los minutos y notas existentes para distinguir goles del mismo jugador. Una referencia historica a un jugador eliminado se conserva si no se cambia; no se permite crear nuevas asignaciones a ese jugador.
- Los goles sin asignar cuentan para el equipo, pero no para ningun jugador. Los goles sin minuto se presentan sin inventar un momento ni un tiempo del partido.
- Un solo guardado aplica goles y resultado final; un error no debe dejar cambios parciales. No modificar tarjetas, cambios, comentarios, marcadores de tiempo, asistencia ni formacion.
- Mantener el flujo actual de carga En vivo y las notas del DT. La nueva herramienta administrativa no otorga permisos adicionales a DT ni asistente.

## Datos y permisos

Reutilizar `match_events`, `match_results` y los tipos existentes. No crear tablas ni un segundo contador de goles.

Preparar `0014_flexible_match_results.sql` con una operacion transaccional de Supabase que compruebe el rol real admin, la pertenencia del partido al equipo y los jugadores y goles involucrados. Validar enteros no negativos y la correspondencia entre goles y marcador en el servidor. Detectar cambios concurrentes y pedir recargar antes de sobrescribir datos ajenos.

Los lectores existentes siguen contando goles de `match_events`. La suscripcion Realtime debe incluir las actualizaciones de goleador, ademas de inserciones y eliminaciones. Tras guardar, actualizar tambien el resultado que usa el listado de partidos.

La migracion se entrega al usuario para ejecutar manualmente despues del deploy. Antes de aplicarla, el nuevo guardado muestra un error comprensible y conserva el formulario; los flujos existentes deben seguir funcionando.

## Alcance y verificacion

Modificar la pantalla de Resultado, el servicio de partidos, el hook de eventos, la presentacion de goles sin identificar en En vivo y la documentacion. Reutilizar componentes de formulario existentes. No agregar dependencias.

Verificar: 3-2 sin goleadores; asignacion posterior de dos goles al mismo jugador; 0-0; aumento y reduccion con y sin goleadores conocidos; conservacion de minutos y otros eventos; ausencia de doble conteo; permisos admin frente a DT/jugador/asistente; errores de guardado y concurrencia; consistencia en Resultado, En vivo, listado y Estadisticas. Probar la UI en 375x812 y 320x568 sin desbordamiento horizontal, ademas de tipos y build.

No incluir carga de tarjetas post-partido, minutos jugados manuales, autogoles como tipo nuevo, cambios al reclamo de perfiles ni automatizacion de notificaciones. La validacion real de la operacion SQL queda pendiente hasta su ejecucion manual en Supabase; las pruebas no deben alterar partidos reales.
