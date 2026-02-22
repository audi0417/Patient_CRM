import { useState } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import OrganizationManagement from "./OrganizationManagement";
import SuperAdminHealthModes from "@/components/SuperAdminHealthModes";

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("organizations");

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">超級管理員控制台</h1>
        <p className="text-muted-foreground">
          管理系統組織和整體配置
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="organizations">組織管理</TabsTrigger>
          <TabsTrigger value="health-modes">健康模式</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations">
          <OrganizationManagement />
        </TabsContent>

        <TabsContent value="health-modes">
          <SuperAdminHealthModes />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminDashboard;
