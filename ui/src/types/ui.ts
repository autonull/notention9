import React from 'react';
import type {View} from '@notention/core';

export interface ViewConfig {
    id: View;
    label: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    badgeCountKey?: 'notificationCount' | 'chatNotificationCount';
    showInMobile: boolean;
    requiresDeveloperMode?: boolean;
}
