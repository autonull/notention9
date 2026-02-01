import React, { useMemo } from 'react';
import type { Property, OntologyNode } from '@notention/core';
import { IconButton } from '../common/IconButton';
import { Select } from '../common/Select';
import { PropertyValueInput } from './PropertyValueInput';
import { TrashIcon, InformationCircleIcon } from '../common/icons';
import { Autocomplete, AutocompleteOption } from '../common/Autocomplete';

interface PropertyWidgetProps {
  property: Property;
  onChange: (updated: Property) => void;
  onRemove: () => void;
  ontology: OntologyNode[];
  className?: string;
}

export function PropertyWidget({ property, onChange, onRemove, ontology, className = "mb-2" }: PropertyWidgetProps) {
  const getAttributeDetails = (key: string, nodes: OntologyNode[]): { type: string, description?: string } | undefined => {
      if (!nodes) return undefined;
      for (const node of nodes) {
        if (node.attributes && node.attributes[key]) {
          return { type: node.attributes[key].type, description: node.attributes[key].description };
        }
        if (node.children) {
          const found = getAttributeDetails(key, node.children);
          if (found) return found;
        }
      }
      return undefined;
  };

  const getAllAttributes = (nodes: OntologyNode[]): AutocompleteOption[] => {
      let options: AutocompleteOption[] = [];
      if (!nodes) return options;

      for (const node of nodes) {
          if (node.attributes) {
              Object.entries(node.attributes).forEach(([key, attr]) => {
                  options.push({
                      value: key,
                      label: key,
                      description: attr.description
                  });
              });
          }
          if (node.children) {
              options = [...options, ...getAllAttributes(node.children)];
          }
      }

      // Deduplicate by value (key)
      const uniqueOptions = Array.from(new Map(options.map(item => [item.value, item])).values());
      return uniqueOptions;
  };

  const currentAttr = getAttributeDetails(property.key, ontology);

  // Memoize attribute options to prevent expensive recursion on every render
  const attributeOptions = useMemo(() => getAllAttributes(ontology), [ontology]);

  return (
    <div className={`flex items-center gap-2 bg-gray-800/50 p-2 rounded border border-gray-700/50 hover:border-blue-500/30 transition-all animate-fade-in relative focus-within:z-20 ${className}`}>
       {/* Key Input */}
       <div className="relative w-1/3 min-w-[120px]">
           <Autocomplete
             value={property.key}
             onChange={(val) => onChange({...property, key: val})}
             options={attributeOptions}
             placeholder="Key"
             className="w-full"
           />
           {currentAttr?.description && (
               <div className="absolute right-2 top-2.5 text-gray-500 cursor-help z-10" title={currentAttr.description}>
                   <InformationCircleIcon className="w-3.5 h-3.5" />
               </div>
           )}
       </div>

       {/* Operator Select */}
       <div className="w-[110px] flex-shrink-0">
         <Select
             value={property.operator}
             onChange={(e) => onChange({...property, operator: e.target.value})}
             options={[
                 { value: 'is', label: 'is' },
                 { value: 'contains', label: 'contains' },
                 { value: 'greater than', label: '>' },
                 { value: 'less than', label: '<' },
                 { value: 'between', label: 'between' },
             ]}
             className=""
         />
       </div>

       {/* Value Input */}
       <div className="flex-1 min-w-[150px]">
           <PropertyValueInput
               value={property.values[0] || ''}
               onChange={(val) => onChange({...property, values: [val]})}
               attributeDef={currentAttr}
           />
       </div>

       <IconButton
           icon={TrashIcon}
           onClick={onRemove}
           size="sm"
           variant="ghost"
           className="text-gray-500 hover:text-red-400 hover:bg-red-900/20"
           tooltip="Remove property"
       />
    </div>
  );
}
