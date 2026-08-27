"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spin, message } from "antd";
import StudentQRCode from "@/components/qr/StudentQRCode";

interface Inscripcion {
  id: string;
  qrToken: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  startDate: string;
  endDate: string;
  studentId: string;
  alumno: { firstName: string; lastName: string };
}

export default function DetalleInscripcionPage() {
  const { id } = useParams<{ id: string }>();
  const [inscripcion, setInscripcion] = useState<Inscripcion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      setLoading(true);
      try {
        const res = await fetch(`/api/inscripciones/${id}`);
        const json = await res.json();
        if (!json.ok) {
          message.error(json.error || "No se pudo cargar la inscripción");
          return;
        }
        setInscripcion(json.data);
      } finally {
        setLoading(false);
      }
    }
    if (id) cargar();
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!inscripcion) {
    return <p>Inscripción no encontrada.</p>;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 24 }}>
      <StudentQRCode
        qrToken={inscripcion.qrToken}
        studentName={`${inscripcion.alumno.firstName} ${inscripcion.alumno.lastName}`}
        status={inscripcion.status}
        startDate={inscripcion.startDate}
        endDate={inscripcion.endDate}
      />
    </div>
  );
}