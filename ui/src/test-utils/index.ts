export const FULL_PROVIDER_WRAPPER_START = `
      <I18nProvider>
        <SettingsProvider>
          <ToastProvider>
            <ViewProvider>
              <StrategyProvider>
                <NotesProvider>`;

export const FULL_PROVIDER_WRAPPER_END = `
                </NotesProvider>
              </StrategyProvider>
            </ViewProvider>
          </ToastProvider>
        </SettingsProvider>
      </I18nProvider>`;

export const MOBILE_PROVIDER_WRAPPER_START = `
      <SettingsProvider>
        <NotesProvider>`;

export const MOBILE_PROVIDER_WRAPPER_END = `
        </NotesProvider>
      </SettingsProvider>`;

export const DEFAULT_PROPS: Record<string, string> = {
  ContextRailMobile: ' tabs={[{ id: "tab1", label: "Tab 1", panel: <div>Tab 1</div> }, { id: "tab2", label: "Tab 2", panel: <div>Tab 2</div> }]} activeIndex={0}',
  MapViewMobile: ' fabContent={<div>FAB</div>}',
  PropertyEditorMobile: ' header={<div>Header</div>} content={<div>Content</div>} footer={<div>Footer</div>}',
  ArrangeMenuMobile: ' onDismiss={() => {}} actions={<div>Actions</div>} children={<div>Content</div>}',
  HeaderMobile: ' onOpenSidebar={() => {}} logo={<div>Logo</div>} actions={<div>Actions</div>}',
};

export function getNeedsFullProviderStack(template: string): boolean {
  return template === 'inline-promo' || template === 'empty-state' || template === 'help-system' || template === 'settings-wizard';
}

export function getNeedsMobileProviders(template: string): boolean {
  return template === 'modal-fullscreen' || template === 'bottom-sheet' || template === 'bottom-tabs' || template === 'map-full' || template === 'header-compact';
}

export function getForceShow(template: string): string {
  return template === 'inline-promo' ? ' forceShow={true}' : '';
}