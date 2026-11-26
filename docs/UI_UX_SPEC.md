# UI/UX Specification

Generated from `optimize/uisg.yaml` on 2026-11-26T20:43:37.291Z

## Surfaces

### Help System (`help-system`)

- **Component**: HelpSystem
- **Route**: #/help
- **Template**: help-system
- **Status**: planned
- **Description**: Main help container with routing, sidebar, search, and topic rendering
- **Variants**:
  - `default`: Standard help system (experimental)
  - `interactive`: Interactive help variant with step-by-step guidance (experimental)
  - `video`: Video-first help variant (experimental)
  - `searchable`: Search-optimized help variant (experimental)
  - `contextual`: Contextual help variant with proactive triggers (experimental)

### Describe It Promo (`describe-it-promo`)

- **Component**: DescribeItPromo
- **Route**: N/A
- **Template**: inline-promo
- **Status**: planned
- **Description**: Inline promotional component for Describe It feature discovery
- **Variants**:
  - `pulse`: Pulsing animation variant (experimental)
  - `tooltip`: Tooltip on hover variant (experimental)
  - `contextual-hint`: Contextual hint based on user behavior (experimental)

### Actionable Empty State (`empty-state-actionable`)

- **Component**: ActionableEmptyState
- **Route**: N/A
- **Template**: empty-state
- **Status**: planned
- **Description**: Empty states with primary CTA, secondary CTA, and help topic link
- **Variants**:
  - `notes-all`: Notes view - all notes empty (experimental)
  - `notes-search`: Notes view - search results empty (experimental)
  - `network`: Network view - no connections (experimental)
  - `map`: Map view - no locations (experimental)
  - `timeline`: Timeline view - no dates (experimental)
  - `matches`: Matches view - no matches (experimental)
  - `chat`: Chat view - no conversations (experimental)
  - `ontology`: Ontology view - no schemas (experimental)
  - `skills`: Skills view - no skills (experimental)

### Mobile Property Editor (`mobile-property-editor`)

- **Component**: PropertyEditorMobile
- **Route**: N/A
- **Template**: modal-fullscreen
- **Status**: planned
- **Description**: Full-screen property editor for mobile with virtual keyboard handling
- **Variants**:
  - `bottom-sheet`: Bottom sheet variant (experimental)
  - `fullscreen-modal`: Full-screen modal variant (experimental)

### Mobile Arrange Menu (`mobile-arrange-menu`)

- **Component**: ArrangeMenuMobile
- **Route**: N/A
- **Template**: bottom-sheet
- **Status**: planned
- **Description**: Bottom sheet arrange menu with swipe dismiss
- **Variants**:
  - `default`: Standard bottom sheet (experimental)

### Mobile Context Rail (`mobile-context-rail`)

- **Component**: ContextRailMobile
- **Route**: N/A
- **Template**: bottom-tabs
- **Status**: planned
- **Description**: Horizontal scrolling context rail with 48px touch targets
- **Variants**:
  - `default`: Standard bottom tabs (experimental)

### Mobile Map View (`mobile-map`)

- **Component**: MapViewMobile
- **Route**: N/A
- **Template**: map-full
- **Status**: planned
- **Description**: Full-screen map with FAB in safe area and geolocation button
- **Variants**:
  - `default`: Standard mobile map (experimental)

### Mobile Header (`mobile-header`)

- **Component**: HeaderMobile
- **Route**: N/A
- **Template**: header-compact
- **Status**: planned
- **Description**: Compact header with hamburger menu and swipe sidebar
- **Variants**:
  - `default`: Standard compact header (experimental)

### Settings Directory (`settings-directory`)

- **Component**: SettingsDirectory
- **Route**: N/A
- **Template**: settings-wizard
- **Status**: planned
- **Description**: Progressive disclosure settings with collapsible groups, wizard, export/import, diff
- **Variants**:
  - `grouped`: Grouped collapsible sections (experimental)
  - `wizard`: First-run wizard (experimental)

## Templates

### Help System Template (`help-system`)

- **Shape**: panel
- **Description**: Multi-panel layout with sidebar, content area, and video player
- **Slots**: sidebar, content, video-player, progress-bar, feedback

### Inline Promo Template (`inline-promo`)

- **Shape**: status
- **Description**: Small promotional element embedded in content
- **Slots**: trigger, content, dismiss, variant, forceShow

### Empty State Template (`empty-state`)

- **Shape**: status
- **Description**: Actionable empty state with primary/secondary CTAs and help link
- **Slots**: illustration, title, description, primary-action, secondary-action, help-link, variant

