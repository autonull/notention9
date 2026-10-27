import { Search, Keyboard, ChevronRight, Home, Film, MonitorPlay } from 'lucide-react';
import { Button, Kbd } from '../components/ui';
import { Card, CardTitle } from '../components/ui';
import { Badge } from '../components/ui';
import { DesignTokens } from '../components/ui';
import { cn } from '../utils';
import { helpSections, quickActions } from '../config/help';
import { getShortcutsByCategory } from '../config/help';
import type { HelpSection } from '../config/help';

interface SectionDetailProps {
  section: HelpSection;
  allSections: HelpSection[];
  onSelectSection: (id: string) => void;
}

export const SectionDetail = ({ section, allSections, onSelectSection }: SectionDetailProps) => (
  <article className="space-y-6 animate-fade-in stagger-children">
    <header className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-gray-900/50 flex items-center justify-center flex-shrink-0">
        {section.icon}
      </div>
      <div className="flex-1">
        <CardTitle className="text-2xl">{section.title}</CardTitle>
        {section.related && section.related.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {section.related.map((id) => {
              const related = allSections.find((s) => s.id === id);
              return related ? (
                <Button
                  key={id}
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectSection(id)}
                >
                  {related.title.split(' — ')[0]}
                </Button>
              ) : null;
            })}
          </div>
        )}
      </div>
    </header>

    {section.content && <p className="text-gray-300 leading-relaxed text-base">{section.content}</p>}

    {section.shortcuts && section.shortcuts.length > 0 && (
      <Card variant="outlined" padding="md">
        <div className="flex items-center gap-2 mb-3">
          <Keyboard size={16} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Keyboard Shortcuts</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {section.shortcuts.map((sc, j) => (
            <div key={j} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-800/50 transition-colors">
              <Kbd>{sc.key}</Kbd>
              <span className="text-gray-400 truncate">{sc.description}</span>
            </div>
          ))}
        </div>
      </Card>
    )}
  </article>
);

interface SearchResultsProps {
  sections: HelpSection[];
  onSelect: (id: string) => void;
}

export const SearchResults = ({ sections, onSelect }: SearchResultsProps) => (
  <div className="animate-fade-in stagger-children">
    <div className="flex items-center gap-2 mb-4">
      <Search size={16} className="text-gray-400" />
      <CardTitle>Search Results ({sections.length})</CardTitle>
    </div>
    {sections.length === 0 ? (
      <div className="text-center py-12 text-gray-500">
        <p>No results found</p>
        <p className="text-sm mt-2">Try different keywords</p>
      </div>
    ) : (
      <div className="space-y-4">
        {sections.map((section) => (
          <Button
            key={section.id}
            variant="ghost"
            className="w-full justify-start p-4 rounded-xl border border-gray-700/50 hover:border-indigo-500/50 hover:bg-indigo-900/10 transition-colors"
            onClick={() => onSelect(section.id)}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                {section.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{section.title}</p>
                {section.content && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{section.content}</p>}
              </div>
            </div>
          </Button>
        ))}
      </div>
    )}
  </div>
);

interface ShortcutsReferenceProps {
  onClose: () => void;
}

export const ShortcutsReference = ({ onClose }: ShortcutsReferenceProps) => {
  const categories = getShortcutsByCategory(helpSections);

  return (
    <div className="p-6 lg:p-8 overflow-auto custom-scrollbar animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <CardTitle>All Keyboard Shortcuts</CardTitle>
        <Button variant="secondary" onClick={onClose}>Back to Help</Button>
      </div>

      <div className="space-y-6">
        {categories.map((cat, i) => (
          <section key={cat.name} className="stagger-children" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center">
                <Keyboard size={12} className="text-gray-500" />
              </span>
              {cat.name}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cat.shortcuts.map((sc, j) => (
                <div key={j} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-900/50 border border-gray-700/50 hover:border-indigo-500/30 transition-colors">
                  <Kbd>{sc.key}</Kbd>
                  <span className="text-gray-300 text-sm">{sc.description}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

interface SidebarNavProps {
  selectedSection: string | null;
  onSelectSection: (id: string) => void;
  onClose: () => void;
}

export const SidebarNav = ({ selectedSection, onSelectSection, onClose }: SidebarNavProps) => (
  <nav className="w-56 lg:w-64 bg-gray-900/50 border-r border-gray-700/50 flex-shrink-0 overflow-auto custom-scrollbar p-4" aria-label="Help sections">
    <ul className="space-y-1" role="listbox">
      {helpSections.map((section) => (
        <li key={section.id}>
          <Button
            variant={selectedSection === section.id ? 'primary' : 'ghost'}
            className="w-full justify-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150"
            onClick={() => onSelectSection(section.id)}
            role="option"
            aria-selected={selectedSection === section.id}
          >
            <div className="flex-shrink-0 w-8 h-8">{section.icon}</div>
            <span className="truncate text-sm font-medium">
              {section.title.replace(' — ', '\n').split('\n')[0]}
            </span>
            <ChevronRight size={14} className="text-gray-500 ml-auto flex-shrink-0" />
          </Button>
        </li>
      ))}
    </ul>

    <div className="mt-6 pt-4 border-t border-gray-700/50">
      <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Quick Actions</p>
      <div className="space-y-2">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('navigate', { detail: action.navigate })); }}
          >
            <action.icon size={16} /> {action.label}
          </Button>
        ))}
      </div>
    </div>
  </nav>
);