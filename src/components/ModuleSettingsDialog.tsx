import { useState, useEffect, useCallback } from "react";
import { Settings, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { tokenManager } from "@/lib/api";

interface ModuleConfig {
  enabled: boolean;
  name: string;
  description?: string;
  features?: string[];
}

interface OrganizationModules {
  healthManagement?: ModuleConfig;
  appointments?: ModuleConfig;
  lineMessaging?: ModuleConfig;
  treatmentPackages?: ModuleConfig;
}

interface AvailableModule {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  features: string[];
}

interface ModuleSettingsDialogProps {
  organizationId: string;
  organizationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ModuleSettingsDialog({
  organizationId,
  organizationName,
  open,
  onOpenChange,
  onSuccess
}: ModuleSettingsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableModules, setAvailableModules] = useState<Record<string, AvailableModule>>({});
  const [modules, setModules] = useState<OrganizationModules>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = tokenManager.get();
      if (!token) {
        throw new Error('未登入');
      }

      // 獲取可用模組列表
      const availableRes = await fetch('/api/organizations/modules/available', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!availableRes.ok) {
        throw new Error('無法獲取可用模組列表');
      }

      const availableData = await availableRes.json();
      setAvailableModules(availableData.modules);

      // 獲取組織目前的模組配置
      const modulesRes = await fetch(`/api/organizations/${organizationId}/modules`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!modulesRes.ok) {
        throw new Error('無法獲取組織模組配置');
      }

      const modulesData = await modulesRes.json();
      setModules(modulesData.modules || {});
    } catch (error: unknown) {
      console.error('獲取模組資料失敗:', error);
      toast({
        variant: "destructive",
        title: "載入失敗",
        description: error instanceof Error ? error.message : "無法載入模組設定"
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId, toast]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  const handleToggleModule = (moduleId: keyof OrganizationModules) => {
    setModules(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        enabled: !prev[moduleId]?.enabled,
        name: availableModules[moduleId]?.name || prev[moduleId]?.name || '',
        description: availableModules[moduleId]?.description,
        features: availableModules[moduleId]?.features || prev[moduleId]?.features || []
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = tokenManager.get();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await fetch(`/api/organizations/${organizationId}/modules`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modules })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '儲存失敗');
      }

      toast({
        title: "儲存成功",
        description: "模組設定已更新"
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('儲存模組設定失敗:', error);
      toast({
        variant: "destructive",
        title: "儲存失敗",
        description: error instanceof Error ? error.message : "無法儲存模組設定"
      });
    } finally {
      setSaving(false);
    }
  };

  const moduleOrder: (keyof OrganizationModules)[] = [
    'healthManagement',
    'appointments',
    'lineMessaging',
    'treatmentPackages'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            模組設定 - {organizationName}
          </DialogTitle>
          <DialogDescription>
            設定此組織可使用的功能模組
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {moduleOrder.map((moduleId) => {
              const available = availableModules[moduleId];
              const current = modules[moduleId];

              if (!available) return null;

              return (
                <Card key={moduleId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {available.name}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {available.description}
                        </CardDescription>
                      </div>
                      <Switch
                        checked={current?.enabled ?? available.defaultEnabled}
                        onCheckedChange={() => handleToggleModule(moduleId)}
                      />
                    </div>
                  </CardHeader>
                  {available.features && available.features.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="text-xs text-muted-foreground">
                        包含功能: {available.features.join(', ')}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            儲存設定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