### Modal Fullscreen Template (`modal-fullscreen`)

- **Shape**: panel
- **Description**: Full-screen modal for mobile with safe area handling
- **Slots**: header, content, footer, keyboard-spacer

### Bottom Sheet Template (`bottom-sheet`)

- **Shape**: panel
- **Description**: Swipeable bottom sheet with grabber and dismiss
- **Slots**: grabber, content, actions, onDismiss, children

### Bottom Tabs Template (`bottom-tabs`)

- **Shape**: item
- **Description**: Horizontal scrolling tabs with snap points and 48px targets
- **Slots**: tabs, activeIndex, tab-list, tab-panel

### Settings Wizard Template (`settings-wizard`)

- **Shape**: panel
- **Description**: Progressive disclosure settings with groups, search, export/import, diff
- **Slots**: search, groups, wizard-steps, export-import, diff-view, showWizard, onWizardComplete, onWizardSkip, className

### Full Screen Map Template (`map-full`)

- **Shape**: panel
- **Description**: Full-screen map view with FAB in safe area
- **Slots**: map, fab, geolocation, safe-area-bottom, mapRef, fabContent

### Compact Header Template (`header-compact`)

- **Shape**: panel
- **Description**: Mobile header with hamburger menu and swipe sidebar
- **Slots**: logo, hamburger, actions, swipe-area, onOpenSidebar

## Journeys

### Help System Completion (`help-system-completion`)

- **Surface**: help-system
- **Description**: User completes a help topic from start to finish
- **Steps**: open-help-system → browse-topics → select-topic → complete-steps → rate-topic
- **Metrics**: topic-completion-rate, return-rate, video-completion-rate, interactive-demo-completion

### Help Search (`help-search`)

- **Surface**: help-system
- **Description**: User searches for help topic
- **Steps**: open-help-system → enter-search-query → select-result → view-topic
- **Metrics**: search-success-rate, search-time-to-result

### Help Video Playback (`help-video`)

- **Surface**: help-system
- **Description**: User watches help video
- **Steps**: open-help-topic → play-video → complete-video
- **Metrics**: video-completion-rate, video-engagement

### Help Video Captions (`help-video-captions`)

- **Surface**: help-system
- **Description**: User enables captions while watching a help video
- **Steps**: open-help-topic → play-video → toggle-captions → verify-caption-visible
- **Metrics**: video-completion-rate, video-engagement

### Help Interactive Demo (`help-interactive`)

- **Surface**: help-system
- **Description**: User completes interactive demo
- **Steps**: open-help-topic → start-demo → complete-demo-steps → finish-demo
- **Metrics**: interactive-demo-completion, demo-time-to-complete

### Help Progress Tracking (`help-progress`)

- **Surface**: help-system
- **Description**: User tracks progress across topics
- **Steps**: open-help-system → view-progress → resume-topic
- **Metrics**: progress-sync-accuracy, return-rate

### Contextual Help Trigger (`help-contextual`)

- **Surface**: help-system
- **Description**: Help appears contextually (idle, error, feature gate)
- **Steps**: trigger-condition-met → help-prompt-shown → user-accepts-help → help-topic-opened
- **Metrics**: contextual-trigger-relevance, contextual-acceptance-rate

### Describe It Discovery (`describe-it-discovery`)

- **Surface**: describe-it-promo
- **Description**: User discovers Describe It via promo
- **Steps**: promo-shown → user-clicks-promo → describe-it-opens → first-use-complete
- **Metrics**: describe-it-discovery-rate, describe-it-time-to-first-use, describe-it-acceptance-rate

### Describe It Shortcut (`describe-it-shortcut`)

- **Surface**: describe-it-promo
- **Description**: User opens Describe It via Ctrl+Shift+/
- **Steps**: press-shortcut → describe-it-opens → first-use-complete
- **Metrics**: shortcut-usage-rate, describe-it-time-to-first-use

### Describe It Command Palette (`describe-it-command-palette`)

- **Surface**: describe-it-promo
- **Description**: User opens Describe It via Command Palette
- **Steps**: open-command-palette → search-describe-it → select-entry → describe-it-opens
- **Metrics**: command-palette-usage-rate

### Empty State Notes All (`empty-state-notes-all`)

- **Surface**: empty-state-actionable (notes-all)
- **Description**: New user sees empty notes view
- **Steps**: view-empty-state → click-primary-cta → create-first-note
- **Metrics**: empty-state-cta-click-rate, empty-state-help-click-rate

### Empty State Notes Search (`empty-state-notes-search`)

