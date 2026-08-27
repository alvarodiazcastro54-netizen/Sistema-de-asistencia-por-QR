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
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  qrToken: string;
}

export default function DetalleAlumnoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [form] = Form.useForm();

  async function cargarAlumno() {
    setLoading(true);
    try {
      const [resAlumno, resInscripciones] = await Promise.all([
        fetch(`/api/alumnos/${id}`),
        fetch(`/api/inscripciones?studentId=${id}`),
      ]);
      const jsonAlumno = await resAlumno.json();
      const jsonInscripciones = await resInscripciones.json();

      if (jsonAlumno.ok) {
        setAlumno(jsonAlumno.data);
      } else {
        message.error(jsonAlumno.error || "No se pudo cargar el alumno");
      }

      if (jsonInscripciones.ok) {
        setInscripciones(jsonInscripciones.data.inscripciones);
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
      form.resetFields();
      cargarAlumno();
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

  const colorEstado = (status: string) =>
    status === "ACTIVE" ? "green" : status === "EXPIRED" ? "orange" : "red";

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card
        title={`${alumno.firstName} ${alumno.lastName}`}
        extra={alumno.active ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>}
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

      <Card title={`Inscripciones (${inscripciones.length})`}>
        {inscripciones.length === 0 ? (
          <p>Este alumno todavía no tiene inscripciones.</p>
        ) : (
          <Space orientation="vertical" style={{ width: "100%" }}>
            {inscripciones
              .slice()
              .sort((a, b) => dayjs(b.startDate).unix() - dayjs(a.startDate).unix())
              .map((ins) => (
                <Card key={ins.id} size="small" type="inner">
                  <Space orientation="vertical" size={4}>
                    <span>
                      <strong>Vigencia:</strong>{" "}
                      {dayjs(ins.startDate).format("DD/MM/YYYY")} –{" "}
                      {dayjs(ins.endDate).format("DD/MM/YYYY")}
                    </span>
                    <span>
                      <strong>Estado:</strong>{" "}
                      <Tag color={colorEstado(ins.status)}>{ins.status}</Tag>
                    </span>
                    <Button
                      size="small"
                      onClick={() => router.push(`/admin/inscripciones/${ins.id}`)}
                    >
                      Ver QR
                    </Button>
                  </Space>
                </Card>
              ))}
          </Space>
        )}

        <Divider />

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