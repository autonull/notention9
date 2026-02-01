import {
  UIReplacementComponent,
  UIReplacementContext,
  UIInteraction
} from './UIReplacementInterfaces';

export class AutomationSuggestionWidget implements UIReplacementComponent {
  id = 'automation-suggestion-widget';
  name = 'Automation Suggestions';
  description = 'Suggests automation opportunities for notes';
  type: 'widget' = 'widget';
  position = 'bottom';
  priority = 80;
  enabled = true;

  render(context: UIReplacementContext): string {
    if (!context.selectedNote) {
      return ''; // Only show when a note is selected
    }

    const note = context.selectedNote;
    const suggestions = this.analyzeNoteForAutomation(note);

    if (suggestions.length === 0) {
      return ''; // No suggestions to show
    }

    let html = `
      <div class="automation-suggestions-widget" id="automation-suggestions-${note.id}">
        <div class="widget-header">
          <h4>Automation Opportunities</h4>
          <button class="btn btn-xs" onclick="hideAutomationSuggestions('${note.id}')">×</button>
        </div>
        <div class="widget-content">
          <p>This note might benefit from automation:</p>
          <ul class="suggestions-list">
    `;

    suggestions.forEach((suggestion, index) => {
      html += `
        <li class="suggestion-item">
          <div class="suggestion-content">
            <span class="suggestion-icon">${suggestion.icon}</span>
            <span class="suggestion-text">${suggestion.text}</span>
          </div>
          <button class="btn btn-xs btn-primary" onclick="applySuggestion('${note.id}', ${index})">
            Apply
          </button>
        </li>
      `;
    });

    html += `
          </ul>
        </div>
      </div>
    `;

    html += this.getScripts();

    return html;
  }

  handleInteraction(interaction: UIInteraction): void {
    console.log(`Automation suggestion widget interaction:`, interaction);
  }

  shouldDisplay(context: UIReplacementContext): boolean {
    // Show when a note is selected and has content
    return !!context.selectedNote && (context.currentPage === 'notes' || context.currentPage === 'editor');
  }

  private analyzeNoteForAutomation(note: any): Array<{icon: string, text: string}> {
    const content = (note.title || '') + ' ' + (note.content || '');
    const suggestions: Array<{icon: string, text: string}> = [];

    // Look for patterns that suggest automation
    if (/\b(remind|remember|alert)\b/i.test(content)) {
      suggestions.push({
        icon: '⏰',
        text: 'Create a reminder based on this note'
      });
    }

    if (/\b(when|if|then|condition)\b/i.test(content)) {
      suggestions.push({
        icon: '⚡',
        text: 'Create a conditional automation'
      });
    }

    if (/\b(schedule|plan|appointment|meeting)\b/i.test(content)) {
      suggestions.push({
        icon: '📅',
        text: 'Create a scheduled task'
      });
    }

    if (/\b(monitor|track|watch|observe)\b/i.test(content)) {
      suggestions.push({
        icon: '👁️',
        text: 'Create a monitoring agent'
      });
    }

    // Check for semantic properties
    const propertyRegex = /\[([^\]]+)\]/g;
    let match;
    while ((match = propertyRegex.exec(content)) !== null) {
      const property = match[1];
      if (property.includes('when:') || property.includes('if:')) {
        suggestions.push({
          icon: '⚙️',
          text: `Create automation from property: [${property}]`
        });
      }
    }

    return suggestions;
  }

  private getScripts(): string {
    return `
      <script>
        function hideAutomationSuggestions(noteId) {
          const widget = document.getElementById('automation-suggestions-' + noteId);
          if (widget) {
            widget.style.display = 'none';
          }
        }

        function applySuggestion(noteId, suggestionIndex) {
          if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
            window.uiWebSocket.send(JSON.stringify({
              type: 'apply_automation_suggestion',
              payload: {
                noteId,
                suggestionIndex
              }
            }));
          }
        }
      </script>
    `;
  }
}