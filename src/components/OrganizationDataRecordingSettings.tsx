import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { 
  Settings, 
  Save, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Palette,
  Edit3,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

interface DataRecordingMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  vitalSignsMapping: {
    [key: string]: {
      label: string;
      unit: string;
      normalRange?: string;
    };
  };
  goalCategories: Array<{
    value: string;
    label: string;
    unit: string;
  }>;
  chartTitles: {
    vitalSigns: string;
    dashboard: string;
    records: string;
  };
}

interface OrganizationDataMode {
  modeId: string;
  modeName: string;
  customizations: {
    vitalSignsMapping?: {
      [key: string]: {
        label: string;
        unit: string;
        normalRange?: string;
      };
    };
    goalCategories?: Array<{
      value: string;
      label: string;
      unit: string;
    }>;
    chartTitles?: {
      vitalSigns: string;
      dashboard: string;
      records: string;
    };
  };
}

const OrganizationDataRecordingSettings = () => {
  const [availableModes, setAvailableModes] = useState<DataRecordingMode[]>([]);
  const [currentMode, setCurrentMode] = useState<OrganizationDataMode | null>(null);
  const [selectedMode, setSelectedMode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [customizations, setCustomizations] = useState<OrganizationDataMode['customizations']>({});

  // 載入可用的數據記錄模式和當前設定
  useEffect(() => {
    loadAvailableModes();
    loadCurrentMode();
  }, []);

  const loadAvailableModes = async () => {
    try {
      const response = await fetch('/api/organizations/me/data-recording-modes/available', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableModes(data);
      }
    } catch (error) {
      console.error('Load available modes error:', error);
    }
  };

  const loadCurrentMode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/organizations/me/data-recording-mode', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentMode({
          modeId: data.dataRecordingMode || 'nutrition',
          modeName: data.modeConfig?.name || '營養管理',
          customizations: data.customizations || {}
        });
        setCustomizations(data.customizations || {});
      }
    } catch (error) {
      console.error('Load current mode error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = async (modeId: string) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/organizations/me/data-recording-mode', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ dataRecordingMode: modeId })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('數據記錄模式已切換');
        setCurrentMode({
          modeId: data.dataRecordingMode || modeId,
          modeName: data.modeConfig?.name || '營養管理',
          customizations: data.customizations || {}
        });
        setCustomizations(data.customizations || {});
        setSelectedMode('');
      } else {
        const error = await response.json();
        toast.error(error.error || '切換模式失敗');
      }
    } catch (error) {
      console.error('Switch mode error:', error);
      toast.error('切換模式失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const saveCustomizations = async () => {
    if (!currentMode) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/organizations/me/data-recording-mode', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          dataRecordingMode: currentMode.modeId,
          customizations 
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('自定義設定已保存');
        setCurrentMode({
          ...currentMode,
          customizations: data.customizations || {}
        });
        setShowCustomizeDialog(false);
      } else {
        const error = await response.json();
        toast.error(error.error || '保存設定失敗');
      }
    } catch (error) {
      console.error('Save customizations error:', error);
      toast.error('保存設定失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = async () => {
    if (!currentMode) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/organizations/me/data-recording-mode/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('已重置為預設設定');
        setCurrentMode({
          modeId: data.dataRecordingMode || 'nutrition',
          modeName: data.modeConfig?.name || '營養管理',
          customizations: {}
        });
        setCustomizations({});
        setShowCustomizeDialog(false);
      } else {
        const error = await response.json();
        toast.error(error.error || '重置失敗');
      }
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('重置失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const updateCustomization = (section: string, key: string, value: string) => {
    setCustomizations(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      wellness: 'bg-green-100 text-green-800',
      medical: 'bg-blue-100 text-blue-800', 
      fitness: 'bg-orange-100 text-orange-800',
      care: 'bg-purple-100 text-purple-800',
      rehabilitation: 'bg-pink-100 text-pink-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Settings className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">載入數據記錄模式設定...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 當前模式狀態 */}
      {currentMode ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                目前數據記錄模式
              </div>
              <div className="flex gap-2">
                <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Edit3 className="h-4 w-4 mr-2" />
                      自定義
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>自定義數據記錄模式</DialogTitle>
                      <DialogDescription>
                        自定義欄位標籤、單位和圖表標題以符合您的組織需求
                      </DialogDescription>
                    </DialogHeader>
                    
                    {/* 生命徵象自定義 */}
                    <div className="space-y-4 py-4">
                      <div>
                        <h4 className="font-medium mb-3">數據欄位</h4>
                        <div className="grid grid-cols-1 gap-4">
                          {availableModes.find(m => m.id === currentMode?.modeId)?.vitalSignsMapping && 
                           Object.entries(availableModes.find(m => m.id === currentMode?.modeId)!.vitalSignsMapping).map(([key, field]) => (
                            <Card key={key} className="p-4">
                              <div className="space-y-3">
                                <h5 className="font-medium text-sm">{key}</h5>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">欄位標籤</Label>
                                    <Input
                                      placeholder={field.label}
                                      defaultValue={customizations.vitalSignsMapping?.[key]?.label || ''}
                                      onChange={(e) => updateCustomization('vitalSignsMapping', `${key}.label`, e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">單位</Label>
                                    <Input
                                      placeholder={field.unit}
                                      defaultValue={customizations.vitalSignsMapping?.[key]?.unit || ''}
                                      onChange={(e) => updateCustomization('vitalSignsMapping', `${key}.unit`, e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>

                      {/* 圖表標題自定義 */}
                      <div>
                        <h4 className="font-medium mb-3">圖表標題</h4>
                        <div className="grid grid-cols-1 gap-3">
                          {['vitalSigns', 'dashboard', 'records'].map((title) => (
                            <div key={title}>
                              <Label className="text-sm capitalize">{title}</Label>
                              <Input
                                defaultValue={customizations.chartTitles?.[title as keyof typeof customizations.chartTitles] || ''}
                                onChange={(e) => updateCustomization('chartTitles', title, e.target.value)}
                                className="mt-1"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={resetToDefault} disabled={isSaving}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        重置為預設
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowCustomizeDialog(false)}>
                          取消
                        </Button>
                        <Button onClick={saveCustomizations} disabled={isSaving}>
                          <Save className="h-4 w-4 mr-2" />
                          {isSaving ? '保存中...' : '保存設定'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <span className="text-3xl">{availableModes.find(m => m.id === currentMode.modeId)?.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{currentMode.modeName}</h3>
                <Badge className={getCategoryColor(availableModes.find(m => m.id === currentMode.modeId)?.category || '')}>
                  {availableModes.find(m => m.id === currentMode.modeId)?.category}
                </Badge>
                <p className="text-muted-foreground mt-2">
                  {availableModes.find(m => m.id === currentMode.modeId)?.description}
                </p>
                
                {Object.keys(currentMode.customizations || {}).length > 0 && (
                  <Alert className="mt-4">
                    <Palette className="h-4 w-4" />
                    <AlertDescription>
                      此模式已進行自定義設定
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            尚未設定數據記錄模式，請聯繫系統管理員進行設定
          </AlertDescription>
        </Alert>
      )}

      {/* 可用模式切換 */}
      {availableModes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>切換數據記錄模式</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Select value={selectedMode} onValueChange={setSelectedMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇數據記錄模式" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModes.map((mode) => (
                      <SelectItem key={mode.id} value={mode.id}>
                        <div className="flex items-center gap-2">
                          <span>{mode.icon}</span>
                          <span>{mode.name}</span>
                          <Badge 
                            variant="outline" 
                            className={getCategoryColor(mode.category)}
                          >
                            {mode.category}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => switchMode(selectedMode)} 
                disabled={!selectedMode || selectedMode === currentMode?.modeId || isSaving}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isSaving ? '切換中...' : '切換模式'}
              </Button>
            </div>

            {/* 模式預覽 */}
            {selectedMode && selectedMode !== currentMode?.modeId && (
              <div className="border rounded-lg p-4 bg-muted/30">
                {(() => {
                  const mode = availableModes.find(m => m.id === selectedMode);
                  return mode ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{mode.icon}</span>
                        <h4 className="font-medium">{mode.name}</h4>
                        <Badge className={getCategoryColor(mode.category)}>
                          {mode.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {mode.description}
                      </p>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrganizationDataRecordingSettings;