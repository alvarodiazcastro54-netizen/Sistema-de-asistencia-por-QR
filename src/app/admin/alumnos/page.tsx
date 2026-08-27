"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Table,
  Input,
  Button,
  Tag,
  Space,
  message,
  Select,
} from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";

interface Alumno {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  active: boolean;
}

export default function ListaAlumnosPage() {
  const router = useRouter();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string | undefined>(undefined);

  async function cargarAlumnos() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (active !== undefined) params.set("active", active);

      const res = await fetch(`/api/alumnos?${params.toString()}`);
      const json = await res.json();

      if (json.ok) {
        setAlumnos(json.data.alumnos);
      } else {
        message.error(json.error || "No se pudo cargar la lista de alumnos");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarAlumnos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buscar() {
    cargarAlumnos();
  }

  const columns = [
    {
      title: "DNI",
      dataIndex: "dni",
      key: "dni",
      width: 120,
    },
    {
      title: "Nombre completo",
      key: "nombre",
      render: (_: unknown, alumno: Alumno) =>
        `${alumno.firstName} ${alumno.lastName}`,
    },
    {
      title: "Teléfono",
      dataIndex: "phone",
      key: "phone",
      render: (phone?: string) => phone || "—",
    },
    {
      title: "Correo",
      dataIndex: "email",
      key: "email",
      render: (email?: string) => email || "—",
    },
    {
      title: "Estado",
      dataIndex: "active",
      key: "active",
      width: 100,
      render: (active: boolean) =>
        active ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>,
    },
    {
      title: "",
      key: "acciones",
      width: 100,
      render: (_: unknown, alumno: Alumno) => (
        <Button size="small" onClick={() => router.push(`/admin/alumnos/${alumno.id}`)}>
          Ver
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="Alumnos"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push("/admin/alumnos/nuevo")}
        >
          Nuevo alumno
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Buscar por nombre, apellido o DNI"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onPressEnter={buscar}
          style={{ width: 280 }}
          allowClear
        />
        <Select
          placeholder="Estado"
          allowClear
          style={{ width: 140 }}
          value={active}
          onChange={(value) => setActive(value)}
          options={[
            { value: "true", label: "Activo" },
            { value: "false", label: "Inactivo" },
          ]}
        />
        <Button icon={<SearchOutlined />} onClick={buscar}>
          Buscar
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={alumnos}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
}