- **Surface**: empty-state-actionable (notes-search)
- **Description**: User searches with no results
- **Steps**: view-empty-state → click-secondary-cta → clear-search
- **Metrics**: empty-state-cta-click-rate, empty-state-help-click-rate

### Empty State Network (`empty-state-network`)

- **Surface**: empty-state-actionable (network)
- **Description**: User has no network connections
- **Steps**: view-empty-state → click-primary-cta → connect-identity
- **Metrics**: empty-state-cta-click-rate, empty-state-help-click-rate

### Empty State Map (`empty-state-map`)

- **Surface**: empty-state-actionable (map)
- **Description**: User has no locations on map
- **Steps**: view-empty-state → click-primary-cta → add-location
- **Metrics**: empty-state-cta-click-rate, empty-state-help-click-rate

### Empty State Timeline (`empty-state-timeline`)

- **Surface**: empty-state-actionable (timeline)
- **Description**: User has no dated notes
- **Steps**: view-empty-state → click-primary-cta → add-date-property
- **Metrics**: empty-state-cta-click-rate, empty-state-help-click-rate

### Empty State Matches (`empty-state-matches`)

- **Surface**: empty-state-actionable (matches)
- **Description**: User has no matches
- **Steps**: view-empty-state → click-primary-cta → describe-need
- **Metrics**: empty-state-cta-click-rate, empty-state-help-click-rate

### Empty State Chat (`empty-state-chat`)

- **Surface**: empty-state-actionable (chat)
- **Description**: User has no chat conversations
- **Steps**: view-empty-state → click-primary-cta → start-chat
- **Metrics**: empty-state-cta-click-rate, empty-state-help-click-rate

### Empty State Ontology (`empty-state-ontology`)

- **Surface**: empty-state-actionable (ontology)
- **Description**: User has no ontology schemas
- **Steps**: view-empty-state → click-primary-cta → import-schema
- **Metrics**: empty-state-cta-click-rate, empty-state-help-click-rate

### Empty State Skills (`empty-state-skills`)

- **Surface**: empty-state-actionable (skills)
- **Description**: User has no skills
- **Steps**: view-empty-state → click-primary-cta → browse-registry
- **Metrics**: empty-state-cta-click-rate, empty-state-help-click-rate

### Mobile Property Editor (`mobile-property-editor`)

- **Surface**: mobile-property-editor
- **Description**: User edits property on mobile
- **Steps**: open-property-editor → fill-fields → handle-virtual-keyboard → confirm-changes
- **Metrics**: mobile-touch-target-compliance, mobile-task-completion-rate

### Mobile Arrange Menu (`mobile-arrange-menu`)

- **Surface**: mobile-arrange-menu
- **Description**: User arranges items via bottom sheet
- **Steps**: open-arrange-menu → swipe-to-reorder → dismiss-sheet
- **Metrics**: mobile-touch-target-compliance, mobile-task-completion-rate

### Mobile Context Rail (`mobile-context-rail`)

- **Surface**: mobile-context-rail
- **Description**: User navigates context rail
- **Steps**: open-context-rail → swipe-tabs → select-tab
- **Metrics**: mobile-touch-target-compliance, mobile-task-completion-rate

### Mobile Map (`mobile-map`)

- **Surface**: mobile-map
- **Description**: User interacts with map on mobile
- **Steps**: open-map → tap-fab → use-geolocation
- **Metrics**: mobile-touch-target-compliance, mobile-task-completion-rate

### Mobile Header (`mobile-header`)

- **Surface**: mobile-header
- **Description**: User opens sidebar via hamburger
- **Steps**: tap-hamburger → sidebar-opens → navigate
- **Metrics**: mobile-touch-target-compliance, mobile-task-completion-rate

### Settings Task Completion (`settings-task`)

- **Surface**: settings-directory
- **Description**: User completes a settings task
- **Steps**: open-settings → search-or-browse → modify-setting → verify-change
- **Metrics**: settings-task-time, settings-search-usage-rate

### Settings Wizard Completion (`settings-wizard`)

- **Surface**: settings-directory (wizard)
- **Description**: New user completes first-run wizard
- **Steps**: open-settings-first-run → complete-wizard-steps → finish-wizard
- **Metrics**: settings-wizard-completion-rate, settings-task-time

### Settings Export/Import (`settings-export-import`)

- **Surface**: settings-directory
- **Description**: User exports and imports settings
- **Steps**: open-settings → export-settings → import-settings → verify-roundtrip
- **Metrics**: settings-export-import-success

