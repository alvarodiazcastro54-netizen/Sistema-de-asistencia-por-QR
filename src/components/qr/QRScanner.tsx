"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, Alert, Spin, Typography, Space } from "antd";

const { Text } = Typography;

interface ClaseActiva {
  id: string;
  name: string;
  classDate: string;
  startTime: string;
  endTime: string;
}

type ResultadoEscaneo =
  | { tipo: "ok"; nombre: string; hora: string }
  | { tipo: "duplicado"; nombre: string; hora: string }
  | { tipo: "invalido" }
  | { tipo: "vencida"; nombre?: string }
  | { tipo: "error"; mensaje: string };

interface AsistenciaReciente {
  hora: string;
  nombre: string;
}

export default function QRScanner({ clase }: { clase: ClaseActiva }) {
  const procesandoRef = useRef(false);
  const [camaraLista, setCamaraLista] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoEscaneo | null>(null);
  const [recientes, setRecientes] = useState<AsistenciaReciente[]>([]);

  useEffect(() => {
    const elementId = "qr-scanner-region";
    const scanner = new Html5Qrcode(elementId);
    // Variables LOCALES a esta ejecución del efecto (no un ref compartido).
    // Así, si React monta/desmonta rápido en modo desarrollo (Strict Mode),
    // cada intento de cámara queda aislado y no se pisan entre sí.
    let cancelado = false;
    let iniciada = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => onDetectado(decodedText),
        () => {
          // errores de frame individual, se ignoran: son normales mientras no hay QR en cuadro
        }
      )
      .then(() => {
        if (cancelado) {
          // el componente ya se desmontó mientras la cámara iniciaba: detenerla ahora
          scanner.stop().then(() => scanner.clear()).catch(() => {});
          return;
        }
        iniciada = true;
        setCamaraLista(true);
      })
      .catch(() => {
        if (!cancelado) {
          setErrorCamara(
            "No se pudo acceder a la cámara. Revisa los permisos del navegador."
          );
        }
      });

    return () => {
      cancelado = true;
      // Solo intentamos detener si ESTA ejecución llegó a iniciar la cámara.
      // Si start() todavía no resuelve, el .then() de arriba se encarga.
      if (iniciada) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {
            // ya estaba detenido: ignorar
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clase.id]);

  async function onDetectado(qrToken: string) {
    if (procesandoRef.current) return;
    procesandoRef.current = true;

    try {
      const res = await fetch("/api/asistencias/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken, classSessionId: clase.id }),
      });
      const json = await res.json();
      const horaActual = new Date().toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (json.ok) {
        const nombre = `${json.data.alumno?.firstName ?? ""} ${
          json.data.alumno?.lastName ?? ""
        }`.trim();
        setResultado({ tipo: "ok", nombre: nombre || "Alumno", hora: horaActual });
        setRecientes((prev) => [{ hora: horaActual, nombre: nombre || "Alumno" }, ...prev]);
      } else if (json.code === "YA_REGISTRADA") {
        const nombre = `${json.detalles?.alumno?.firstName ?? ""} ${
          json.detalles?.alumno?.lastName ?? ""
        }`.trim();
        setResultado({ tipo: "duplicado", nombre: nombre || "Alumno", hora: horaActual });
      } else if (json.code === "INSCRIPCION_VENCIDA") {
        setResultado({ tipo: "vencida" });
      } else {
        setResultado({ tipo: "invalido" });
      }
    } catch {
      setResultado({ tipo: "error", mensaje: "No se pudo conectar con el servidor" });
    }

    setTimeout(() => {
      setResultado(null);
      procesandoRef.current = false;
    }, 1500);
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Space orientation="vertical" size={4} style={{ width: "100%" }}>
          <Text type="secondary">CLASE ACTIVA</Text>
          <Text strong style={{ fontSize: 18 }}>
            {clase.name}
          </Text>
          <Text>
            {new Date(clase.classDate).toLocaleDateString("es-PE")} · {clase.startTime.slice(0, 5)} –{" "}
            {clase.endTime.slice(0, 5)}
          </Text>
        </Space>
      </Card>

      <Card>
        {errorCamara && <Alert type="error" title={errorCamara} showIcon />}
        {!camaraLista && !errorCamara && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin />
            <div style={{ marginTop: 12 }}>Iniciando cámara…</div>
          </div>
        )}
        <div id="qr-scanner-region" style={{ width: "100%" }} />

        {resultado?.tipo === "ok" && (
          <Alert
            style={{ marginTop: 12 }}
            type="success"
            showIcon
            title="✅ ASISTENCIA REGISTRADA"
            description={`${resultado.nombre} — ${resultado.hora}`}
          />
        )}
        {resultado?.tipo === "duplicado" && (
          <Alert
            style={{ marginTop: 12 }}
            type="warning"
            showIcon
            title="⚠ ASISTENCIA YA REGISTRADA"
            description={resultado.nombre}
          />
        )}
        {resultado?.tipo === "invalido" && (
          <Alert style={{ marginTop: 12 }} type="error" showIcon title="❌ QR NO VÁLIDO" />
        )}
        {resultado?.tipo === "vencida" && (
          <Alert
            style={{ marginTop: 12 }}
            type="error"
            showIcon
            title="❌ INSCRIPCIÓN NO VIGENTE"
          />
        )}
        {resultado?.tipo === "error" && (
          <Alert style={{ marginTop: 12 }} type="error" showIcon title={resultado.mensaje} />
        )}
      </Card>

      <Card title={`ASISTENCIAS (${recientes.length})`}>
        {recientes.length === 0 ? (
          <Text type="secondary">Todavía no hay asistencias en esta clase</Text>
        ) : (
          <Space orientation="vertical" size={4} style={{ width: "100%" }}>
            {recientes.map((item, i) => (
              <div key={i}>
                {item.hora} {item.nombre}
              </div>
            ))}
          </Space>
        )}
      </Card>
    </Space>
  );
}