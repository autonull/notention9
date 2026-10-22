import React from 'react';
import {MobileBottomNav} from './MobileBottomNav';
import {useView} from '../../hooks/useViewContext';

export function MobileNavigation() {
    const {isPaletteOpen} = useView();
    return <MobileBottomNav isOpen={isPaletteOpen} />;
}