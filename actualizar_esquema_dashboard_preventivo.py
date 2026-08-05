#!/usr/bin/env python3
from pathlib import Path

ruta = Path("lib/api-zod/src/generated/api.ts")

if not ruta.exists():
    raise SystemExit(f"No existe el archivo: {ruta}")

texto = ruta.read_text(encoding="utf-8")
respaldo = Path(str(ruta) + ".antes-dashboard-preventivo.bak")
respaldo.write_text(texto, encoding="utf-8")

inicio_marca = 'export const GetDashboardResponse = zod.object({'
inicio = texto.find(inicio_marca)

if inicio == -1:
    raise SystemExit(
        "No encontré GetDashboardResponse. No se realizaron cambios."
    )

posicion = inicio + len(inicio_marca)
nivel = 1
fin = -1

while posicion < len(texto):
    caracter = texto[posicion]

    if caracter == "{":
        nivel += 1
    elif caracter == "}":
        nivel -= 1

        if nivel == 0:
            cierre = texto.find(");", posicion)

            if cierre == -1:
                raise SystemExit(
                    "Encontré el objeto, pero no su cierre final."
                )

            fin = cierre + 2
            break

    posicion += 1

if fin == -1:
    raise SystemExit(
        "No pude determinar el final de GetDashboardResponse."
    )

nuevo_bloque = '''export const GetDashboardResponse = zod.object({
  "stats": zod.object({
    "clientes": zod.number(),
    "pacientes": zod.number(),
    "consultas": zod.number(),
    "consultasHoy": zod.number(),
    "proximasCitas": zod.number(),
    "hospitalizados": zod.number(),
    "medicinaPreventiva": zod.number()
  }),

  "recientes": zod.array(zod.object({
    "id": zod.number(),
    "fecha": zod.string(),
    "pacienteId": zod.number(),
    "paciente": zod.string(),
    "propietario": zod.string(),
    "motivo": zod.string()
  })),

  "proximasCitasLista": zod.array(zod.object({
    "id": zod.number(),
    "pacienteId": zod.number(),
    "paciente": zod.string(),
    "propietario": zod.string(),
    "proximaCita": zod.string(),
    "motivo": zod.string().nullish()
  })),

  "hospitalizadosLista": zod.array(zod.object({
    "id": zod.number(),
    "pacienteId": zod.number(),
    "paciente": zod.string(),
    "propietario": zod.string(),
    "estado": zod.string(),
    "fechaIngreso": zod.string(),
    "motivo": zod.string()
  })),

  "visitasPreventivas": zod.array(zod.object({
    "id": zod.number(),
    "pacienteId": zod.number(),
    "paciente": zod.string(),
    "propietario": zod.string(),

    "tipo": zod.enum([
      "Vacunación",
      "Desparasitación"
    ]),

    "concepto": zod.string(),
    "fecha": zod.string(),

    "estado": zod.enum([
      "Atrasada",
      "Hoy",
      "Próxima"
    ]),

    "diasDiferencia": zod.number(),
    "detalle": zod.string().nullish()
  }))
});'''

texto_actualizado = texto[:inicio] + nuevo_bloque + texto[fin:]
ruta.write_text(texto_actualizado, encoding="utf-8")

print("Esquema del Dashboard actualizado correctamente.")
print(f"Respaldo creado: {respaldo}")
print("Todavía falta actualizar dashboard.ts del backend y del frontend.")
