"use client";

import { QRCodeSVG } from "qrcode.react";
import { Button, Card, Space, Tag } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

interface StudentQRCodeProps {
  qrToken: string;
  studentName: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  startDate: string;
  endDate: string;
}

export default function StudentQRCode({
  qrToken,
  studentName,
  status,
  startDate,
  endDate,
}: StudentQRCodeProps) {
  function descargarQR() {
    const svg = document.getElementById("student-qr-svg");
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 40, 40, 320, 320);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `qr-${studentName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.click();
    };
    img.src = url;
  }

  const colorEstado =
    status === "ACTIVE" ? "green" : status === "EXPIRED" ? "orange" : "red";

  return (
    <Card style={{ maxWidth: 340, textAlign: "center" }}>
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <QRCodeSVG id="student-qr-svg" value={qrToken} size={240} />
        <div style={{ fontSize: 18, fontWeight: 600 }}>{studentName}</div>
        <Tag color={colorEstado}>
          {status === "ACTIVE"
            ? "Inscripción activa"
            : status === "EXPIRED"
            ? "Inscripción vencida"
            : "Inscripción cancelada"}
        </Tag>
        <div style={{ color: "#888" }}>
          Vigencia: {dayjs(startDate).format("DD/MM/YYYY")} –{" "}
          {dayjs(endDate).format("DD/MM/YYYY")}
        </div>
        <Button icon={<DownloadOutlined />} onClick={descargarQR} block>
          Descargar QR
        </Button>
      </Space>
    </Card>
  );
}