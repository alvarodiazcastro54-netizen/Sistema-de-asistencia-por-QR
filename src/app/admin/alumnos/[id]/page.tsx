"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Form,
  DatePicker,
  Space,
  message,
  Divider,
  Spin,
} from "antd";
import dayjs from "dayjs";

interface Alumno {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  active: boolean;
}

interface Inscripcion {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  qrToken: string;
}

export default function DetalleAlumnoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [ultimaInscripcion, setUltimaInscripcion] = useState<Inscripcion | null>(null);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [form] = Form.useForm();

  async function cargarAlumno() {
    setLoading(true);
    try {
      const res = await fetch(`/api/alumnos/${id}`);
      const json = await res.json();
      if (json.ok) {
        setAlumno(json.data);
      } else {
        message.error(json.error || "No se pudo cargar el alumno");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) cargarAlumno();
  }, [id]);

  async function crearInscripcion(values: any) {
    setCreando(true);
    try {
      const res = await fetch("/api/inscripciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: id,
          startDate: values.rango[0].format("YYYY-MM-DD"),
          endDate: values.rango[1].format("YYYY-MM-DD"),
        }),
      });
      const json = await res.json();

      if (!json.ok) {
        message.error(json.error || "No se pudo crear la inscripción");
        return;
      }

      message.success("Inscripción creada correctamente");
      setUltimaInscripcion(json.data);
      form.resetFields();
    } finally {
      setCreando(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!alumno) {
    return <p>Alumno no encontrado.</p>;
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card
        title={`${alumno.firstName} ${alumno.lastName}`}
        extra={
          alumno.active ? (
            <Tag color="green">Activo</Tag>
          ) : (
            <Tag color="red">Inactivo</Tag>
          )
        }
      >
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="DNI">{alumno.dni}</Descriptions.Item>
          <Descriptions.Item label="Teléfono">{alumno.phone || "—"}</Descriptions.Item>
          <Descriptions.Item label="Correo">{alumno.email || "—"}</Descriptions.Item>
          <Descriptions.Item label="Fecha de nacimiento">
            {alumno.birthDate ? dayjs(alumno.birthDate).format("DD/MM/YYYY") : "—"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Inscripción">
        {ultimaInscripcion && (
          <>
            <Card size="small" type="inner" style={{ marginBottom: 16 }}>
              <Space direction="vertical" size={4}>
                <span>
                  <strong>Vigencia:</strong>{" "}
                  {dayjs(ultimaInscripcion.startDate).format("DD/MM/YYYY")} –{" "}
                  {dayjs(ultimaInscripcion.endDate).format("DD/MM/YYYY")}
                </span>
                <span>
                  <strong>Estado:</strong>{" "}
                  <Tag color="green">{ultimaInscripcion.status}</Tag>
                </span>
                <Button
                  type="primary"
                  size="small"
                  onClick={() =>
                    router.push(`/admin/inscripciones/${ultimaInscripcion.id}`)
                  }
                >
                  Ver QR
                </Button>
              </Space>
            </Card>
            <Divider />
          </>
        )}

        <Form form={form} layout="inline" onFinish={crearInscripcion}>
          <Form.Item
            name="rango"
            label="Nueva inscripción"
            rules={[{ required: true, message: "Selecciona el rango de fechas" }]}
          >
            <DatePicker.RangePicker format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={creando}>
              Crear inscripción
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Space>
  );
}