import {
  pgTable,
  uuid,
  varchar,
  date,
  time,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "ACTIVE",
  "EXPIRED",
  "CANCELLED",
]);

export const classSessionStatusEnum = pgEnum("class_session_status", [
  "OPEN",
  "CLOSED",
  "CANCELLED",
]);

export const attendanceMethodEnum = pgEnum("attendance_method", [
  "QR",
  "MANUAL",
]);

// ─────────────────────────────────────────────
// Tabla 1: students
// ─────────────────────────────────────────────

export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  dni: varchar("dni", { length: 20 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  birthDate: date("birth_date"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─────────────────────────────────────────────
// Tabla 2: enrollments
// El QR pertenece a la inscripción (qrToken), NUNCA al alumno directamente.
// ─────────────────────────────────────────────

export const enrollments = pgTable("enrollments", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: enrollmentStatusEnum("status").notNull().default("ACTIVE"),
  qrToken: uuid("qr_token").defaultRandom().notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─────────────────────────────────────────────
// Tabla 3: class_sessions
// ─────────────────────────────────────────────

export const classSessions = pgTable("class_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  classDate: date("class_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: classSessionStatusEnum("status").notNull().default("OPEN"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─────────────────────────────────────────────
// Tabla 4: attendances
// Restricción fundamental: enrollmentId + classSessionId = UNIQUE
// (un alumno no puede tener 2 asistencias en la misma clase)
// ─────────────────────────────────────────────

export const attendances = pgTable(
  "attendances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    classSessionId: uuid("class_session_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "cascade" }),
    scannedAt: timestamp("scanned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    method: attendanceMethodEnum("method").notNull().default("QR"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Evita físicamente en la BD que se duplique la asistencia,
    // aunque la validación de la API falle o haya una condición de carrera.
    uniqueEnrollmentPerClass: uniqueIndex("uniq_enrollment_class").on(
      table.enrollmentId,
      table.classSessionId,
    ),
  }),
);