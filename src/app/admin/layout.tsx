"use client";

import { Layout, Menu } from "antd";
import {
  TeamOutlined,
  IdcardOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  ScanOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";

const { Sider, Content, Header } = Layout;

const items = [
  { key: "/admin/alumnos", icon: <TeamOutlined />, label: "Alumnos" },
  { key: "/admin/inscripciones", icon: <IdcardOutlined />, label: "Inscripciones" },
  { key: "/admin/clases", icon: <CalendarOutlined />, label: "Clases" },
  { key: "/admin/asistencia", icon: <CheckSquareOutlined />, label: "Asistencia" },
  { key: "/admin/scanner", icon: <ScanOutlined />, label: "Scanner" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ color: "#fff", textAlign: "center", padding: 16, fontWeight: "bold" }}>
          Dojo Admin
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={items}
          onClick={({ key }) => router.push(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: "#fff", padding: "0 16px", fontWeight: 600 }}>
          Sistema de Asistencia
        </Header>
        <Content style={{ margin: 16 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}