import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Hospital, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { FirstLoginPasswordDialog } from "@/components/FirstLoginPasswordDialog";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showFirstLoginDialog, setShowFirstLoginDialog] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("請輸入使用者名稱和密碼");
      return;
    }

    setIsLoading(true);

    try {
      const response = await login({ username, password });

      if (response.success) {
        // 檢查是否為首次登入
        if (response.isFirstLogin) {
          setShowFirstLoginDialog(true);
        } else {
          navigate("/");
        }
      } else {
        setError(response.message || "登入失敗");
      }
    } catch (error) {
      setError("登入過程發生錯誤,請稍後再試");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirstLoginSuccess = () => {
    setShowFirstLoginDialog(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <Hospital className="w-10 h-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl">患者管理系統</CardTitle>
          <CardDescription className="text-base">請登入以繼續使用系統</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">使用者名稱</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="請輸入使用者名稱"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密碼</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="請輸入密碼"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "登入中..." : "登入"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>Patient CRM System v1.0</p>
            </div>
          </form>
        </CardContent>
      </Card>

      <FirstLoginPasswordDialog
        open={showFirstLoginDialog}
        onSuccess={handleFirstLoginSuccess}
      />
    </div>
  );
};

export default Login;
