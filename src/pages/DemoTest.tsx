import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";

const DemoTest = () => {
  const auth = useAuth();
  const demo = useDemo();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold">Demo 系統測試頁面</h1>

        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-2xl font-semibold mb-4">認證狀態</h2>
          <div className="space-y-2 font-mono text-sm">
            <p>✅ isDemoMode: {String(window.__isDemoMode)}</p>
            <p>✅ isAuthenticated: {String(auth.isAuthenticated)}</p>
            <p>✅ User: {auth.user?.name || '無'}</p>
            <p>✅ User Role: {auth.user?.role || '無'}</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-2xl font-semibold mb-4">Demo 狀態</h2>
          <div className="space-y-2 font-mono text-sm">
            <p>✅ Demo Active: {String(demo.isActive)}</p>
            <p>✅ Demo Phase: {demo.phase}</p>
            <p>✅ Demo Patients: {demo.demoPatients.length} 位</p>
            <p>✅ Demo Appointments: {demo.demoAppointments.length} 筆</p>
          </div>
        </div>

        <div className="bg-green-100 dark:bg-green-900 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-2 text-green-800 dark:text-green-200">
            🎉 Demo 系統運作正常！
          </h2>
          <p className="text-green-700 dark:text-green-300">
            如果您能看到這個頁面，表示 Demo 模式已經正確啟動，不需要登入。
          </p>
        </div>

        <div className="space-y-4">
          <a
            href="/"
            className="block w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg text-center font-semibold hover:bg-primary/90"
          >
            前往 Demo 入口頁面
          </a>

          <a
            href="/patients"
            className="block w-full bg-secondary text-secondary-foreground py-3 px-6 rounded-lg text-center font-semibold hover:bg-secondary/90"
          >
            直接進入病患列表
          </a>
        </div>
      </div>
    </div>
  );
};

export default DemoTest;
