import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Building2, Edit, Trash2 } from 'lucide-react';
import * as React from 'react';
import { useTranslations } from 'use-intl';

interface PropertyGroupCardProps {
  name: string;
  description: string;
  propertyCount: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  id: string;
  className?: string;
}

const PropertyGroupCard = React.forwardRef<HTMLDivElement, PropertyGroupCardProps>(
  ({ name, description, propertyCount, onEdit, onDelete, id, className, ...props }, ref) => {
    const t = useTranslations('propertyGroups');

    return (
      <Card
        ref={ref}
        className={cn('w-full h-full overflow-hidden transition-all hover:shadow-md', className)}
        {...props}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <h3 className="text-base sm:text-lg font-semibold text-foreground line-clamp-1">
                {name}
              </h3>
              <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit?.(id)}
                  aria-label={t('editAriaLabel', { defaultMessage: 'Edit property group' })}
                  className="h-6 sm:h-7 w-6 sm:w-7"
                >
                  <Edit className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete?.(id)}
                  aria-label={t('deleteAriaLabel', { defaultMessage: 'Delete property group' })}
                  className="h-6 sm:h-7 w-6 sm:w-7"
                >
                  <Trash2 className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-destructive" />
                </Button>
              </div>
            </div>

            {description && (
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3 sm:mb-4">
                {description}
              </p>
            )}

            <div className="flex items-center text-xs sm:text-sm text-muted-foreground mt-auto pt-2 sm:pt-3 border-t">
              <div className="flex h-6 sm:h-7 w-6 sm:w-7 items-center justify-center rounded-full bg-primary/10 mr-2">
                <Building2 className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary" />
              </div>
              <span>
                {propertyCount}{' '}
                {propertyCount === 1
                  ? t('propertySingular', { defaultMessage: 'property' })
                  : t('propertyPlural', { defaultMessage: 'properties' })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

PropertyGroupCard.displayName = 'PropertyGroupCard';

export { PropertyGroupCard };
