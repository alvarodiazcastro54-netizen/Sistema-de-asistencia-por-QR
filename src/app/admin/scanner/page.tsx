"use client";

import { useEffect, useState } from "react";
import { Select, Card, Empty, Spin } from "antd";
import QRScanner from "@/components/qr/QRScanner";

interface Clase {
  id: string;
  name: string;
  classDate: string;
  startTime: string;
  endTime: string;
  status: "OPEN" | "CLOSED" | "CANCELLED";
}

export default function ScannerPage() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [claseId, setClaseId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      setLoading(true);
      try {
        const res = await fetch("/api/clases");
        const json = await res.json();
        if (json.ok) {
          const abiertas = json.data.clases.filter((c: Clase) => c.status === "OPEN");
          setClases(abiertas);
          if (abiertas.length === 1) setClaseId(abiertas[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  const claseSeleccionada = clases.find((c) => c.id === claseId);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (clases.length === 0) {
    return (
      <Card>
        <Empty description="No hay ninguna clase abierta. Abre una clase primero en /admin/clases." />
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      {!claseSeleccionada && (
        <Card title="Selecciona la clase" style={{ marginBottom: 16 }}>
          <Select
            style={{ width: "100%" }}
            placeholder="Elige una clase abierta"
            value={claseId}
            onChange={setClaseId}
            options={clases.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Card>
      )}

      {claseSeleccionada && <QRScanner clase={claseSeleccionada} />}
    </div>
  );
}