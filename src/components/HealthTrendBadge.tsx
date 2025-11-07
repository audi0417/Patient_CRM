import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HealthTrendBadgeProps {
  current?: number;
  previous?: number;
  unit?: string;
}

const HealthTrendBadge = ({ current, previous, unit = "" }: HealthTrendBadgeProps) => {
  if (!current || !previous) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  const diff = current - previous;
  const percentChange = ((diff / previous) * 100).toFixed(1);

  if (Math.abs(diff) < 0.1) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{current}{unit}</span>
        <Badge variant="outline" className="gap-1">
          <Minus className="h-3 w-3" />
          持平
        </Badge>
      </div>
    );
  }

  const isIncrease = diff > 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{current}{unit}</span>
      <Badge 
        variant="outline" 
        className={`gap-1 ${isIncrease ? 'text-warning border-warning' : 'text-success border-success'}`}
      >
        {isIncrease ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        {Math.abs(parseFloat(percentChange))}%
      </Badge>
    </div>
  );
};

export default HealthTrendBadge;
