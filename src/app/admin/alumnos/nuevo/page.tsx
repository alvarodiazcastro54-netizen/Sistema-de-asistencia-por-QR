"use client";

import { Form, Input, Button, DatePicker, Card, message } from "antd";
import { useRouter } from "next/navigation";

export default function NuevoAlumnoPage() {
  const [form] = Form.useForm();
  const router = useRouter();

  async function onFinish(values: any) {
    const payload = {
      dni: values.dni,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email || undefined,
      phone: values.phone || undefined,
      birthDate: values.birthDate ? values.birthDate.format("YYYY-MM-DD") : undefined,
    };

    try {
      const res = await fetch("/api/alumnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.ok) {
        message.error(json.error || "Error al registrar alumno");
        return;
      }

      message.success("Alumno registrado correctamente");
      router.push(`/admin/alumnos/${json.data.id}`);
    } catch {
      message.error("No se pudo conectar con el servidor");
    }
  }

  return (
    <Card title="Registrar alumno" style={{ maxWidth: 600 }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="dni"
          label="DNI"
          rules={[
            { required: true, message: "El DNI es obligatorio" },
            { pattern: /^\d{8}$/, message: "El DNI debe tener exactamente 8 dígitos" },
          ]}
        >
          <Input
            maxLength={8}
            placeholder="12345678"
            inputMode="numeric"
            onKeyPress={(e) => {
              if (!/[0-9]/.test(e.key)) e.preventDefault();
            }}
          />
        </Form.Item>
        <Form.Item
          name="firstName"
          label="Nombres"
          rules={[{ required: true, message: "Los nombres son obligatorios" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="lastName"
          label="Apellidos"
          rules={[{ required: true, message: "Los apellidos son obligatorios" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="birthDate" label="Fecha de nacimiento">
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item name="phone" label="Teléfono">
          <Input
            inputMode="numeric"
            onKeyPress={(e) => {
              if (!/[0-9]/.test(e.key)) e.preventDefault();
            }}
          />
        </Form.Item>
        <Form.Item
          name="email"
          label="Correo"
          rules={[{ type: "email", message: "Correo inválido" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Registrar alumno
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}