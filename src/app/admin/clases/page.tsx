"use client";

import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  TimePicker,
  Tag,
  Space,
  message,
} from "antd";
import { PlusOutlined, StopOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

interface Clase {
  id: string;
  name: string;
  classDate: string;
  startTime: string;
  endTime: string;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  createdAt: string;
}

export default function ClasesPage() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  const [form] = Form.useForm();

  async function cargarClases() {
    setLoading(true);
    try {
      const res = await fetch("/api/clases");
      const json = await res.json();
      if (json.ok) {
        setClases(json.data.clases);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarClases();
  }, []);

  async function crearClase(values: any) {
    setCreando(true);
    try {
      const res = await fetch("/api/clases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          classDate: values.classDate.format("YYYY-MM-DD"),
          startTime: values.horario[0].format("HH:mm"),
          endTime: values.horario[1].format("HH:mm"),
        }),
      });
      const json = await res.json();

      if (!json.ok) {
        message.error(json.error || "No se pudo crear la clase");
        return;
      }

      message.success("Clase creada correctamente");
      form.resetFields();
      setModalAbierto(false);
      cargarClases();
    } finally {
      setCreando(false);
    }
  }

  function cambiarEstado(id: string, status: "CLOSED" | "CANCELLED", nombre: string) {
    Modal.confirm({
      title: status === "CLOSED" ? "¿Cerrar esta clase?" : "¿Cancelar esta clase?",
      content:
        status === "CLOSED"
          ? `"${nombre}" dejará de aceptar asistencias. Esta acción no se puede deshacer.`
          : `"${nombre}" se cancelará por completo. Esta acción no se puede deshacer.`,
      okText: status === "CLOSED" ? "Sí, cerrar" : "Sí, cancelar",
      okButtonProps: { danger: status === "CANCELLED" },
      cancelText: "Volver",
      async onOk() {
        try {
          const res = await fetch(`/api/clases/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          });
          const json = await res.json();

          if (!json.ok) {
            message.error(json.error || "No se pudo actualizar la clase");
            return;
          }

          message.success(status === "CLOSED" ? "Clase cerrada" : "Clase cancelada");
          cargarClases();
        } catch {
          message.error("No se pudo conectar con el servidor");
        }
      },
    });
  }

  const columns = [
    { title: "Nombre", dataIndex: "name", key: "name" },
    {
      title: "Fecha",
      dataIndex: "classDate",
      key: "classDate",
      render: (d: string) => dayjs(d).format("DD/MM/YYYY"),
    },
    {
      title: "Horario",
      key: "horario",
      render: (_: any, r: Clase) => `${r.startTime.slice(0, 5)} - ${r.endTime.slice(0, 5)}`,
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const color =
          status === "OPEN" ? "green" : status === "CLOSED" ? "default" : "red";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: any, r: Clase) =>
        r.status === "OPEN" ? (
          <Space>
            <Button
              size="small"
              icon={<StopOutlined />}
              onClick={() => cambiarEstado(r.id, "CLOSED", r.name)}
            >
              Cerrar
            </Button>
            <Button size="small" danger onClick={() => cambiarEstado(r.id, "CANCELLED", r.name)}>
              Cancelar
            </Button>
          </Space>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, width: "100%", justifyContent: "flex-end" }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalAbierto(true)}>
          Nueva clase
        </Button>
      </Space>

      <Table rowKey="id" columns={columns} dataSource={clases} loading={loading} />

      <Modal
        title="Nueva clase"
        open={modalAbierto}
        onCancel={() => setModalAbierto(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={crearClase}>
          <Form.Item
            name="name"
            label="Nombre"
            rules={[{ required: true, message: "El nombre es obligatorio" }]}
          >
            <Input placeholder="Karate adultos" />
          </Form.Item>
          <Form.Item
            name="classDate"
            label="Fecha"
            rules={[{ required: true, message: "La fecha es obligatoria" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            name="horario"
            label="Horario"
            rules={[{ required: true, message: "El horario es obligatorio" }]}
          >
            <TimePicker.RangePicker format="HH:mm" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={creando} block>
              Abrir clase
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}