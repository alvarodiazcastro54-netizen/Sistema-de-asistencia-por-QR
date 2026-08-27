"use client";

import { useEffect, useState } from "react";
import {
  Table,
  Input,
  DatePicker,
  Select,
  Space,
  Tag,
  Button,
  Modal,
  Form,
  message,
} from "antd";
import { SearchOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

interface Asistencia {
  id: string;
  scannedAt: string;
  method: "QR" | "MANUAL";
  enrollmentId: string;
  alumno: { id: string; dni: string; firstName: string; lastName: string };
  clase: { id: string; name: string; classDate: string; status: string };
}

interface Clase {
  id: string;
  name: string;
  classDate: string;
  status: "OPEN" | "CLOSED" | "CANCELLED";
}

export default function AsistenciaPage() {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fecha, setFecha] = useState<dayjs.Dayjs | null>(null);
  const [claseFiltro, setClaseFiltro] = useState<string | undefined>();
  const [modalAbierto, setModalAbierto] = useState(false);

  async function cargarAsistencias() {
    setLoading(true);
    try {
      const res = await fetch("/api/asistencias");
      const json = await res.json();
      if (json.ok) {
        setAsistencias(json.data.asistencias);
      }
    } finally {
      setLoading(false);
    }
  }

  async function cargarClases() {
    try {
      const res = await fetch("/api/clases");
      const json = await res.json();
      if (json.ok) {
        setClases(json.data.clases);
      }
    } catch {
      // silencioso: el filtro/selector simplemente queda vacío
    }
  }

  useEffect(() => {
    cargarAsistencias();
    cargarClases();
  }, []);

  const filtradas = asistencias.filter((a) => {
    const coincideNombre = `${a.alumno.firstName} ${a.alumno.lastName} ${a.alumno.dni}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const coincideFecha = fecha
      ? dayjs(a.clase.classDate).isSame(fecha, "day")
      : true;
    const coincideClase = claseFiltro ? a.clase.id === claseFiltro : true;
    return coincideNombre && coincideFecha && coincideClase;
  });

  const columns = [
    {
      title: "Hora",
      dataIndex: "scannedAt",
      key: "scannedAt",
      render: (v: string) => dayjs(v).format("HH:mm"),
      sorter: (a: Asistencia, b: Asistencia) =>
        dayjs(a.scannedAt).unix() - dayjs(b.scannedAt).unix(),
      defaultSortOrder: "descend" as const,
    },
    {
      title: "Alumno",
      key: "alumno",
      render: (_: any, r: Asistencia) => `${r.alumno.firstName} ${r.alumno.lastName}`,
    },
    { title: "DNI", key: "dni", render: (_: any, r: Asistencia) => r.alumno.dni },
    { title: "Clase", key: "clase", render: (_: any, r: Asistencia) => r.clase.name },
    {
      title: "Método",
      dataIndex: "method",
      key: "method",
      render: (m: string) => <Tag color={m === "QR" ? "blue" : "orange"}>{m}</Tag>,
    },
    {
      title: "Estado",
      key: "estado",
      render: () => <Tag color="green">Presente</Tag>,
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}>
        <Space wrap>
          <Input
            placeholder="Buscar alumno o DNI"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
          <DatePicker
            placeholder="Filtrar por fecha"
            format="DD/MM/YYYY"
            value={fecha}
            onChange={(v) => setFecha(v)}
          />
          <Select
            placeholder="Filtrar por clase"
            allowClear
            style={{ width: 200 }}
            value={claseFiltro}
            onChange={(v) => setClaseFiltro(v)}
            options={clases.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalAbierto(true)}
        >
          Registrar manualmente
        </Button>
      </Space>

      <Table rowKey="id" columns={columns} dataSource={filtradas} loading={loading} />

      <RegistroManualModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onRegistrado={cargarAsistencias}
        clases={clases}
      />
    </div>
  );
}

function RegistroManualModal({
  open,
  onClose,
  onRegistrado,
  clases,
}: {
  open: boolean;
  onClose: () => void;
  onRegistrado: () => void;
  clases: Clase[];
}) {
  const [form] = Form.useForm();
  const [guardando, setGuardando] = useState(false);

  async function onFinish(values: any) {
    setGuardando(true);
    try {
      const res = await fetch("/api/asistencias/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dni: values.dni,
          classSessionId: values.classSessionId,
        }),
      });
      const json = await res.json();

      if (!json.ok) {
        message.error(json.error || "No se pudo registrar la asistencia");
        return;
      }

      message.success("Asistencia registrada manualmente");
      form.resetFields();
      onClose();
      onRegistrado();
    } catch {
      message.error("No se pudo conectar con el servidor");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      title="Registrar asistencia manual"
      open={open}
      onCancel={onClose}
      footer={null}
        destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="dni"
          label="DNI del alumno"
          rules={[{ required: true, message: "El DNI es obligatorio" }]}
        >
          <Input placeholder="12345678" maxLength={8} />
        </Form.Item>
        <Form.Item
          name="classSessionId"
          label="Clase"
          rules={[{ required: true, message: "Selecciona una clase" }]}
        >
          <Select
            placeholder="Selecciona la clase"
            options={clases
              .filter((c) => c.status === "OPEN")
              .map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={guardando} block>
            Registrar asistencia
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}