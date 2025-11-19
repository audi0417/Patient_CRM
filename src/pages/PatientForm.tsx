import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Save, X, Plus, Tag as TagIcon, Users, ChevronDown, Loader2 } from "lucide-react";
import { getPatients, savePatient, getGroups } from "@/lib/storage";
import { Patient, PatientGroup } from "@/types/patient";
import { toast } from "sonner";

const PatientForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = id !== "new";

  const [formData, setFormData] = useState<Partial<Patient>>({
    name: "",
    gender: "male",
    birthDate: "",
    phone: "",
    email: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    bloodType: "",
    allergies: [],
    tags: [],
    groups: [],
  });

  const [availableGroups, setAvailableGroups] = useState<PatientGroup[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Load groups
      const groups = await getGroups();
      setAvailableGroups(groups);

      // Load patient if editing
      if (isEdit && id) {
        const patients = await getPatients();
        const patient = patients.find((p) => p.id === id);
        if (patient) {
          setFormData({
            ...patient,
            tags: patient.tags || [],
            groups: patient.groups || [],
          });
        }
      }
    };
    loadData();
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.birthDate || !formData.phone) {
      toast.error("請填寫必填欄位");
      return;
    }

    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const patient: Patient = {
        id: isEdit && id ? id : '', // Empty ID for new patients - let backend generate it
        name: formData.name,
        gender: formData.gender as "male" | "female" | "other",
        birthDate: formData.birthDate,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        emergencyPhone: formData.emergencyPhone,
        bloodType: formData.bloodType,
        allergies: formData.allergies || [],
        tags: formData.tags || [],
        groups: formData.groups || [],
        createdAt: isEdit && formData.createdAt ? formData.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await savePatient(patient);
      toast.success(isEdit ? "患者資料已更新" : "患者已新增");
      navigate("/");
    } catch (error: any) {
      console.error("保存患者資料失敗:", error);

      // 檢查是否為配額或訂閱錯誤
      const errorMessage = error?.message || error?.error || (isEdit ? "更新患者資料失敗" : "新增患者失敗");

      if (errorMessage.includes("配額") || errorMessage.includes("QUOTA_EXCEEDED")) {
        toast.error("已達到患者數量上限，請聯繫管理員升級方案");
      } else if (errorMessage.includes("訂閱") || errorMessage.includes("SUBSCRIPTION_EXPIRED")) {
        toast.error("訂閱已過期，請聯繫管理員續訂");
      } else {
        toast.error(errorMessage);
      }

      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[90vw] py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {isEdit ? "編輯患者資料" : "新增患者"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    姓名 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">
                    性別 <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gender: value as "male" | "female" | "other" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">男性</SelectItem>
                      <SelectItem value="female">女性</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">
                    出生日期 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) =>
                      setFormData({ ...formData, birthDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    電話 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">電子郵件</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bloodType">血型</Label>
                  <Select
                    value={formData.bloodType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, bloodType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="請選擇" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A型</SelectItem>
                      <SelectItem value="B">B型</SelectItem>
                      <SelectItem value="AB">AB型</SelectItem>
                      <SelectItem value="O">O型</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">地址</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">緊急聯絡人</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContact: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">緊急聯絡電話</Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    value={formData.emergencyPhone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyPhone: e.target.value,
                      })
                    }
                  />
                </div>

                {/* 標籤輸入 */}
                <div className="space-y-3 md:col-span-2">
                  <Label className="flex items-center gap-2 text-base font-semibold">
                    <TagIcon className="h-4 w-4" />
                    標籤（自由輸入）
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    輸入標籤名稱後按 Enter 或點擊「新增」按鈕
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          const trimmedTag = newTagInput.trim();
                          if (trimmedTag && !formData.tags?.includes(trimmedTag)) {
                            setFormData({
                              ...formData,
                              tags: [...(formData.tags || []), trimmedTag],
                            });
                            toast.success(`已新增標籤：${trimmedTag}`);
                          } else if (trimmedTag && formData.tags?.includes(trimmedTag)) {
                            toast.warning("此標籤已存在");
                          }
                          setNewTagInput("");
                        }
                      }}
                      placeholder="例如：高血壓、糖尿病、素食者"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const trimmedTag = newTagInput.trim();
                        if (trimmedTag && !formData.tags?.includes(trimmedTag)) {
                          setFormData({
                            ...formData,
                            tags: [...(formData.tags || []), trimmedTag],
                          });
                          toast.success(`已新增標籤：${trimmedTag}`);
                        } else if (trimmedTag && formData.tags?.includes(trimmedTag)) {
                          toast.warning("此標籤已存在");
                        }
                        setNewTagInput("");
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      新增
                    </Button>
                  </div>
                  {/* 顯示已新增的標籤 */}
                  {formData.tags && formData.tags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        已新增的標籤 ({formData.tags.length})
                      </Label>
                      <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border border-border min-h-[60px]">
                        {formData.tags.map((tagName, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="gap-2 px-3 py-1.5 text-sm font-medium hover:bg-secondary/80 transition-colors"
                          >
                            <TagIcon className="h-3 w-3" />
                            {tagName}
                            <X
                              className="h-3.5 w-3.5 cursor-pointer hover:text-destructive transition-colors"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  tags: formData.tags?.filter((t) => t !== tagName),
                                });
                                toast.info(`已移除標籤：${tagName}`);
                              }}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!formData.tags || formData.tags.length === 0) && (
                    <div className="p-3 bg-muted/30 rounded-lg border border-dashed border-border text-center">
                      <p className="text-sm text-muted-foreground">尚未新增任何標籤</p>
                    </div>
                  )}
                </div>

                {/* 群組選擇 */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    所屬群組
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between text-left font-normal"
                      >
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {formData.groups && formData.groups.length > 0
                            ? `已選擇 ${formData.groups.length} 個群組`
                            : "選擇群組（可多選）"}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <div className="max-h-[300px] overflow-y-auto">
                        {availableGroups.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground text-center">
                            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p>尚未建立任何群組</p>
                            <p className="text-xs mt-1">請先至系統設定建立群組</p>
                          </div>
                        ) : (
                          <div className="p-2">
                            {availableGroups.map((group) => {
                              const isChecked = formData.groups?.includes(group.id) || false;
                              return (
                                <div
                                  key={group.id}
                                  className="flex items-center gap-3 px-3 py-2 hover:bg-accent rounded-md cursor-pointer transition-colors"
                                  onClick={() => {
                                    const newGroups = isChecked
                                      ? formData.groups?.filter((g) => g !== group.id)
                                      : [...(formData.groups || []), group.id];
                                    setFormData({
                                      ...formData,
                                      groups: newGroups,
                                    });
                                  }}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      const newGroups = checked
                                        ? [...(formData.groups || []), group.id]
                                        : formData.groups?.filter((g) => g !== group.id);
                                      setFormData({
                                        ...formData,
                                        groups: newGroups,
                                      });
                                    }}
                                  />
                                  <div
                                    className="h-3 w-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: group.color }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{group.name}</p>
                                    {group.description && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {group.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {/* 顯示已選擇的群組 */}
                  {formData.groups && formData.groups.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        已選擇的群組 ({formData.groups.length})
                      </Label>
                      <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border border-border min-h-[60px]">
                        {formData.groups.map((groupId) => {
                          const group = availableGroups.find((g) => g.id === groupId);
                          if (!group) return null;
                          return (
                            <Badge
                              key={groupId}
                              variant="secondary"
                              className="gap-2 px-3 py-1.5 text-sm font-medium hover:bg-secondary/80 transition-colors"
                            >
                              <div
                                className="h-3 w-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: group.color }}
                              />
                              {group.name}
                              <X
                                className="h-3.5 w-3.5 cursor-pointer hover:text-destructive transition-colors"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    groups: formData.groups?.filter((g) => g !== groupId),
                                  });
                                  toast.info(`已移除群組：${group.name}`);
                                }}
                              />
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {(!formData.groups || formData.groups.length === 0) && (
                    <div className="p-3 bg-muted/30 rounded-lg border border-dashed border-border text-center">
                      <p className="text-sm text-muted-foreground">尚未選擇任何群組</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEdit ? "更新中..." : "新增中..."}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      儲存
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientForm;
