import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, Eye, EyeOff } from "lucide-react";
import { changePassword } from "@/lib/auth";
import { toast } from "sonner";

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 驗證表單
    if (!formData.oldPassword || !formData.newPassword || !formData.confirmPassword) {
      setError("請填寫所有欄位");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("新密碼與確認密碼不一致");
      return;
    }

    if (formData.newPassword === formData.oldPassword) {
      setError("新密碼不能與舊密碼相同");
      return;
    }

    setLoading(true);

    try {
      const result = await changePassword(formData.oldPassword, formData.newPassword);

      if (result.success) {
        toast.success("密碼已成功更新");
        setOpen(false);
        setFormData({
          oldPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setError(result.message || "密碼更新失敗");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "密碼更新失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Key className="mr-2 h-4 w-4" />
          修改密碼
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>修改密碼</DialogTitle>
          <DialogDescription>
            請輸入您的舊密碼和新密碼。新密碼必須至少8個字元，並包含大寫字母、小寫字母和數字。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 舊密碼 */}
            <div className="space-y-2">
              <Label htmlFor="oldPassword">舊密碼</Label>
              <div className="relative">
                <Input
                  id="oldPassword"
                  type={showOldPassword ? "text" : "password"}
                  value={formData.oldPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, oldPassword: e.target.value }))
                  }
                  placeholder="請輸入舊密碼"
                  disabled={loading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  disabled={loading}
                >
                  {showOldPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* 新密碼 */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">新密碼</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  placeholder="請輸入新密碼"
                  disabled={loading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={loading}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                至少8個字元，需包含大寫字母、小寫字母和數字
              </p>
            </div>

            {/* 確認新密碼 */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">確認新密碼</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  placeholder="請再次輸入新密碼"
                  disabled={loading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "更新中..." : "更新密碼"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