### Settings Diff (`settings-diff`)

- **Surface**: settings-directory
- **Description**: User views settings diff
- **Steps**: open-settings → click-show-diff → review-changes
- **Metrics**: settings-diff-view-rate

### Token Consistency Audit (`token-consistency`)

- **Surface**: help-system
- **Description**: Verify no hardcoded colors in components
- **Steps**: scan-components → verify-tokens
- **Metrics**: token-consistency-score

### Live Regions (`a11y-live-regions`)

- **Surface**: help-system
- **Description**: Verify live regions for dynamic content
- **Steps**: trigger-live-content → verify-announcement
- **Metrics**: a11y-critical-violations, a11y-serious-violations

### Focus Management (`a11y-focus-management`)

- **Surface**: help-system
- **Description**: Verify focus management in modals/sheets
- **Steps**: open-modal → verify-focus-trap → close-modal → verify-focus-return
- **Metrics**: a11y-critical-violations, a11y-serious-violations

### Screen Reader Announcements (`a11y-screen-reader`)

- **Surface**: help-system
- **Description**: Verify screen reader announcements
- **Steps**: trigger-announcement → verify-content
- **Metrics**: a11y-critical-violations, a11y-serious-violations

### High Contrast Mode (`a11y-high-contrast`)

- **Surface**: help-system
- **Description**: Verify high contrast mode
- **Steps**: enable-high-contrast → verify-visibility
- **Metrics**: a11y-critical-violations, a11y-serious-violations

### Performance Budget (`performance-budget`)

- **Surface**: help-system
- **Description**: Verify bundle size and load times
- **Steps**: measure-bundle → measure-load-time
- **Metrics**: bundle-size, load-time

### Capture and Edit Note (`capture-and-edit`)

- **Surface**: empty-state-actionable (notes-all)
- **Description**: User captures a note and edits its properties
- **Steps**: page-add-detail → fill-key → select-operator → fill-value → add-detail → save-note → verify-property
- **Metrics**: topic-completion-rate

## Metrics

### Topic Completion Rate (`topic-completion-rate`)

- **Description**: Percentage of users who complete a help topic
- **Target**: >= 0.7
- **Type**: ratio
- **Source**: journey:help-system-completion

### Return Rate (`return-rate`)

- **Description**: Percentage of users who return to help within 7 days
- **Target**: >= 0.3
- **Type**: ratio
- **Source**: journey:help-progress

### Search Success Rate (`search-success-rate`)

- **Description**: Percentage of searches that result in topic view
- **Target**: >= 0.6
- **Type**: ratio
- **Source**: journey:help-search

### Video Completion Rate (`video-completion-rate`)

- **Description**: Percentage of video plays that reach 90% completion
- **Target**: >= 0.5
- **Type**: ratio
- **Source**: journey:help-video

### Interactive Demo Completion (`interactive-demo-completion`)

- **Description**: Percentage of demo starts that complete
- **Target**: >= 0.6
- **Type**: ratio
- **Source**: journey:help-interactive

### Contextual Trigger Relevance (`contextual-trigger-relevance`)

- **Description**: Percentage of contextual triggers that user accepts
- **Target**: >= 0.2
- **Type**: ratio
- **Source**: journey:help-contextual

### Feedback Positive Rate (`feedback-positive-rate`)

- **Description**: Percentage of help feedback that is positive
- **Target**: >= 0.8
- **Type**: ratio
- **Source**: journey:help-system-completion

### Describe It Discovery Rate (`describe-it-discovery-rate`)

- **Description**: Percentage of eligible users who discover Describe It
- **Target**: >= 0.5
- **Type**: ratio
- **Source**: journey:describe-it-discovery

### Describe It Acceptance Rate (`describe-it-acceptance-rate`)

- **Description**: Percentage of discoveries that lead to first use
- **Target**: >= 0.6
- **Type**: ratio
- **Source**: journey:describe-it-discovery

### Time to First Use (`describe-it-time-to-first-use`)

- **Description**: Seconds from first session to first Describe It use
- **Target**: <= 120
- **Type**: duration
- **Source**: journey:describe-it-discovery

### Shortcut Usage Rate (`shortcut-usage-rate`)

- **Description**: Percentage of users who use Ctrl+Shift+/ shortcut
- **Target**: >= 0.1
- **Type**: ratio
- **Source**: journey:describe-it-shortcut

### Command Palette Usage Rate (`command-palette-usage-rate`)

- **Description**: Percentage of Describe It opens via Command Palette
- **Target**: >= 0.05
- **Type**: ratio
- **Source**: journey:describe-it-command-palette

