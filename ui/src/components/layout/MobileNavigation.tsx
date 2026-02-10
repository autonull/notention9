import React from 'react';
import {useView} from '../../hooks/useViewContext';
import {SearchIcon} from '../common/icons';
import {NAV_ITEMS} from '../../utils/navigation';

export function MobileNavigation() {
    const {activeView, setActiveView, setIsPaletteOpen} = useView();

    const mobileNavItems = NAV_ITEMS.filter(item => item.showInMobile);

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50 pb-safe">
            <div className="flex justify-around items-center h-16 px-2">
                {mobileNavItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                            activeView === item.id ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        <item.icon className="h-6 w-6"/>
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                ))}
                <button
                    onClick={() => setIsPaletteOpen(true)}
                    className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 hover:text-gray-300 transition-colors"
                >
                    <SearchIcon className="h-6 w-6"/>
                    <span className="text-[10px] font-medium">Search</span>
                </button>
            </div>
        </div>
    );
}
