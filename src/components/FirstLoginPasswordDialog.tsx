import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Lock } from "lucide-react";
import { firstLoginChangePassword } from "@/lib/auth";

interface FirstLoginPasswordDialogProps {
  open: boolean;
  onSuccess: () => void;
}

export function FirstLoginPasswordDialog({ open, onSuccess }: FirstLoginPasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const validatePasswords = (): boolean => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("所有欄位都必須填寫");
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError("新密碼與確認密碼不一致");
      return false;
    }

    if (newPassword.length < 8) {
      setError("密碼長度至少需要 8 個字元");
      return false;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError("密碼需包含至少一個大寫字母");
      return false;
    }

    if (!/[a-z]/.test(newPassword)) {
      setError("密碼需包含至少一個小寫字母");
      return false;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError("密碼需包含至少一個數字");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validatePasswords()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await firstLoginChangePassword(currentPassword, newPassword);

      if (result.success) {
        // 清空表單
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // 通知父組件成功
        onSuccess();
      } else {
        setError(result.message || "密碼更新失敗");
      }
    } catch (error) {
      setError("密碼更新過程發生錯誤，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} modal>
      <DialogContent className="sm:max-w-[500px]" hideCloseButton>
        <DialogHeader>
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl text-center">歡迎首次登入</DialogTitle>
          <DialogDescription className="text-center text-base">
            為了保護您的帳號安全，請立即修改您的密碼
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">目前密碼</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="請輸入目前密碼"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">新密碼</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="請輸入新密碼"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                密碼需至少 8 個字元，並包含大寫字母、小寫字母和數字
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">確認新密碼</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="請再次輸入新密碼"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>重要提示：</strong>此為強制密碼修改，您必須修改密碼後才能繼續使用系統。請妥善保管您的新密碼。
            </p>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "更新中..." : "確認修改密碼"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
