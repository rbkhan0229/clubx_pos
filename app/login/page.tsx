import { AppShell } from "@/components/common/AppShell";
import { LoginPanel } from "@/components/auth/LoginPanel";

export default function LoginPage() {
  return (
    <AppShell compact>
      <LoginPanel />
    </AppShell>
  );
}
