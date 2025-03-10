import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/trpc/react';
import { useTranslations } from 'next-intl';

interface PropertySelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function PropertySelect({ value, onChange }: PropertySelectProps) {
  const t = useTranslations();
  const { data: propertiesData } = api.property.list.useQuery({ limit: 100 });
  const properties = propertiesData?.properties || [];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-xs sm:h-10 sm:text-sm">
        <SelectValue placeholder={t('common.selectProperty')} />
      </SelectTrigger>
      <SelectContent>
        {properties.map(property => (
          <SelectItem key={property.id} value={property.id} className="text-xs sm:text-sm">
            {property.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
