import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  Building, 
  Users, 
  TrendingUp,
  Palette,
  Gauge,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface DataMode {
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

const SuperAdminDataModes = () => {
  const [dataModes, setDataModes] = useState<DataMode[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<DataMode | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignTargetOrg, setAssignTargetOrg] = useState('');
  const [assignSelectedMode, setAssignSelectedMode] = useState('');

  // 載入數據模式列表和分析數據
  useEffect(() => {
    loadDataModes();
    loadAnalytics();
  }, []);

  const loadDataModes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/data-modes/admin/all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDataModes(data);
      } else {
        toast.error('載入數據模式失敗');
      }
    } catch (error) {
      console.error('Load data modes error:', error);
      toast.error('載入數據模式失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/data-modes/admin/analytics', {
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
      const response = await fetch(`/api/data-modes/admin/${modeId}`, {
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
      const response = await fetch('/api/data-modes/admin/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          organizationId: assignTargetOrg,
          modeId: assignSelectedMode
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setShowAssignDialog(false);
        setAssignTargetOrg('');
        setAssignSelectedMode('');
        loadDataModes();
        loadAnalytics();
      } else {
        const error = await response.json();
        toast.error(error.error || '設定失敗');
      }
    } catch (error) {
      console.error('Assign mode error:', error);
      toast.error('設定數據模式失敗');
    }
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

  const getTotalStats = () => {
    return analytics.reduce(
      (acc, curr) => ({
        organizations: acc.organizations + curr.stats.organizations,
        users: acc.users + curr.stats.users,
        patients: acc.patients + curr.stats.patients,
      }),
      { organizations: 0, users: 0, patients: 0 }
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Gauge className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">載入數據記錄模式設定...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalStats = getTotalStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
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
                    {dataModes.map((mode) => (
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
                確認分配
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Palette className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">可用模式</p>
                <p className="text-2xl font-bold">{dataModes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Building className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">使用組織</p>
                <p className="text-2xl font-bold">{totalStats.organizations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-green-500" />
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
              <TrendingUp className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">總患者數</p>
                <p className="text-2xl font-bold">{totalStats.patients}</p>
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
          {/* 數據模式列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataModes.map((mode) => (
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
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label className="text-sm font-medium">描述</Label>
                      <p className="text-sm text-muted-foreground">{selectedMode.description}</p>
                    </div>
                    
                    {selectedMode.organizations && selectedMode.organizations.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">使用此模式的組織</Label>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>組織名稱</TableHead>
                              <TableHead>方案</TableHead>
                              <TableHead>建立時間</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedMode.organizations.map((org) => (
                              <TableRow key={org.id}>
                                <TableCell>{org.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{org.plan}</Badge>
                                </TableCell>
                                <TableCell>
                                  {new Date(org.createdAt).toLocaleDateString('zh-TW')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* 使用分析表格 */}
          <Card>
            <CardHeader>
              <CardTitle>模式使用統計</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模式</TableHead>
                    <TableHead>類別</TableHead>
                    <TableHead>組織數</TableHead>
                    <TableHead>用戶數</TableHead>
                    <TableHead>患者數</TableHead>
                    <TableHead>本月新增</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.map((item) => (
                    <TableRow key={item.modeId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{item.modeIcon}</span>
                          <span className="font-medium">{item.modeName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={getCategoryColor(item.category)}
                        >
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.stats.organizations}</TableCell>
                      <TableCell>{item.stats.users}</TableCell>
                      <TableCell>{item.stats.patients}</TableCell>
                      <TableCell>
                        {item.stats.newOrganizationsThisMonth > 0 && (
                          <Badge variant="outline" className="text-green-600">
                            +{item.stats.newOrganizationsThisMonth}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminDataModes;