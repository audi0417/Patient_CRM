import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Settings, 
  CheckCircle2,
  BarChart3,
  Users,
  Building2,
  TrendingUp,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

interface DataRecordingMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  organizationCount?: number;
  organizations?: Array<{
    id: string;
    name: string;
    slug: string;
    plan: string;
    createdAt: string;
  }>;
}

interface Analytics {
  modeId: string;
  modeName: string;
  modeIcon: string;
  category: string;
  stats: {
    organizations: number;
    users: number;
    patients: number;
    newOrganizationsThisMonth: number;
  };
}

const SuperAdminDataRecordingModes = () => {
  const [dataRecordingModes, setDataRecordingModes] = useState<DataRecordingMode[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<DataRecordingMode | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignTargetOrg, setAssignTargetOrg] = useState('');
  const [assignSelectedMode, setAssignSelectedMode] = useState('');

  // 載入數據記錄模式列表和分析數據
  useEffect(() => {
    loadDataRecordingModes();
    loadAnalytics();
  }, []);

  const loadDataRecordingModes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/superadmin/data-recording-modes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDataRecordingModes(data);
      } else {
        toast.error('載入數據記錄模式失敗');
      }
    } catch (error) {
      console.error('Load data recording modes error:', error);
      toast.error('載入數據記錄模式失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/superadmin/data-recording-modes/usage/analytics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Load analytics error:', error);
    }
  };

  const loadModeDetail = async (modeId: string) => {
    try {
      const response = await fetch(`/api/superadmin/data-recording-modes/${modeId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedMode(data);
      }
    } catch (error) {
      console.error('Load mode detail error:', error);
    }
  };

  const assignModeToOrganization = async () => {
    if (!assignTargetOrg || !assignSelectedMode) {
      toast.error('請填寫完整資訊');
      return;
    }

    try {
      const response = await fetch(`/api/superadmin/organizations/${assignTargetOrg}/data-recording-mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          modeId: assignSelectedMode
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`已成功為組織 ${assignTargetOrg} 設定數據記錄模式`);
        setAssignTargetOrg('');
        setAssignSelectedMode('');
        setShowAssignDialog(false);
        
        // 重新載入分析數據
        loadAnalytics();
      } else {
        const error = await response.json();
        toast.error(error.error || '分配模式失敗');
      }
    } catch (error) {
      console.error('Assign mode error:', error);
      toast.error('分配模式失敗');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      wellness: 'bg-green-500',
      medical: 'bg-blue-500',
      fitness: 'bg-orange-500',
      care: 'bg-purple-500',
      rehabilitation: 'bg-pink-500',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500';
  };

  const totalStats = analytics.reduce((acc, curr) => ({
    organizations: acc.organizations + curr.stats.organizations,
    users: acc.users + curr.stats.users,
    patients: acc.patients + curr.stats.patients,
    newOrganizationsThisMonth: acc.newOrganizationsThisMonth + curr.stats.newOrganizationsThisMonth
  }), { organizations: 0, users: 0, patients: 0, newOrganizationsThisMonth: 0 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Settings className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題和操作 */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">數據記錄模式管理</h1>
          <p className="text-muted-foreground mt-2">
            管理系統預設的數據記錄模式，並為組織分配適合的模式
          </p>
        </div>
        
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogTrigger asChild>
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              分配模式
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>為組織分配數據記錄模式</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="orgId">組織 ID</Label>
                <Input
                  id="orgId"
                  placeholder="輸入組織 ID"
                  value={assignTargetOrg}
                  onChange={(e) => setAssignTargetOrg(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mode">數據記錄模式</Label>
                <Select value={assignSelectedMode} onValueChange={setAssignSelectedMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇模式" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataRecordingModes.map((mode) => (
                      <SelectItem key={mode.id} value={mode.id}>
                        <div className="flex items-center gap-2">
                          <span>{mode.icon}</span>
                          <span>{mode.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={assignModeToOrganization} className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                分配模式
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 總覽統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">總組織數</p>
                <p className="text-2xl font-bold">{totalStats.organizations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">總用戶數</p>
                <p className="text-2xl font-bold">{totalStats.users}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Database className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">總患者數</p>
                <p className="text-2xl font-bold">{totalStats.patients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">本月新增</p>
                <p className="text-2xl font-bold">{totalStats.newOrganizationsThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="modes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modes">數據記錄模式</TabsTrigger>
          <TabsTrigger value="analytics">使用分析</TabsTrigger>
        </TabsList>

        <TabsContent value="modes" className="space-y-4">
          {/* 數據記錄模式列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dataRecordingModes.map((mode) => (
              <Card 
                key={mode.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => loadModeDetail(mode.id)}
              >
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{mode.icon}</span>
                        <div>
                          <h3 className="font-semibold">{mode.name}</h3>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getCategoryColor(mode.category)}`}
                          >
                            {mode.category}
                          </Badge>
                        </div>
                      </div>
                      {mode.organizationCount !== undefined && (
                        <Badge variant="outline">
                          {mode.organizationCount} 組織
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {mode.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 模式詳細資訊對話框 */}
          <Dialog open={!!selectedMode} onOpenChange={() => setSelectedMode(null)}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              {selectedMode && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <span className="text-2xl">{selectedMode.icon}</span>
                      {selectedMode.name}
                      <Badge variant="secondary">{selectedMode.category}</Badge>
                    </DialogTitle>
                    <DialogDescription>
                      {selectedMode.description}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {selectedMode.organizations && selectedMode.organizations.length > 0 ? (
                      <>
                        <h4 className="font-medium">使用此模式的組織 ({selectedMode.organizations.length})</h4>
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>組織名稱</TableHead>
                                <TableHead>方案</TableHead>
                                <TableHead>建立日期</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedMode.organizations.map((org) => (
                                <TableRow key={org.id}>
                                  <TableCell className="font-medium">{org.name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{org.plan}</Badge>
                                  </TableCell>
                                  <TableCell>{new Date(org.createdAt).toLocaleDateString()}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Building2 className="h-12 w-12 mx-auto mb-4" />
                        <p>暫無組織使用此模式</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* 使用分析 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {analytics.map((analytic) => (
              <Card key={analytic.modeId}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>{analytic.modeIcon}</span>
                    {analytic.modeName}
                    <Badge variant="outline">{analytic.category}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-500">{analytic.stats.organizations}</p>
                      <p className="text-sm text-muted-foreground">組織</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-500">{analytic.stats.users}</p>
                      <p className="text-sm text-muted-foreground">用戶</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-500">{analytic.stats.patients}</p>
                      <p className="text-sm text-muted-foreground">患者</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-500">{analytic.stats.newOrganizationsThisMonth}</p>
                      <p className="text-sm text-muted-foreground">本月新增</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminDataRecordingModes;