import {useContext} from 'react';
import {SimulatorContext} from '../components/contexts/SimulatorContext';

export const useSimulatorContext = () => {
    const context = useContext(SimulatorContext);
    if (!context) {
        throw new Error('useSimulatorContext must be used within a SimulatorProvider');
    }
    return context;
};
