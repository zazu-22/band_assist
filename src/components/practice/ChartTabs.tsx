import { memo } from 'react';
import { Guitar, FileText, File, Music2 } from 'lucide-react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';
import type { SongChart } from '@/types';

const CHART_ICON_MAP = {
  GP: Guitar,
  PDF: FileText,
  IMAGE: File,
  TEXT: Music2,
} as const;

export interface ChartTabsProps {
  charts: SongChart[];
  activeChartId: string | null;
  onSelectChart: (id: string) => void;
  /** ID of the panel controlled by these tabs (for ARIA compliance) */
  panelId?: string;
}

export const ChartTabs = memo(function ChartTabs({
  charts,
  activeChartId,
  onSelectChart,
  panelId,
}: ChartTabsProps) {
  if (charts.length === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-1.5"
      data-testid="chart-tabs"
      role="tablist"
      aria-label="Chart type selector"
    >
      <TooltipProvider delayDuration={100}>
        {charts.map((chart) => {
          const Icon = CHART_ICON_MAP[chart.type];
          const isActive = chart.id === activeChartId;

          return (
            <Tooltip key={chart.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectChart(chart.id)}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={panelId}
                  data-testid={`chart-tab-${chart.type}`}
                  className={cn(
                    'h-11 sm:h-8 px-3 gap-1.5 text-xs font-medium',
                    'border transition-colors motion-reduce:transition-none',
                    isActive
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon size={14} data-testid={`chart-icon-${chart.type}`} />
                  <span className="truncate max-w-[80px]">{chart.name}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{chart.name} ({chart.type})</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
});

ChartTabs.displayName = 'ChartTabs';
