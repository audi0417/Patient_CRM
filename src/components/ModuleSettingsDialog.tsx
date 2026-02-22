import { useState, useEffect, useCallback } from "react";
import { Settings, Loader2, Database, RefreshCw } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  clinicDashboard?: ModuleConfig;
}

interface AvailableModule {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  features: string[];
}

interface DataMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
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
  const [availableDataModes, setAvailableDataModes] = useState<DataMode[]>([]);
  const [selectedDataMode, setSelectedDataMode] = useState<string>('');
  const [fetchError, setFetchError] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
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

      // 獲取可用的數據記錄模式
      const dataModesRes = await fetch('/api/data-modes/admin/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (dataModesRes.ok) {
        const dataModesData = await dataModesRes.json();
        setAvailableDataModes(dataModesData);
      }

      // 獲取組織目前的數據記錄模式  
      const orgRes = await fetch(`/api/organizations/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (orgRes.ok) {
        const orgData = await orgRes.json();
        const settings = orgData.settings || {};
        const dataMode = settings.dataMode || {};
        setSelectedDataMode(dataMode.modeId || '');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "無法載入模組設定";
      console.error('獲取模組資料失敗:', error);
      setFetchError(errorMessage);
      toast({
        variant: "destructive",
        title: "載入失敗",
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId, toast]);

  useEffect(() => {
    if (open) {
      fetchData();
    } else {
      // 對話框關閉時重置錯誤狀態
      setFetchError('');
    }
  }, [open, fetchData]);

  const handleToggleModule = (moduleId: keyof OrganizationModules) => {
    setModules(prev => {
      const currentModule = prev[moduleId];
      const availableModule = availableModules[moduleId];
      
      // 如果模組不存在，使用可用模組的資訊初始化
      if (!currentModule) {
        return {
          ...prev,
          [moduleId]: {
            enabled: true,
            name: availableModule?.name || '',
            description: availableModule?.description,
            features: availableModule?.features || []
          }
        };
      }
      
      // 如果模組已存在，切換啟用狀態
      return {
        ...prev,
        [moduleId]: {
          ...currentModule,
          enabled: !currentModule.enabled,
          name: availableModule?.name || currentModule.name,
          description: availableModule?.description || currentModule.description,
          features: availableModule?.features || currentModule.features || []
        }
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = tokenManager.get();
      if (!token) {
        throw new Error('未登入');
      }

      // 先保存模組設定
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

      // 處理數據記錄模式的分配或清除
      if (selectedDataMode) {
        const dataModesResponse = await fetch('/api/data-modes/admin/assign', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            organizationId,
            modeId: selectedDataMode
          })
        });

        if (!dataModesResponse.ok) {
          const errorData = await dataModesResponse.json();
          console.warn('數據記錄模式分配失敗:', errorData);
          toast({
            variant: "default",
            title: "部分保存成功",
            description: "模組設定已更新，但數據記錄模式設定失敗"
          });
        } else {
          toast({
            title: "儲存成功",
            description: "模組設定和數據記錄模式已更新"
          });
        }
      } else {
        toast({
          title: "儲存成功",
          description: "模組設定已更新"
        });
      }

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
    'clinicDashboard',
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
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="text-destructive text-sm text-center">
              {fetchError}
            </div>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              重新載入
            </Button>
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
            
            {/* 數據記錄模式設定 */}
            <Separator />
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      數據記錄模式
                    </CardTitle>
                    <CardDescription className="text-sm">
                      為此組織分配合適的數據記錄模式，影響生命徵象欄位和追蹤目標類型
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <Label htmlFor="dataMode">選擇數據記錄模式</Label>
                  <Select value={selectedDataMode || 'none'} onValueChange={(value) => setSelectedDataMode(value === 'none' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇合適的數據記錄模式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">❌ 未設定</SelectItem>
                      {availableDataModes.map((mode) => (
                        <SelectItem key={mode.id} value={mode.id}>
                          {mode.icon} {mode.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedDataMode && availableDataModes.find(m => m.id === selectedDataMode) && (
                    <div className="rounded-md bg-muted p-3 space-y-1">
                      <div className="text-sm font-medium">
                        {availableDataModes.find(m => m.id === selectedDataMode)?.icon} {availableDataModes.find(m => m.id === selectedDataMode)?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {availableDataModes.find(m => m.id === selectedDataMode)?.description}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        類別: {availableDataModes.find(m => m.id === selectedDataMode)?.category}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
