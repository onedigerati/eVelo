/**
 * Drag-and-drop file upload component
 *
 * Accepts CSV and JSON files via drag-drop or click.
 * Emits 'file-selected' CustomEvent when file is chosen.
 */

import { BaseComponent } from '../base-component';

export class FileDropZone extends BaseComponent {
  private _isDragging = false;
  private _accept = '.csv,.json';

  static get observedAttributes(): string[] {
    return ['accept'];
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name === 'accept' && newValue) {
      this._accept = newValue;
    }
    super.attributeChangedCallback(name, oldValue, newValue);
  }

  protected template(): string {
    return `
      <div class="drop-zone ${this._isDragging ? 'dragging' : ''}">
        <input
          type="file"
          id="file-input"
          accept="${this._accept}"
          hidden
        />
        <label for="file-input" class="drop-label">
          <div class="icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <span class="text">Drop CSV or JSON file here</span>
          <span class="subtext">or click to browse</span>
          <span class="hint">Supported formats: .csv, .json</span>
        </label>
      </div>
    `;
  }

  protected afterRender(): void {
    const dropZone = this.$('.drop-zone');
    const fileInput = this.$('#file-input') as HTMLInputElement;

    if (!dropZone || !fileInput) return;

    // Prevent default drag behaviors
    const preventDefaults = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults);
    });

    // Visual feedback for drag
    dropZone.addEventListener('dragenter', () => {
      this._isDragging = true;
      dropZone.classList.add('dragging');
    });

    dropZone.addEventListener('dragleave', (e: Event) => {
      // Only remove dragging state if leaving the drop zone entirely
      const de = e as DragEvent;
      const rect = dropZone.getBoundingClientRect();
      if (
        de.clientX < rect.left ||
        de.clientX > rect.right ||
        de.clientY < rect.top ||
        de.clientY > rect.bottom
      ) {
        this._isDragging = false;
        dropZone.classList.remove('dragging');
      }
    });

    // Handle drop
    dropZone.addEventListener('drop', (e: Event) => {
      this._isDragging = false;
      dropZone.classList.remove('dragging');
      const de = e as DragEvent;
      const files = de.dataTransfer?.files;
      if (files?.length) {
        this.handleFile(files[0]);
      }
    });

    // Handle file input change
    fileInput.addEventListener('change', () => {
      if (fileInput.files?.length) {
        this.handleFile(fileInput.files[0]);
        fileInput.value = ''; // Reset for same file re-upload
      }
    });
  }

  private handleFile(file: File): void {
    // Validate file type
    const validTypes = ['text/csv', 'application/json', 'text/plain'];
    const validExtensions = ['.csv', '.json'];
    const hasValidExtension = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!validTypes.includes(file.type) && !hasValidExtension) {
      this.dispatchEvent(new CustomEvent('file-error', {
        detail: { error: 'Invalid file type. Please upload a CSV or JSON file.' },
        bubbles: true,
        composed: true
      }));
      return;
    }

    this.dispatchEvent(new CustomEvent('file-selected', {
      detail: { file },
      bubbles: true,
      composed: true
    }));
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .drop-zone {
        border: 2px dashed var(--border-color, #d1d5db);
        border-radius: var(--border-radius-lg, 12px);
        padding: 32px;
        text-align: center;
        transition: all 0.2s ease;
        cursor: pointer;
        background: var(--surface-secondary, #f9fafb);
      }

      .drop-zone:hover,
      .drop-zone.dragging {
        border-color: var(--color-primary, #0d9488);
        background: rgba(13, 148, 136, 0.05);
      }

      .drop-zone.dragging {
        border-style: solid;
        transform: scale(1.01);
      }

      .drop-label {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }

      .icon {
        color: var(--color-primary, #0d9488);
        margin-bottom: 8px;
      }

      .text {
        font-size: 1rem;
        font-weight: 500;
        color: var(--text-primary, #111827);
      }

      .subtext {
        font-size: 0.875rem;
        color: var(--text-secondary, #6b7280);
      }

      .hint {
        font-size: 0.75rem;
        color: var(--text-tertiary, #9ca3af);
        margin-top: 8px;
      }

      /* Dark theme */
      :host-context([data-theme="dark"]) .drop-zone {
        border-color: var(--border-color);
        background: var(--surface-secondary);
      }

      :host-context([data-theme="dark"]) .drop-zone:hover,
      :host-context([data-theme="dark"]) .drop-zone.dragging {
        border-color: var(--color-primary);
        background: rgba(13, 148, 136, 0.1);
      }

      :host-context([data-theme="dark"]) .text {
        color: var(--text-primary);
      }

      :host-context([data-theme="dark"]) .subtext {
        color: var(--text-secondary);
      }

      :host-context([data-theme="dark"]) .hint {
        color: var(--text-tertiary);
      }
    `;
  }
}

customElements.define('file-drop-zone', FileDropZone);
