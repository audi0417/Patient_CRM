import { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Settings,
  Palette,
  MessageSquare,
  Shield,
} from 'lucide-react';
import OrganizationDataRecordingSettings from '@/components/OrganizationDataRecordingSettings';
import LineSettings from './LineSettings';

const OrganizationSettings = () => {
  const [activeTab, setActiveTab] = useState("data-mode");

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">組織設定</h1>
        <p className="text-muted-foreground">
          管理組織的數據記錄模式、LINE 整合和其他系統設定
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="data-mode" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            數據記錄模式
          </TabsTrigger>
          <TabsTrigger value="line" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            LINE 整合
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            一般設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data-mode">
          <OrganizationDataRecordingSettings />
        </TabsContent>

        <TabsContent value="line">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                LINE 設定
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LineSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                一般設定
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4" />
                  <p>一般設定功能將在未來版本中提供</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrganizationSettings;