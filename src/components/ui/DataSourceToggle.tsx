import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Database, Layers, Zap, ChevronDown, Check } from 'lucide-react';
import { useDataSource, DataSource } from '@/contexts/DataSourceContext';
import { cn } from '@/lib/utils';

interface DataSourceToggleProps {
  className?: string;
  compact?: boolean;
}

const sourceConfig: Record<DataSource, { label: string; icon: typeof Database; description: string }> = {
  zerion: {
    label: 'Zerion',
    icon: Layers,
    description: 'DeFi positions, NFTs & PnL tracking',
  },
  okx: {
    label: 'OKX DEX',
    icon: Zap,
    description: 'Multi-chain token balances',
  },
  hybrid: {
    label: 'Hybrid',
    icon: Database,
    description: 'Best of both sources',
  },
};

export const DataSourceToggle: React.FC<DataSourceToggleProps> = ({
  className,
  compact = false,
}) => {
  const { dataSource, setDataSource } = useDataSource();
  const currentConfig = sourceConfig[dataSource];
  const Icon = currentConfig.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? 'sm' : 'default'}
          className={cn(
            'gap-2 border-border/50 bg-card/50 hover:bg-card/80',
            className
          )}
        >
          <Icon className="h-4 w-4 text-primary" />
          {!compact && (
            <>
              <span>{currentConfig.label}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {(Object.entries(sourceConfig) as [DataSource, typeof sourceConfig['zerion']][]).map(
          ([key, config]) => {
            const ItemIcon = config.icon;
            const isSelected = dataSource === key;

            return (
              <DropdownMenuItem
                key={key}
                onClick={() => setDataSource(key)}
                className="flex items-start gap-3 p-3 cursor-pointer"
              >
                <ItemIcon className={cn('h-4 w-4 mt-0.5', isSelected && 'text-primary')} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('font-medium', isSelected && 'text-primary')}>
                      {config.label}
                    </span>
                    {isSelected && <Check className="h-3 w-3 text-primary" />}
                    {key === 'hybrid' && (
                      <Badge variant="secondary" className="text-[10px] py-0">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                </div>
              </DropdownMenuItem>
            );
          }
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DataSourceToggle;
