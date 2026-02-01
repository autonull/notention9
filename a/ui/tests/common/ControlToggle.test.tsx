import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ControlToggle } from '../../components/common/ControlToggle';
import { ControlModeProvider } from '../../components/contexts/ControlModeContext';

describe('ControlToggle', () => {
  it('should render all mode options', () => {
    render(
      <ControlModeProvider>
        <ControlToggle />
      </ControlModeProvider>
    );

    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Assist')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });
});
