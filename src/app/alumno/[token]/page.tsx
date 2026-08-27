"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spin, Card, Tag, Space, Typography, Empty, Alert } from "antd";
import { QRCodeSVG } from "qrcode.react";
import dayjs from "dayjs";

const { Title, Text } = Typography;

interface DatosPortal {
  alumno: { firstName: string; lastName: string };
  inscripcion: {
    status: "ACTIVE" | "EXPIRED" | "CANCELLED";
    startDate: string;
    endDate: string;
    qrToken: string;
  };
  asistencias: { classDate: string; className: string; scannedAt: string }[];
}

export default function PortalAlumnoPage() {
  const { token } = useParams<{ token: string }>();
  const [datos, setDatos] = useState<DatosPortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      setLoading(true);
      try {
        // TODO: pendiente que Willy exponga este endpoint (busca por qrToken, no por id)
        const res = await fetch(`/api/portal/${token}`);
        const json = await res.json();
        if (!json.ok) {
          setError(json.error || "No se pudo cargar tu información");
          return;
        }
        setDatos(json.data);
      } catch {
        setError("No se pudo conectar con el servidor");
      } finally {
        setLoading(false);
      }
    }
    if (token) cargar();
  }, [token]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div style={{ maxWidth: 480, margin: "40px auto" }}>
        <Alert type="error" showIcon message={error || "QR no válido"} />
      </div>
    );
  }

  const { alumno, inscripcion, asistencias } = datos;
  const colorEstado =
    inscripcion.status === "ACTIVE"
      ? "green"
      : inscripcion.status === "EXPIRED"
      ? "orange"
      : "red";

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Title level={3} style={{ textAlign: "center", marginBottom: 0 }}>
          Hola, {alumno.firstName}
        </Title>

        <Card title="Inscripción">
          <Space orientation="vertical" size={4}>
            <Text>
              Estado: <Tag color={colorEstado}>{inscripcion.status}</Tag>
            </Text>
            <Text>
              Vigencia: {dayjs(inscripcion.startDate).format("DD/MM")} –{" "}
              {dayjs(inscripcion.endDate).format("DD/MM")}
            </Text>
          </Space>
        </Card>

        <Card title="Mi código QR" style={{ textAlign: "center" }}>
          <QRCodeSVG value={inscripcion.qrToken} size={200} />
        </Card>

        <Card title="Mis asistencias">
          {asistencias.length === 0 ? (
            <Empty description="Todavía no tienes asistencias registradas" />
          ) : (
            <Space orientation="vertical" size={8} style={{ width: "100%" }}>
              {asistencias.map((a, i) => (
                <div
                  key={i}
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>
                    {dayjs(a.classDate).format("DD/MM")} — {a.className}
                  </span>
                  <Tag color="green">Presente</Tag>
                </div>
              ))}
            </Space>
          )}
        </Card>
      </Space>
    </div>
  );
}