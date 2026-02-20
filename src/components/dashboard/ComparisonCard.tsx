import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ComparisonCardProps {
  title: string;
  currentValue: number;
  previousValue: number;
  unit?: string;
  format?: 'number' | 'percentage' | 'currency';
  reverseColor?: boolean; // 是否反轉顯示顏色（如取消率越高越差）
}

export default function ComparisonCard({ 
  title, 
  currentValue, 
  previousValue, 
  unit = '',
  format = 'number',
  reverseColor = false
}: ComparisonCardProps) {
  // 計算變化
  const diff = currentValue - previousValue;
  const percentChange = previousValue > 0 
    ? ((diff / previousValue) * 100).toFixed(1)
    : currentValue > 0 ? '100' : '0';
  
  const isPositive = diff > 0;
  const isNeutral = diff === 0;
  
  // 決定顏色（考慮是否反轉）
  const colorClass = isNeutral 
    ? 'text-gray-600'
    : (reverseColor ? !isPositive : isPositive) 
      ? 'text-green-600' 
      : 'text-red-600';
      
  const bgColorClass = isNeutral
    ? 'bg-gray-50'
    : (reverseColor ? !isPositive : isPositive)
      ? 'bg-green-50'
      : 'bg-red-50';

  // 格式化數值
  const formatValue = (value: number) => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `NT$ ${value.toLocaleString()}`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* 當前數值 */}
          <div>
            <p className="text-3xl font-bold">
              {formatValue(currentValue)}{unit}
            </p>
          </div>

          {/* 對比資訊 */}
          <div className={`flex items-center justify-between p-3 rounded-lg ${bgColorClass}`}>
            <div className="flex items-center gap-2">
              {isNeutral ? (
                <Minus className="h-4 w-4 text-gray-600" />
              ) : isPositive ? (
                <TrendingUp className={`h-4 w-4 ${colorClass}`} />
              ) : (
                <TrendingDown className={`h-4 w-4 ${colorClass}`} />
              )}
              <span className={`text-sm font-medium ${colorClass}`}>
                {isNeutral ? '持平' : `${isPositive ? '+' : ''}${percentChange}%`}
              </span>
            </div>
            <Badge variant="outline" className="bg-white text-xs">
              相較上期
            </Badge>
          </div>

          {/* 上期數值 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>上期數值</span>
            <span className="font-medium">{formatValue(previousValue)}{unit}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
