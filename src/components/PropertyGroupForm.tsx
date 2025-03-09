'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'use-intl';

interface Property {
  id: string;
  name: string;
}

interface PropertyGroupFormProps {
  onSubmit: (data: { name: string; description: string; properties: string[] }) => void;
  onCancel: () => void;
  availableProperties: Property[];
  initialData?: {
    name: string;
    description: string;
    properties: string[];
  };
}

export function PropertyGroupForm({
  onSubmit,
  onCancel,
  availableProperties,
  initialData,
}: PropertyGroupFormProps) {
  const t = useTranslations('propertyGroups');
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [selectedProperties, setSelectedProperties] = useState<string[]>(
    initialData?.properties || []
  );
  const [propertyToAdd, setPropertyToAdd] = useState('');

  const handleAddProperty = () => {
    if (propertyToAdd && !selectedProperties.includes(propertyToAdd)) {
      setSelectedProperties([...selectedProperties, propertyToAdd]);
      setPropertyToAdd('');
    }
  };

  const handleRemoveProperty = (propertyId: string) => {
    setSelectedProperties(selectedProperties.filter(id => id !== propertyId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      properties: selectedProperties,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="space-y-4 sm:space-y-5">
        <div className="space-y-1 sm:space-y-2">
          <Label htmlFor="name" className="text-xs sm:text-sm font-medium">
            {t('name')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('namePlaceholder', { defaultMessage: 'Enter group name' })}
            className="w-full text-xs sm:text-sm"
            required
          />
        </div>

        <div className="space-y-1 sm:space-y-2">
          <Label htmlFor="description" className="text-xs sm:text-sm font-medium">
            {t('description')}
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder', {
              defaultMessage: 'Enter group description (optional)',
            })}
            className="min-h-[80px] sm:min-h-[100px] w-full resize-none text-xs sm:text-sm"
          />
        </div>

        <div className="space-y-3 sm:space-y-4 pt-1 sm:pt-2">
          <Label className="text-xs sm:text-sm font-medium block mb-2 sm:mb-3">
            {t('properties')}
          </Label>

          {availableProperties.length > 0 && (
            <div className="rounded-md border p-3 sm:p-4 bg-muted/30">
              <p className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">
                {t('availableProperties', { defaultMessage: 'Available Properties:' })}
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-[120px] sm:max-h-[150px] overflow-y-auto p-1">
                {availableProperties
                  .filter(property => !selectedProperties.includes(property.id))
                  .map(property => (
                    <Badge
                      key={property.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors py-1 sm:py-1.5 px-2 sm:px-2.5 text-xs sm:text-sm"
                      onClick={() => {
                        setSelectedProperties([...selectedProperties, property.id]);
                      }}
                    >
                      {property.name} <Plus className="h-2.5 sm:h-3 w-2.5 sm:w-3 ml-1 sm:ml-1.5" />
                    </Badge>
                  ))}
                {availableProperties.filter(property => !selectedProperties.includes(property.id))
                  .length === 0 && (
                  <p className="text-xs sm:text-sm text-muted-foreground py-1 sm:py-2">
                    {t('allPropertiesSelected', {
                      defaultMessage: 'All properties have been selected',
                    })}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-3 sm:mt-4">
            <Select
              value={propertyToAdd}
              onValueChange={value => {
                setPropertyToAdd(value);
              }}
            >
              <SelectTrigger className="flex-1 text-xs sm:text-sm h-8 sm:h-10">
                <SelectValue placeholder={t('selectProperty')} />
              </SelectTrigger>
              <SelectContent>
                {availableProperties.length === 0 ? (
                  <SelectItem value="no-properties" disabled className="text-xs sm:text-sm">
                    {t('noPropertiesAvailable', { defaultMessage: 'No properties available' })}
                  </SelectItem>
                ) : (
                  availableProperties
                    .filter(property => !selectedProperties.includes(property.id))
                    .map(property => (
                      <SelectItem
                        key={property.id}
                        value={property.id}
                        className="text-xs sm:text-sm"
                      >
                        {property.name}
                      </SelectItem>
                    ))
                )}
                {availableProperties.filter(property => !selectedProperties.includes(property.id))
                  .length === 0 && (
                  <SelectItem value="all-selected" disabled className="text-xs sm:text-sm">
                    {t('allPropertiesSelected', {
                      defaultMessage: 'All properties have been selected',
                    })}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={handleAddProperty}
              disabled={
                !propertyToAdd ||
                propertyToAdd === 'no-properties' ||
                propertyToAdd === 'all-selected'
              }
              size="icon"
              variant="secondary"
              className="flex-shrink-0 h-8 sm:h-10 w-8 sm:w-10"
            >
              <Plus className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            </Button>
          </div>

          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t rounded-md">
            <p className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">
              {t('selectedProperties', { defaultMessage: 'Selected Properties:' })}
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 min-h-[40px] sm:min-h-[50px] p-1">
              {selectedProperties.length === 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground py-1 sm:py-2">
                  {t('noProperties')}
                </p>
              ) : (
                selectedProperties.map(propertyId => {
                  const property = availableProperties.find(p => p.id === propertyId);
                  return (
                    <Badge
                      key={propertyId}
                      variant="secondary"
                      className="flex items-center gap-1 py-1 sm:py-1.5 px-2 sm:px-3 text-xs sm:text-sm"
                    >
                      {property?.name ||
                        t('unknownProperty', {
                          id: propertyId,
                          defaultMessage: `Unknown property (${propertyId})`,
                        })}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-3.5 sm:h-4 w-3.5 sm:w-4 p-0 ml-1 sm:ml-1.5 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleRemoveProperty(propertyId)}
                      >
                        <X className="h-2.5 sm:h-3 w-2.5 sm:w-3" />
                      </Button>
                    </Badge>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-3 sm:pt-4 border-t mt-4 sm:mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="text-xs sm:text-sm h-8 sm:h-10"
        >
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={!name} className="text-xs sm:text-sm h-8 sm:h-10">
          {initialData ? t('save') : t('create')}
        </Button>
      </div>
    </form>
  );
}