### Empty State CTA Click Rate (`empty-state-cta-click-rate`)

- **Description**: Percentage of empty state views that click primary CTA
- **Target**: >= 0.3
- **Type**: ratio
- **Source**: journey:empty-state-*

### Empty State Help Click Rate (`empty-state-help-click-rate`)

- **Description**: Percentage of empty state views that click help link
- **Target**: >= 0.15
- **Type**: ratio
- **Source**: journey:empty-state-*

### Mobile Touch Target Compliance (`mobile-touch-target-compliance`)

- **Description**: Percentage of interactive elements meeting 48x48px
- **Target**: = 1.0
- **Type**: ratio
- **Source**: journey:mobile-*

### Mobile Task Completion Rate (`mobile-task-completion-rate`)

- **Description**: Percentage of mobile tasks completed successfully
- **Target**: >= 0.7
- **Type**: ratio
- **Source**: journey:mobile-*

### Settings Task Time (`settings-task-time`)

- **Description**: Median time to complete a settings task (seconds)
- **Target**: <= 30
- **Type**: duration
- **Source**: journey:settings-task

### Settings Search Usage Rate (`settings-search-usage-rate`)

- **Description**: Percentage of settings sessions using search
- **Target**: >= 0.3
- **Type**: ratio
- **Source**: journey:settings-task

### Settings Wizard Completion Rate (`settings-wizard-completion-rate`)

- **Description**: Percentage of first-run users completing wizard
- **Target**: >= 0.8
- **Type**: ratio
- **Source**: journey:settings-wizard

### Settings Export/Import Success (`settings-export-import-success`)

- **Description**: Percentage of successful round-trip export/import
- **Target**: = 1.0
- **Type**: ratio
- **Source**: journey:settings-export-import

### Settings Diff View Rate (`settings-diff-view-rate`)

- **Description**: Percentage of settings sessions viewing diff
- **Target**: >= 0.1
- **Type**: ratio
- **Source**: journey:settings-diff

### Token Consistency Score (`token-consistency-score`)

- **Description**: Percentage of components using semantic tokens
- **Target**: = 1.0
- **Type**: ratio
- **Source**: journey:token-consistency

### Critical Accessibility Violations (`a11y-critical-violations`)

- **Description**: Number of critical axe violations
- **Target**: = 0
- **Type**: count
- **Source**: journey:a11y-*

### Serious Accessibility Violations (`a11y-serious-violations`)

- **Description**: Number of serious axe violations
- **Target**: = 0
- **Type**: count
- **Source**: journey:a11y-*

### Bundle Size (`bundle-size`)

- **Description**: Total JS bundle size (KB)
- **Target**: <= 500
- **Type**: size
- **Source**: journey:performance-budget

### Load Time (`load-time`)

- **Description**: Time to interactive (ms)
- **Target**: <= 3000
- **Type**: duration
- **Source**: journey:performance-budget

## Experiments

### Help System Variants (`help-system-variants`)

- **Surface**: help-system
- **Description**: Test interactive, video, searchable, contextual variants
- **Variants**: interactive, video, searchable, contextual
- **Runs**: 100
- **Metrics**: topic-completion-rate, return-rate, search-success-rate, video-completion-rate

### Describe It Promo Variants (`describe-it-promo-variants`)

- **Surface**: describe-it-promo
- **Description**: Test pulse, tooltip, contextual-hint variants
- **Variants**: pulse, tooltip, contextual-hint
- **Runs**: 100
- **Metrics**: describe-it-discovery-rate, describe-it-acceptance-rate, describe-it-time-to-first-use

### Empty State Variants (`empty-state-variants`)

- **Surface**: empty-state-actionable
- **Description**: Test notes-all, network, matches variants
- **Variants**: notes-all, network, matches
- **Runs**: 100
- **Metrics**: empty-state-cta-click-rate, empty-state-help-click-rate

### Mobile Property Editor Variants (`mobile-property-editor-variants`)

- **Surface**: mobile-property-editor
- **Description**: Test bottom-sheet vs fullscreen-modal
- **Variants**: bottom-sheet, fullscreen-modal
- **Runs**: 100
- **Metrics**: mobile-touch-target-compliance, mobile-task-completion-rate

### Settings Directory Variants (`settings-directory-variants`)

- **Surface**: settings-directory
- **Description**: Test grouped vs wizard variants
- **Variants**: grouped, wizard
- **Runs**: 100
- **Metrics**: settings-task-time, settings-wizard-completion-rate, settings-search-usage-rate

