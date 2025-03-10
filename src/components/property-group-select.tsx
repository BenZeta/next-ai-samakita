import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/trpc/react';
import { useTranslations } from 'next-intl';

interface PropertyGroupSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function PropertyGroupSelect({ value, onChange }: PropertyGroupSelectProps) {
  const t = useTranslations();
  const { data: propertyGroupsData } = api.propertyGroup.list.useQuery();
  const groups = propertyGroupsData?.groups || [];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-xs sm:h-10 sm:text-sm">
        <SelectValue placeholder={t('common.selectPropertyGroup')} />
      </SelectTrigger>
      <SelectContent>
        {groups.map(group => (
          <SelectItem key={group.id} value={group.id} className="text-xs sm:text-sm">
            {group.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
