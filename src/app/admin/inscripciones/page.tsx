"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Table, Tag, Button, Space, message, Select } from "antd";
import dayjs from "dayjs";

interface Inscripcion {
  id: string;
  studentId: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  qrToken: string;
  createdAt: string;
  alumno: {
    id: string;
    dni: string;
    firstName: string;
    lastName: string;
    active: boolean;
  };
}

export default function ListaInscripcionesPage() {
  const router = useRouter();
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | undefined>(undefined);

  async function cargarInscripciones() {
    setLoading(true);
    try {
      const res = await fetch("/api/inscripciones");
      const json = await res.json();

      if (json.ok) {
        setInscripciones(json.data.inscripciones);
      } else {
        message.error(json.error || "No se pudo cargar la lista de inscripciones");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarInscripciones();
  }, []);

  const colorEstado = (estado: string) =>
    estado === "ACTIVE" ? "green" : estado === "EXPIRED" ? "orange" : "red";

  const dataFiltrada = status
    ? inscripciones.filter((i) => i.status === status)
    : inscripciones;

  const columns = [
    {
      title: "Alumno",
      key: "alumno",
      render: (_: unknown, ins: Inscripcion) =>
        `${ins.alumno.firstName} ${ins.alumno.lastName} (${ins.alumno.dni})`,
    },
    {
      title: "Vigencia",
      key: "vigencia",
      render: (_: unknown, ins: Inscripcion) =>
        `${dayjs(ins.startDate).format("DD/MM/YYYY")} – ${dayjs(ins.endDate).format(
          "DD/MM/YYYY",
        )}`,
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (estado: string) => <Tag color={colorEstado(estado)}>{estado}</Tag>,
    },
    {
      title: "",
      key: "acciones",
      width: 120,
      render: (_: unknown, ins: Inscripcion) => (
        <Button size="small" onClick={() => router.push(`/admin/inscripciones/${ins.id}`)}>
          Ver QR
        </Button>
      ),
    },
  ];

  return (
    <Card title="Inscripciones">
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="Filtrar por estado"
          allowClear
          style={{ width: 180 }}
          value={status}
          onChange={(value) => setStatus(value)}
          options={[
            { value: "ACTIVE", label: "Activa" },
            { value: "EXPIRED", label: "Expirada" },
            { value: "CANCELLED", label: "Cancelada" },
          ]}
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={dataFiltrada}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
}