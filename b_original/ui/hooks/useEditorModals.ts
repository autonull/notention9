import { useState, useCallback } from 'react';

export function useEditorModals(
    handleUpdateProperty: (key: string, value: string) => void,
    handleUpdateLocation: (latlng: string) => void
) {
    const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
    const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState<boolean>(false);
    const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState<boolean>(false);
    const [isMapPickerOpen, setIsMapPickerOpen] = useState<boolean>(false);
    const [locationPickerCallback, setLocationPickerCallback] = useState<((loc: string) => void) | null>(null);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState<boolean>(false);
    const [pickingTimeKey, setPickingTimeKey] = useState<string>('');

    const handlePickTime = (key: string) => {
        setPickingTimeKey(key);
        setIsTimePickerOpen(true);
    };

    const handleTimeSelected = (timeVal: string) => {
        if (pickingTimeKey) {
            handleUpdateProperty(pickingTimeKey, timeVal);
        }
        setIsTimePickerOpen(false);
    };

    const handleLocationSelect = useCallback((latlng: string) => {
        if (locationPickerCallback) {
            locationPickerCallback(latlng);
            setLocationPickerCallback(null);
            setIsMapPickerOpen(false);
            return;
        }
        handleUpdateLocation(latlng);
    }, [handleUpdateLocation, locationPickerCallback]);

    const handleRequestLocationPick = useCallback((): Promise<string> => {
        return new Promise((resolve) => {
            setLocationPickerCallback(() => (loc: string) => resolve(loc));
            setIsMapPickerOpen(true);
        });
    }, []);

    return {
        isInspectorOpen, setIsInspectorOpen,
        isTemplateSelectorOpen, setIsTemplateSelectorOpen,
        isSaveTemplateModalOpen, setIsSaveTemplateModalOpen,
        isMapPickerOpen, setIsMapPickerOpen,
        isTimePickerOpen, setIsTimePickerOpen,
        pickingTimeKey,
        handlePickTime,
        handleTimeSelected,
        handleLocationSelect,
        handleRequestLocationPick
    };
}
