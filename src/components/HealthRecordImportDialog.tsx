import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Edit, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface HealthRecordImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onManualEntry: () => void;
  onImportExcel: (file: File) => void;
  recordType: "bodyComposition" | "vitalSigns";
}

const HealthRecordImportDialog = ({
  open,
  onOpenChange,
  onManualEntry,
  onImportExcel,
  recordType,
}: HealthRecordImportDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const recordTypeText = recordType === "bodyComposition" ? "體組成記錄" : "營養記錄";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.xlsx')) {
      setSelectedFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.xlsx')) {
      setSelectedFile(file);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      onImportExcel(selectedFile);
      setSelectedFile(null);
      onOpenChange(false);
    }
  };

  const handleManualEntry = () => {
    onManualEntry();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>新增{recordTypeText}</DialogTitle>
          <DialogDescription>
            選擇新增方式：手動輸入單筆記錄，或批次匯入 Excel 檔案
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* 手動輸入選項 */}
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={handleManualEntry}>
            <CardContent className="pt-6 pb-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Edit className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">手動輸入</h3>
                  <p className="text-sm text-muted-foreground">
                    使用表單輸入單筆記錄
                  </p>
                </div>
                <Button className="w-full mt-2">
                  開始輸入
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 匯入 Excel 選項 */}
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                  <FileSpreadsheet className="h-8 w-8 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">匯入 Excel</h3>
                  <p className="text-sm text-muted-foreground">
                    批次匯入多筆記錄
                  </p>
                </div>

                {/* 檔案上傳區域 */}
                <div
                  className={`w-full mt-2 border-2 border-dashed rounded-lg p-4 transition-colors ${
                    dragActive ? 'border-primary bg-primary/5' : 'border-muted'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="excel-upload"
                    accept=".xlsx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="excel-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    {selectedFile ? (
                      <div className="text-sm">
                        <p className="font-medium text-primary">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">點擊更換檔案</p>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        <p>拖放檔案到此處</p>
                        <p className="text-xs">或點擊選擇 Excel 檔案</p>
                      </div>
                    )}
                  </label>
                </div>

                <Button
                  variant="default"
                  className="w-full"
                  disabled={!selectedFile}
                  onClick={handleImport}
                >
                  {selectedFile ? '開始匯入' : '請選擇檔案'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 提示訊息 */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Excel 格式說明：</strong>
            <ul className="list-disc list-inside mt-2 text-sm space-y-1">
              <li>請使用「導出 Excel」功能下載範本格式</li>
              <li>確保欄位名稱與範本一致</li>
              <li>日期格式：YYYY-MM-DD（例如：2025-01-15）</li>
              <li>數值欄位請填入數字，空值可留空</li>
            </ul>
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
};

export default HealthRecordImportDialog;
