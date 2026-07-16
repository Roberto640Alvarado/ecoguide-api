# CLAUDE.md

Este archivo proporciona lineamientos para Claude Code (claude.ai/code) al trabajar sobre este repositorio.

# Descripción del Proyecto

EcoGuide Training API es una API REST desarrollada con NestJS para una plataforma educativa enfocada en el aprendizaje del idioma inglés aplicado al ecoturismo en El Salvador.

La plataforma permitirá que estudiantes exploren áreas protegidas, realicen actividades educativas, practiquen conversaciones con Inteligencia Artificial, desarrollen ejercicios de Speaking, completen evaluaciones y lleven un seguimiento de su progreso.

Los maestros podrán administrar completamente el contenido de la plataforma mediante un panel administrativo.

La base de datos utiliza MongoDB administrada mediante Prisma ORM.

---

# Tecnologías

Runtime

Node.js v22+

Framework

NestJS v11

Lenguaje

TypeScript

Base de Datos

MongoDB

ORM

Prisma ORM

Autenticación

JWT

Documentación

Swagger

Proveedor IA

Google Gemini
Groq
OpenRouter

Almacenamiento de imágenes

Cloudflare R2 (URLs)

---

# Arquitectura

La API debe seguir una arquitectura modular.

Cada módulo debe seguir la siguiente estructura:

```

src/<module>/

controllers/ # Endpoints HTTP

services/ # Lógica de negocio

repositories/ # Acceso a datos

dto/ # DTOs de entrada

doc/ # Serialización de respuestas

enums/ # Enumeraciones

types/ # Interfaces

builders/ # Builders

strategies/ # Estrategias

tests/

\*.spec.ts

mocks/

```

---

# Módulos del Proyecto

La API estará dividida en los siguientes módulos.

Auth

Users

ProtectedAreas

FlashCards

SpeakingPractices

Chatbot

Tests

StudentProgress

StudentTests

SpeakingResults

ChatbotConversations

AIProviders

PasswordReset

UploadFiles

Dashboard

---

# Estructura de Carpetas

Siempre seguir la estructura modular.

No mezclar lógica entre módulos.

Cada módulo debe ser independiente.

---

# Repository Pattern

Siempre utilizar Repository Pattern.

Los repositorios serán responsables únicamente del acceso a datos.

Los Services contendrán toda la lógica de negocio.

Nunca acceder a Prisma directamente desde los Controllers.

Los Controllers únicamente deberán:

- Validar entrada
- Llamar al Service
- Transformar respuesta

---

# Dependency Injection

Utilizar siempre Dependency Injection de NestJS.

Evitar crear instancias manuales.

---

# DTO

Toda petición deberá validarse utilizando:

- class-validator
- class-transformer

Nunca recibir objetos sin validar.

---

# Responses

Todas las respuestas deberán mantener una estructura uniforme.

Ejemplo

```json
{
    "status": "success",
    "message": "Operación realizada correctamente.",
    "data": {}
}
```

Para errores

```json
{
    "status": "error",
    "message": "Descripción del error."
}
```

---

# Documentación

Siempre documentar los endpoints utilizando Swagger.

Utilizar:

- ApiTags
- ApiOperation
- ApiResponse
- ApiBearerAuth
- ApiQuery
- ApiParam

---

# Autenticación

La autenticación utilizará JWT.

Existirán dos roles.

- STUDENT
- TEACHER

Decoradores disponibles

@Public()

@Roles()

@User()

El AuthGuard será aplicado globalmente.

---

# Autorización

Cada endpoint deberá validar correctamente el rol del usuario.

Los estudiantes únicamente podrán acceder a sus recursos.

Los maestros podrán administrar el contenido.

---

# Base de Datos

MongoDB mediante Prisma ORM.

Colecciones principales

- users
- protected_areas
- flash_cards
- speaking_practices
- chatbot_configs
- tests
- student_progress
- speaking_results
- chatbot_conversations
- student_tests
- ai_providers
- password_reset_codes

---

# Relaciones

User

↓

StudentProgress

↓

ProtectedArea

↓

FlashCards

↓

SpeakingPractice

↓

SpeakingResults

↓

Tests

↓

StudentTests

↓

ChatbotConversations

---

# Integraciones Externas

Cloudflare R2

- Subida de imágenes

Google Gemini

- Chatbot
- Speaking Feedback

Groq

- Modelos IA

OpenRouter

- Modelos IA

SMTP

- Recuperación de contraseña

---

# Recuperación de Contraseña

El flujo será:

Correo

↓

Generar código temporal

↓

Enviar correo

↓

Validar código

↓

Cambiar contraseña

Los códigos deberán:

- Expirar
- Ser de un solo uso

---

# IA

Los maestros podrán configurar dinámicamente:

Proveedor

Modelo

Prompt

Temperatura

Mensaje inicial

No deben existir prompts escritos directamente en el código.

Toda configuración deberá obtenerse desde la base de datos.

---

# Speaking Practice

Cada práctica almacenará:

Prompt

Modelo

Indicaciones

El estudiante generará:

Audio

Transcripción

Retroalimentación IA

Calificación

---

# Chatbot

Cada conversación deberá almacenar:

Usuario

Área protegida

Mensajes

Fecha inicio

Fecha fin

Retroalimentación

---

# Paginación

Toda consulta que devuelva listas deberá soportar:

page

limit

search

sort

---

# Código

Utilizar:

- PascalCase para clases.
- camelCase para variables y funciones.
- kebab-case para archivos.
- UPPER_CASE para constantes.

Evitar nombres ambiguos.

---

# Estilo de Código

Siempre utilizar:

- class-transformer
- class-validator

Evitar any.

Mantener el código completamente tipado.

Utilizar interfaces cuando sea necesario.

Preferir enums antes que strings literales.

---

# Buenas Prácticas

Aplicar siempre:

- SOLID
- DRY
- KISS
- Clean Architecture
- Repository Pattern
- Separation of Concerns
- Single Responsibility
- Dependency Injection
- High Cohesion
- Low Coupling

Nunca colocar lógica de negocio en Controllers.

Nunca acceder a Prisma directamente desde Controllers.

Nunca duplicar lógica.

Nunca duplicar DTOs.

Nunca duplicar validaciones.

Reutilizar componentes, DTOs y utilidades siempre que sea posible.

---

# Manejo de Errores

Nunca retornar errores sin controlar.

Utilizar:

- BadRequestException
- UnauthorizedException
- ForbiddenException
- NotFoundException
- ConflictException
- InternalServerErrorException

Registrar errores cuando sea necesario.

---

# Prisma

Siempre ejecutar:

npx prisma generate

después de modificar el schema.prisma.

Nunca acceder al cliente Prisma sin utilizar el Repository correspondiente.

---

# Convenciones

Siempre utilizar class-transformer para serializar respuestas.

Mantener separación de responsabilidades.

Mantener alta cohesión y bajo acoplamiento.

No generar archivos excesivamente grandes.

Si un Service supera aproximadamente las 300-400 líneas, evaluar dividir la lógica en servicios auxiliares o estrategias.

Preferir composición sobre herencia.

Antes de crear un nuevo Service, Repository, DTO o utilidad, verificar si ya existe uno reutilizable.

Toda nueva funcionalidad debe mantener consistencia con la arquitectura existente.

Siempre pensar en escalabilidad, mantenibilidad y reutilización antes de implementar una solución.