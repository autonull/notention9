import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Home, Film, MonitorPlay } from 'lucide-react';
import { Button, IconButton, Kbd } from './ui';
import { Card, CardHeader, CardTitle, CardContent } from './ui';
import { Badge } from './ui';
import { Modal } from './ui';
import { DesignTokens } from './ui';
import { cn } from '../utils';
import { helpSections, quickActions, getShortcutsByCategory } from '../config/help';
import { SectionDetail, SearchResults, ShortcutsReference, SidebarNav } from './HelpModalComponents';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string | null>('studio');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedSection('studio');
      setShowShortcuts(false);
      setTimeout(() => searchInputRef.current?.focus(), 100);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const visibleSections = filteredSections;
          if (visibleSections.length === 0) return;
          const currentIndex = visibleSections.findIndex((s) => s.id === selectedSection);
          if (currentIndex >= 0) {
            const nextIndex = e.key === 'ArrowRight'
              ? (currentIndex + 1) % visibleSections.length
              : (currentIndex - 1 + visibleSections.length) % visibleSections.length;
            setSelectedSection(visibleSections[nextIndex].id);
            e.preventDefault();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, selectedSection]);

  const filteredSections = useMemo(() => {
    if (!searchQuery) return helpSections;
    const query = searchQuery.toLowerCase();
    return helpSections.filter((s) =>
      s.title.toLowerCase().includes(query) ||
      s.content.toLowerCase().includes(query) ||
      s.shortcuts?.some((sc) => sc.description.toLowerCase().includes(query)) ||
      s.id.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Help & Documentation"
      size="xl"
      showCloseButton={true}
      closeOnOverlayClick={true}
      closeOnEscape={true}
    >
      <div className="flex h-full min-h-0">
        <SidebarNav
          selectedSection={selectedSection}
          onSelectSection={setSelectedSection}
          onClose={onClose}
        />

        <div className="flex-1 min-w-0 p-6 lg:p-8 overflow-auto custom-scrollbar">
          {showShortcuts ? (
            <ShortcutsReference onClose={() => setShowShortcuts(false)} />
          ) : selectedSection ? (
            <SectionDetail
              section={helpSections.find((s) => s.id === selectedSection)!}
              allSections={helpSections}
              onSelectSection={setSelectedSection}
            />
          ) : (
            <SearchResults sections={filteredSections} onSelect={setSelectedSection} />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default HelpModal;