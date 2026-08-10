import {
    AfterViewInit,
    Component,
    ElementRef,
    OnDestroy,
    ViewChild,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { CreatomateTemplate, RealCreatomateService } from '@core/services';
import { Preview } from '@creatomate/preview';

interface TemplateElementTarget {
    id: string;
    name: string;
    type: string;
}

interface VideoEditSuggestion {
    label: string;
    instruction: string;
}

@Component({
    selector: 'app-creatomate-template-preview',
    standalone: true,
    template: `
        <div
            class="preview-modal"
            role="dialog"
            aria-modal="true"
            [attr.aria-busy]="aiSuggestionsLoading()"
            aria-label="Original and populated Creatomate template previews">
            <button
                class="backdrop"
                type="button"
                aria-label="Close preview"
                (click)="closed.emit()"></button>
            <section>
                <header>
                    <div>
                        <span>TEMPLATE COMPARISON</span><strong>{{ template().name }}</strong>
                    </div>
                    <button type="button" aria-label="Close preview" (click)="closed.emit()">
                        ×
                    </button>
                </header>
                <div class="workspace" [class.awaiting-mapping]="!fields().length">
                    <aside>
                        <div class="sidebar-tabs" role="tablist" aria-label="Template editing mode">
                            <button
                                type="button"
                                role="tab"
                                [attr.aria-selected]="sidebarTab() === 'video'"
                                [class.active]="sidebarTab() === 'video'"
                                (click)="sidebarTab.set('video')">
                                Video editor
                            </button>
                            <button
                                type="button"
                                role="tab"
                                [attr.aria-selected]="sidebarTab() === 'properties'"
                                [class.active]="sidebarTab() === 'properties'"
                                (click)="sidebarTab.set('properties')">
                                Properties
                            </button>
                        </div>
                        @if (sidebarTab() === 'properties') {
                            <h3>Template properties</h3>
                            <p>Type a value for any property to update the populated preview.</p>
                            @for (field of fields(); track field.name) {
                                <label>
                                    <span>{{ field.name }}</span>
                                    <textarea
                                        rows="3"
                                        [value]="field.value"
                                        (input)="
                                            updateField(field.name, $any($event.target).value)
                                        ">
                                    </textarea>
                                </label>
                            }
                            @if (!fields().length && loading()) {
                                <div class="no-fields">Loading template properties…</div>
                            }
                            @if (!fields().length && !loading()) {
                                <div class="no-fields">
                                    This template has no editable text, image, or video properties.
                                </div>
                            }
                        } @else {
                            <div class="ai-json-editor" aria-label="AI video prompt">
                                <h3>Edit video with AI</h3>
                                <p>
                                    Choose a layer, choose a common edit, or describe the result you
                                    want. AI will prepare a video preview for you to review.
                                </p>
                                @if (templateElements().length) {
                                    <label class="ai-json-element-picker">
                                        <span>Select layer</span>
                                        <select
                                            [value]="identifiedElement()?.id ?? ''"
                                            [disabled]="jsonEditBusy() || loading()"
                                            (change)="
                                                selectTemplateElement($any($event.target).value)
                                            ">
                                            <option value="">Choose an element…</option>
                                            @for (element of templateElements(); track element.id) {
                                                <option [value]="element.id">
                                                    {{ element.name }} · {{ element.type }}
                                                </option>
                                            }
                                        </select>
                                    </label>
                                }
                                @if (identifiedElement(); as identified) {
                                    <div class="ai-json-target">
                                        <div>
                                            <span>Selected layer</span>
                                            <strong>{{ identified.name }}</strong>
                                            <small>{{ identified.type }}</small>
                                        </div>
                                        <button type="button" (click)="clearIdentifiedElement()">
                                            Clear
                                        </button>
                                    </div>
                                    <div class="ai-json-actions" aria-label="Suggested video edits">
                                        @for (
                                            suggestion of videoEditSuggestions();
                                            track suggestion.label
                                        ) {
                                            <button
                                                type="button"
                                                (click)="
                                                    applyVideoEditSuggestion(suggestion.instruction)
                                                ">
                                                {{ suggestion.label }}
                                            </button>
                                        }
                                    </div>
                                } @else {
                                    <div class="ai-json-tip">
                                        Choose a layer above, or select
                                        <strong>Identify elements</strong>
                                        and click it in the preview.
                                    </div>
                                }
                                <textarea
                                    rows="3"
                                    placeholder="e.g. Make the headline fade in over 0.5 seconds"
                                    [value]="jsonPrompt()"
                                    [disabled]="jsonEditBusy() || loading()"
                                    (input)="jsonPrompt.set($any($event.target).value)">
                                </textarea>
                                <button
                                    type="button"
                                    class="ai-json-apply"
                                    [disabled]="!jsonPrompt().trim() || jsonEditBusy() || loading()"
                                    (click)="askAiToEditJson()">
                                    {{ jsonEditBusy() ? 'Preparing preview…' : 'Preview AI edit' }}
                                </button>
                                @if (editedSummary()) {
                                    <div class="ai-json-summary">
                                        <div>
                                            <strong>AI preview ready</strong>
                                            <span>{{ editedSummary() }}</span>
                                            @if (editedChanges().length) {
                                                <ul>
                                                    @for (change of editedChanges(); track change) {
                                                        <li>{{ change }}</li>
                                                    }
                                                </ul>
                                            }
                                        </div>
                                        <button
                                            type="button"
                                            [disabled]="jsonEditBusy()"
                                            (click)="revertJsonEdit()">
                                            Undo preview
                                        </button>
                                    </div>
                                }
                                @if (jsonEditError()) {
                                    <div class="ai-json-error">{{ jsonEditError() }}</div>
                                }
                                @if (editedSource()) {
                                    <button
                                        type="button"
                                        class="ai-json-toggle"
                                        (click)="jsonViewOpen.set(!jsonViewOpen())">
                                        {{
                                            jsonViewOpen()
                                                ? 'Hide developer details'
                                                : 'Developer details'
                                        }}
                                    </button>
                                    @if (jsonViewOpen()) {
                                        <pre class="ai-json-view">{{ editedSourceJson() }}</pre>
                                    }
                                }
                            </div>
                        }
                    </aside>
                    <div class="comparison">
                        <article class="preview-pane">
                            <div class="pane-heading">
                                <div><strong>Original template</strong><span>Untouched</span></div>
                                <p>No imported values or AI sizing</p>
                            </div>
                            <div class="stage">
                                <div #originalContainer class="player"></div>
                                @if (originalLoading()) {
                                    <div class="loading">
                                        <i></i><span>Loading original template…</span>
                                    </div>
                                }
                                @if (originalError()) {
                                    <div class="error">
                                        <strong>Original preview unavailable</strong
                                        ><span>{{ originalError() }}</span>
                                    </div>
                                }
                            </div>
                        </article>
                        <article class="preview-pane populated">
                            <div class="pane-heading">
                                <div>
                                    <strong>{{
                                        fields().length ? 'AI populated' : 'Preview'
                                    }}</strong
                                    ><span>{{ fields().length ? 'Mapped' : 'Not mapped' }}</span>
                                </div>
                                <button
                                    type="button"
                                    class="identify-toggle"
                                    [class.active]="identifyMode()"
                                    [disabled]="loading()"
                                    (click)="toggleIdentifyMode()">
                                    {{ identifyMode() ? 'Done identifying' : 'Identify elements' }}
                                </button>
                            </div>
                            <div class="stage">
                                <div #populatedContainer class="player"></div>
                                @if (populatedLoading()) {
                                    <div class="loading">
                                        <i></i><span>Applying mapped values…</span>
                                    </div>
                                }
                                @if (populatedError()) {
                                    <div class="error">
                                        <strong>Populated preview unavailable</strong
                                        ><span>{{ populatedError() }}</span>
                                    </div>
                                }
                                @if (aiSuggestionsLoading()) {
                                    <div class="loading ai-injecting" aria-live="polite">
                                        <i></i>
                                        <span>Matching imported content to this template…</span>
                                    </div>
                                }
                                @if (identifyMode()) {
                                    <div class="identify-hint">Click an element in the video</div>
                                }
                                @if (identifiedElement(); as identified) {
                                    <div class="identify-badge">
                                        <span
                                            ><strong>{{ identified.name }}</strong
                                            >{{ identified.type }}</span
                                        >
                                        <button type="button" (click)="useIdentifiedInPrompt()">
                                            Use in prompt
                                        </button>
                                    </div>
                                }
                            </div>
                        </article>
                    </div>
                </div>
                <footer>
                    <span>The original stays unchanged. Only populated values are rendered.</span>
                    <div class="footer-actions">
                        @if (aiSuggestionsError()) {
                            <span class="ai-error">{{ aiSuggestionsError() }}</span>
                        }
                        @if (aiSuggestionsInjected()) {
                            <button
                                type="button"
                                class="revert-ai"
                                [disabled]="loading() || applying() || aiSuggestionsLoading()"
                                (click)="revertRequested.emit()">
                                Revert AI suggestions
                            </button>
                        }
                        @if (aiSuggestionsAvailable()) {
                            <button
                                type="button"
                                class="inject-ai"
                                [disabled]="loading() || applying() || aiSuggestionsLoading()"
                                (click)="aiSuggestionsRequested.emit()">
                                {{
                                    aiSuggestionsLoading()
                                        ? 'Injecting AI suggestions…'
                                        : aiSuggestionsInjected()
                                          ? 'Re-inject AI suggestions'
                                          : 'Inject AI suggestions'
                                }}
                            </button>
                        }
                        @if (fields().length || editedSource()) {
                            <button
                                type="button"
                                [disabled]="loading() || applying()"
                                (click)="apply()">
                                {{
                                    applying()
                                        ? 'Applying video edit…'
                                        : editedSource()
                                          ? 'Accept AI video edit'
                                          : 'Apply populated values'
                                }}
                            </button>
                        }
                    </div>
                </footer>
            </section>
        </div>
    `,
    styles: [
        `
            .preview-modal {
                position: fixed;
                z-index: 120;
                inset: 0;
                display: grid;
                place-items: center;
                padding: 24px;
            }
            .backdrop {
                position: absolute;
                inset: 0;
                width: 100%;
                border: 0;
                background: rgba(5, 13, 31, 0.82);
                backdrop-filter: blur(5px);
            }
            section {
                position: relative;
                z-index: 1;
                display: grid;
                grid-template-rows: auto minmax(0, 1fr) auto;
                width: min(1280px, 100%);
                max-height: calc(100dvh - 48px);
                overflow: hidden;
                border-radius: 16px;
                background: #fff;
                box-shadow: 0 30px 90px rgba(0, 0, 0, 0.42);
            }
            header {
                height: 70px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 22px;
                border-bottom: 1px solid #e8ebf0;
            }
            header span,
            header strong {
                display: block;
            }
            header span {
                color: #6842bd;
                font-size: 11px;
                font-weight: 900;
                letter-spacing: 1px;
            }
            header strong {
                margin-top: 4px;
                color: #273149;
                font-size: 17px;
            }
            header button {
                border: 0;
                background: transparent;
                color: #717b8c;
                font-size: 28px;
                cursor: pointer;
            }
            .workspace {
                min-height: 0;
                display: grid;
                grid-template-columns: 280px minmax(0, 1fr);
                height: min(620px, calc(100dvh - 186px));
            }
            .workspace.awaiting-mapping {
                grid-template-columns: 240px minmax(0, 1fr);
            }
            aside {
                height: 100%;
                box-sizing: border-box;
                overflow: auto;
                padding: 22px;
                background: #f7f8fb;
                border-right: 1px solid #e3e7ee;
            }
            .sidebar-tabs {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 4px;
                margin: -8px 0 18px;
                padding: 4px;
                border-radius: 8px;
                background: #e8ebf1;
            }
            .sidebar-tabs button {
                border: 0;
                border-radius: 6px;
                background: transparent;
                color: #687286;
                font: inherit;
                font-size: 11px;
                font-weight: 900;
                line-height: 1;
                padding: 8px 6px;
                cursor: pointer;
            }
            .sidebar-tabs button.active {
                background: #fff;
                color: #4a2d8f;
                box-shadow: 0 1px 3px rgba(37, 49, 73, 0.12);
            }
            aside h3 {
                margin: 0;
                color: #29344c;
                font-size: 17px;
            }
            aside > p {
                margin: 5px 0 18px;
                color: #7c8695;
                font-size: 12px;
                line-height: 1.5;
            }
            label {
                display: block;
                margin-bottom: 14px;
            }
            label span {
                display: block;
                margin-bottom: 6px;
                color: #535e73;
                font-size: 12px;
                font-weight: 900;
            }
            textarea {
                box-sizing: border-box;
                width: 100%;
                padding: 10px;
                border: 1px solid #d9dee7;
                border-radius: 7px;
                background: #fff;
                color: #273149;
                font: inherit;
                font-size: 13px;
                line-height: 1.45;
                resize: vertical;
                outline: none;
            }
            textarea:focus {
                border-color: #6b46c1;
                box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1);
            }
            .no-fields {
                padding: 14px;
                border-radius: 8px;
                background: #fff;
                color: #7c8695;
                font-size: 12px;
                line-height: 1.5;
            }
            .ai-json-editor {
                padding: 0;
            }
            .ai-json-editor h3 {
                margin: 0;
                color: #29344c;
                font-size: 14px;
            }
            .ai-json-editor > p {
                margin: 5px 0 10px;
                color: #7c8695;
                font-size: 12px;
                line-height: 1.5;
            }
            .ai-json-element-picker {
                display: block;
                margin-bottom: 9px;
            }
            .ai-json-element-picker > span {
                display: block;
                margin-bottom: 4px;
                color: #687286;
                font-size: 10px;
                font-weight: 900;
                letter-spacing: 0.4px;
                text-transform: uppercase;
            }
            .ai-json-element-picker select {
                box-sizing: border-box;
                width: 100%;
                padding: 8px 9px;
                border: 1px solid #d9dee7;
                border-radius: 7px;
                background: #fff;
                color: #273149;
                font: inherit;
                font-size: 12px;
            }
            .ai-json-target {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 8px;
                padding: 9px 10px;
                border-radius: 7px;
                background: #efe9fb;
                color: #4a2d8f;
            }
            .ai-json-target div {
                min-width: 0;
            }
            .ai-json-target span,
            .ai-json-target small {
                display: block;
                font-size: 10px;
                line-height: 1.35;
            }
            .ai-json-target span {
                color: #765bb5;
                font-weight: 800;
                text-transform: uppercase;
            }
            .ai-json-target strong {
                display: block;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-size: 12px;
            }
            .ai-json-target small {
                color: #765bb5;
            }
            .ai-json-target button,
            .ai-json-actions button {
                border: 1px solid #cbbce9;
                border-radius: 999px;
                background: #fff;
                color: #4a2d8f;
                font: inherit;
                font-size: 10px;
                font-weight: 900;
                cursor: pointer;
            }
            .ai-json-target button {
                flex: 0 0 auto;
                padding: 4px 8px;
            }
            .ai-json-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-bottom: 9px;
            }
            .ai-json-actions button {
                padding: 5px 8px;
            }
            .ai-json-actions button:hover,
            .ai-json-target button:hover {
                background: #f7f3ff;
            }
            .ai-json-tip {
                margin-bottom: 9px;
                color: #7c8695;
                font-size: 11px;
                line-height: 1.4;
            }
            .ai-json-editor textarea {
                box-sizing: border-box;
                width: 100%;
                padding: 10px;
                border: 1px solid #d9dee7;
                border-radius: 7px;
                background: #fff;
                color: #273149;
                font: inherit;
                font-size: 13px;
                line-height: 1.45;
                resize: vertical;
                outline: none;
            }
            .ai-json-editor textarea:focus {
                border-color: #6b46c1;
                box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1);
            }
            .ai-json-apply {
                width: 100%;
                margin-top: 8px;
                padding: 9px 12px;
                border: 0;
                border-radius: 7px;
                background: #29344c;
                color: #fff;
                font: inherit;
                font-size: 12px;
                font-weight: 900;
                cursor: pointer;
            }
            .ai-json-apply:disabled {
                background: #a7adb9;
                cursor: wait;
            }
            .ai-json-summary {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-top: 10px;
                padding: 8px 10px;
                border-radius: 7px;
                background: #efe9fb;
                color: #4a2d8f;
                font-size: 11px;
                line-height: 1.4;
            }
            .ai-json-summary > div {
                min-width: 0;
            }
            .ai-json-summary strong,
            .ai-json-summary span {
                display: block;
            }
            .ai-json-summary strong {
                margin-bottom: 2px;
            }
            .ai-json-summary ul {
                margin: 5px 0 0;
                padding-left: 16px;
            }
            .ai-json-summary button {
                flex: 0 0 auto;
                padding: 4px 8px;
                border: 1px solid #cbd0da;
                border-radius: 6px;
                background: #fff;
                color: #535e73;
                font: inherit;
                font-size: 10px;
                font-weight: 900;
                cursor: pointer;
            }
            .ai-json-error {
                margin-top: 8px;
                color: #b53a3a;
                font-size: 11px;
                line-height: 1.4;
            }
            .ai-json-toggle {
                width: 100%;
                margin-top: 8px;
                padding: 6px 8px;
                border: 1px solid #cbd0da;
                border-radius: 6px;
                background: #fff;
                color: #535e73;
                font: inherit;
                font-size: 11px;
                font-weight: 900;
                cursor: pointer;
            }
            .ai-json-view {
                max-height: 260px;
                margin: 8px 0 0;
                padding: 10px;
                overflow: auto;
                border-radius: 7px;
                background: #0a1122;
                color: #dbe3f2;
                font-family: 'SFMono-Regular', Consolas, monospace;
                font-size: 10px;
                line-height: 1.5;
                white-space: pre-wrap;
                word-break: break-word;
            }
            .identify-toggle {
                flex: 0 0 auto;
                padding: 4px 9px;
                border: 1px solid #38445e;
                border-radius: 999px;
                background: transparent;
                color: #dbe3f2;
                font: inherit;
                font-size: 10px;
                font-weight: 900;
                cursor: pointer;
            }
            .identify-toggle.active {
                border-color: #9bd538;
                background: #9bd538;
                color: #0a1122;
            }
            .identify-toggle:disabled {
                opacity: 0.5;
                cursor: wait;
            }
            .identify-hint {
                position: absolute;
                top: 10px;
                left: 50%;
                z-index: 1;
                padding: 6px 12px;
                border-radius: 999px;
                background: rgba(10, 17, 34, 0.85);
                color: #dbe3f2;
                font-size: 11px;
                transform: translateX(-50%);
                pointer-events: none;
            }
            .identify-badge {
                position: absolute;
                left: 10px;
                bottom: 10px;
                z-index: 1;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 8px 6px 10px;
                border-radius: 8px;
                background: rgba(10, 17, 34, 0.9);
                color: #dbe3f2;
                font-size: 11px;
            }
            .identify-badge strong {
                display: block;
                color: #9bd538;
                font-size: 12px;
            }
            .identify-badge button {
                flex: 0 0 auto;
                padding: 4px 8px;
                border: 0;
                border-radius: 6px;
                background: #6b46c1;
                color: #fff;
                font: inherit;
                font-size: 10px;
                font-weight: 900;
                cursor: pointer;
            }
            .comparison {
                min-width: 0;
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 1px;
                background: #dbe0e9;
            }
            .preview-pane {
                min-width: 0;
                display: grid;
                grid-template-rows: 58px minmax(0, 1fr);
                background: #0a1122;
            }
            .pane-heading {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 14px;
                padding: 0 16px;
                background: #fff;
                border-bottom: 1px solid #e3e7ee;
            }
            .pane-heading div {
                min-width: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .pane-heading strong {
                color: #29344c;
                font-size: 13px;
            }
            .pane-heading span {
                padding: 3px 7px;
                border-radius: 999px;
                background: #edf0f5;
                color: #687286;
                font-size: 9px;
                font-weight: 900;
                letter-spacing: 0.6px;
                text-transform: uppercase;
            }
            .populated .pane-heading span {
                background: #efe9fb;
                color: #6842bd;
            }
            .pane-heading p {
                margin: 0;
                color: #8a93a2;
                font-size: 10px;
                text-align: right;
            }
            .stage {
                position: relative;
                min-height: 0;
                display: grid;
                place-items: center;
                background: #0a1122;
            }
            .player {
                width: 100%;
                height: 100%;
                min-height: 0;
            }
            .loading,
            .error {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 20px;
                background: #0a1122;
                color: #dbe3f2;
                font-size: 13px;
            }
            .loading i {
                width: 24px;
                height: 24px;
                border: 3px solid #38445e;
                border-top-color: #9bd538;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }
            .ai-injecting {
                z-index: 2;
                background: rgba(10, 17, 34, 0.92);
            }
            .error {
                flex-direction: column;
                text-align: center;
            }
            .error strong {
                font-size: 16px;
            }
            .error span {
                max-width: 420px;
                color: #aeb9cd;
                line-height: 1.5;
            }
            @keyframes spin {
                to {
                    transform: rotate(360deg);
                }
            }
            .preview-modal > section > footer {
                position: relative;
                z-index: 2;
                pointer-events: auto;
                min-height: 68px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 18px;
                padding: 12px 22px;
                border-top: 1px solid #e8ebf0;
                background: #fff;
                color: #737d8d;
                font-size: 12px;
                box-shadow: 0 -8px 20px rgba(20, 31, 52, 0.05);
            }
            .preview-modal > section > footer button {
                min-height: 44px;
                flex: 0 0 auto;
                padding: 0 20px;
                border: 0;
                border-radius: 8px;
                background: #6b46c1;
                color: #fff;
                font: inherit;
                font-size: 13px;
                font-weight: 900;
                cursor: pointer;
            }
            .footer-actions {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 12px;
                min-width: 0;
            }
            .footer-actions .ai-error {
                max-width: 420px;
                color: #b53a3a;
                font-size: 11px;
                line-height: 1.4;
                text-align: right;
            }
            .preview-modal > section > footer button.inject-ai {
                border-color: #6c9824;
                background: #6c9824;
                color: #fff;
            }
            .preview-modal > section > footer button.revert-ai {
                border: 1px solid #cbd0da;
                background: #fff;
                color: #535e73;
            }
            .preview-modal > section > footer button.revert-ai:hover:not(:disabled) {
                background: #f3f4f7;
            }
            .preview-modal > section > footer button:hover:not(:disabled) {
                background: #5937a8;
            }
            .preview-modal > section > footer button:focus-visible {
                outline: 3px solid rgba(107, 70, 193, 0.25);
                outline-offset: 2px;
            }
            .preview-modal > section > footer button:disabled {
                background: #a99bc9;
                cursor: wait;
            }
            @media (max-width: 1050px) {
                .workspace {
                    grid-template-columns: 240px minmax(0, 1fr);
                }
                .comparison {
                    grid-template-columns: 1fr;
                    overflow: auto;
                }
                .preview-pane {
                    min-height: 420px;
                }
            }
            @media (max-width: 700px) {
                .preview-modal {
                    padding: 10px;
                }
                section {
                    max-height: calc(100dvh - 20px);
                }
                .workspace {
                    grid-template-columns: 1fr;
                    height: auto;
                    overflow: auto;
                }
                aside {
                    height: auto;
                    max-height: 220px;
                    border-right: 0;
                    border-bottom: 1px solid #e3e7ee;
                }
                .comparison {
                    overflow: visible;
                }
                .preview-pane {
                    min-height: 350px;
                }
                .pane-heading p {
                    display: none;
                }
                .preview-modal > section > footer {
                    align-items: stretch;
                    flex-direction: column;
                    gap: 10px;
                }
                .preview-modal > section > footer button {
                    width: 100%;
                }
                .footer-actions {
                    width: 100%;
                    align-items: stretch;
                    flex-direction: column;
                }
                .footer-actions .ai-error {
                    max-width: none;
                    text-align: left;
                }
            }
        `,
    ],
})
export class CreatomateTemplatePreviewComponent implements AfterViewInit, OnDestroy {
    private readonly service = inject(RealCreatomateService);
    private originalPreview?: Preview;
    private populatedPreview?: Preview;
    @ViewChild('originalContainer', { static: true })
    private readonly originalContainer!: ElementRef<HTMLDivElement>;
    @ViewChild('populatedContainer', { static: true })
    private readonly populatedContainer!: ElementRef<HTMLDivElement>;
    readonly template = input.required<CreatomateTemplate>();
    readonly templateSource = input<Record<string, unknown> | null>(null);
    readonly initialModifications = input<Record<string, string>>({});
    readonly aiSuggestionsAvailable = input(false);
    readonly aiSuggestionsInjected = input(false);
    readonly aiSuggestionsLoading = input(false);
    readonly aiSuggestionsError = input('');
    readonly closed = output<void>();
    readonly valuesApplied = output<Record<string, string>>();
    readonly sourceEdited = output<Record<string, unknown>>();
    readonly aiSuggestionsRequested = output<void>();
    readonly revertRequested = output<void>();
    readonly originalLoading = signal(true);
    readonly populatedLoading = signal(true);
    readonly loading = computed(() => this.originalLoading() || this.populatedLoading());
    readonly applying = signal(false);
    readonly originalError = signal('');
    readonly populatedError = signal('');
    private readonly fieldOverrides = signal<Record<string, string>>({});
    readonly editedSource = signal<Record<string, unknown> | null>(null);
    readonly editedSourceJson = computed(() => JSON.stringify(this.editedSource(), null, 2));
    readonly jsonViewOpen = signal(false);
    readonly editedSummary = signal('');
    readonly editedChanges = signal<string[]>([]);
    readonly jsonPrompt = signal('');
    readonly jsonEditBusy = signal(false);
    readonly jsonEditError = signal('');
    readonly sidebarTab = signal<'video' | 'properties'>('video');
    readonly identifyMode = signal(false);
    readonly identifiedElement = signal<TemplateElementTarget | null>(null);
    readonly effectiveSource = computed(() => this.editedSource() ?? this.templateSource());
    readonly templateElements = computed(() =>
        this.extractTemplateElements(this.effectiveSource()),
    );
    readonly videoEditSuggestions = computed<VideoEditSuggestion[]>(() => {
        const selected = this.identifiedElement();
        if (!selected) return [];
        const animation = [
            {
                label: 'Fade in',
                instruction: 'Add a fade-in animation to {layer} over 0.5 seconds.',
            },
            {
                label: 'Slide up',
                instruction: 'Add a slide-up entrance animation to {layer} over 0.5 seconds.',
            },
            {
                label: 'Scale in',
                instruction: 'Add a scale-in entrance animation to {layer} over 0.5 seconds.',
            },
            {
                label: 'Fade out',
                instruction: 'Add a fade-out animation to {layer} over 0.5 seconds.',
            },
        ];
        const layout = [
            { label: 'Move upper-right', instruction: 'Move {layer} to the upper-right corner.' },
            { label: 'Make larger', instruction: 'Increase {layer} size by 20%.' },
            { label: 'Make transparent', instruction: 'Set {layer} opacity to 60%.' },
        ];
        if (selected.type === 'text') {
            return [
                ...animation,
                ...layout,
                { label: 'Make bold', instruction: 'Make the text in {layer} bold.' },
                { label: 'Center text', instruction: 'Center-align the text in {layer}.' },
            ];
        }
        if (['image', 'video'].includes(selected.type)) {
            return [
                ...animation,
                ...layout,
                { label: 'Fill frame', instruction: 'Scale {layer} to fill its frame.' },
            ];
        }
        return [...animation, ...layout];
    });
    readonly fields = computed<Array<{ name: string; value: string }>>(() => {
        const elements = this.extractSourceElements(this.effectiveSource());
        const modifications = this.initialModifications();
        const overrides = this.fieldOverrides();
        if (!elements.length) {
            return Object.entries(modifications).map(([name, value]) => ({
                name,
                value: Object.prototype.hasOwnProperty.call(overrides, name)
                    ? overrides[name]
                    : value,
            }));
        }
        return elements.map(({ name, defaultValue }) => ({
            name,
            value: Object.prototype.hasOwnProperty.call(overrides, name)
                ? overrides[name]
                : Object.prototype.hasOwnProperty.call(modifications, name)
                  ? modifications[name]
                  : defaultValue,
        }));
    });
    private updateTimer?: ReturnType<typeof setTimeout>;
    private readonly resetOverridesOnTemplateChange = effect(() => {
        this.template();
        this.fieldOverrides.set({});
        this.editedSource.set(null);
        this.editedSummary.set('');
        this.editedChanges.set([]);
        this.jsonEditError.set('');
        this.jsonViewOpen.set(false);
        this.identifyMode.set(false);
        this.identifiedElement.set(null);
    });
    private readonly syncInjectedModifications = effect(() => {
        const modifications = this.initialModifications();
        if (!this.populatedPreview || this.populatedLoading()) return;
        this.fieldOverrides.set({});
        this.populatedError.set('');
        void this.populatedPreview.setModifications(modifications).catch((error: unknown) => {
            this.populatedError.set(
                error instanceof Error
                    ? error.message
                    : 'Unable to display the injected template values.',
            );
        });
    });

    async ngAfterViewInit(): Promise<void> {
        try {
            const { playerToken } = await this.service.getPreviewConfig();
            this.originalPreview = new Preview(
                this.originalContainer.nativeElement,
                'player',
                playerToken,
            );
            this.populatedPreview = new Preview(
                this.populatedContainer.nativeElement,
                'player',
                playerToken,
            );
            this.originalPreview.onReady = () => {
                void this.loadOriginal();
            };
            this.populatedPreview.onReady = () => {
                void this.loadPopulated();
            };
            this.populatedPreview.onActiveElementsChange = (elementIds) => {
                this.handleActiveElementsChange(elementIds);
            };
        } catch (error) {
            const message = this.service.errorMessage(error);
            this.originalError.set(message);
            this.populatedError.set(message);
            this.originalLoading.set(false);
            this.populatedLoading.set(false);
        }
    }

    ngOnDestroy(): void {
        if (this.updateTimer) clearTimeout(this.updateTimer);
        this.originalPreview?.dispose();
        this.populatedPreview?.dispose();
    }

    updateField(name: string, value: string): void {
        this.fieldOverrides.update((overrides) => ({ ...overrides, [name]: value }));
        if (this.updateTimer) clearTimeout(this.updateTimer);
        this.updateTimer = setTimeout(() => {
            void this.populatedPreview?.setModifications(this.modifications());
        }, 120);
    }

    async apply(): Promise<void> {
        if (this.loading() || this.applying()) return;
        if (this.updateTimer) clearTimeout(this.updateTimer);
        const modifications = this.modifications();
        this.applying.set(true);
        try {
            await this.populatedPreview?.setModifications(modifications);
            const edited = this.editedSource();
            if (edited) this.sourceEdited.emit(edited);
            this.valuesApplied.emit(modifications);
            this.closed.emit();
        } catch (error) {
            this.populatedError.set(
                error instanceof Error ? error.message : 'Unable to apply these template values.',
            );
        } finally {
            this.applying.set(false);
        }
    }

    async askAiToEditJson(): Promise<void> {
        const prompt = this.jsonPrompt().trim();
        if (!prompt || this.jsonEditBusy() || this.loading() || !this.populatedPreview) return;
        const currentSource = this.effectiveSource();
        if (!currentSource) return;
        this.jsonEditBusy.set(true);
        this.jsonEditError.set('');
        try {
            const selectedElement = this.identifiedElement();
            const result = await this.service.editTemplateSource(currentSource, prompt, {
                selectedElement: selectedElement ?? undefined,
            });
            await this.populatedPreview.setSource(result.source);
            await this.populatedPreview.setModifications(this.modifications());
            // The edited element may only appear partway through the timeline
            // (its own "time" offset), so time 0 often shows nothing different.
            // Seek to just after the changed element's entrance instead, then
            // play from there so the animation is immediately visible.
            const changedAt = this.changedElementTime(currentSource, result.source);
            await this.populatedPreview.setTime(changedAt !== null ? changedAt + 0.35 : 0);
            await this.populatedPreview.play();
            this.editedSource.set(result.source);
            this.editedSummary.set(result.summary);
            this.editedChanges.set(result.changes);
            this.jsonPrompt.set('');
        } catch (error) {
            this.jsonEditError.set(this.service.errorMessage(error));
        } finally {
            this.jsonEditBusy.set(false);
        }
    }

    async revertJsonEdit(): Promise<void> {
        if (this.jsonEditBusy() || !this.editedSource() || !this.populatedPreview) return;
        this.editedSource.set(null);
        this.editedSummary.set('');
        this.editedChanges.set([]);
        this.jsonEditError.set('');
        this.jsonViewOpen.set(false);
        this.populatedLoading.set(true);
        try {
            await this.loadPopulated();
        } catch (error) {
            this.populatedError.set(
                error instanceof Error ? error.message : 'Unable to revert the AI JSON edit.',
            );
        }
    }

    async toggleIdentifyMode(): Promise<void> {
        if (this.loading() || !this.populatedPreview) return;
        const next = !this.identifyMode();
        this.identifiedElement.set(null);
        try {
            await this.populatedPreview.setMode(next ? 'interactive' : 'player');
            if (!next) {
                await this.populatedPreview.setActiveElements([]);
                // Interactive mode allows dragging elements around; re-apply our
                // known-good source so an accidental drag never leaks into what
                // gets sent to the AI editor or the final render.
                const source = this.effectiveSource();
                if (source) await this.populatedPreview.setSource(source);
                await this.populatedPreview.setModifications(this.modifications());
            }
            this.identifyMode.set(next);
        } catch (error) {
            this.populatedError.set(
                error instanceof Error ? error.message : 'Unable to switch preview mode.',
            );
        }
    }

    useIdentifiedInPrompt(): void {
        const identified = this.identifiedElement();
        if (!identified) return;
        this.jsonPrompt.update((prompt) =>
            prompt.trim()
                ? `${prompt.trim()} for "${identified.name}"`
                : `Make "${identified.name}" `,
        );
    }

    applyVideoEditSuggestion(instruction: string): void {
        const identified = this.identifiedElement();
        if (!identified) return;
        const target = instruction.replace('{layer}', `"${identified.name}"`);
        this.jsonPrompt.update((prompt) => (prompt.trim() ? `${prompt.trim()} ${target}` : target));
    }

    clearIdentifiedElement(): void {
        this.identifiedElement.set(null);
    }

    selectTemplateElement(id: string): void {
        if (!id) {
            this.clearIdentifiedElement();
            return;
        }
        const element = this.templateElements().find((candidate) => candidate.id === id);
        if (element) this.identifiedElement.set(element);
    }

    private handleActiveElementsChange(elementIds: string[]): void {
        if (!elementIds.length || !this.populatedPreview) {
            this.identifiedElement.set(null);
            return;
        }
        const match = this.populatedPreview
            .getElements()
            .find((element) => element.source['id'] === elementIds[0]);
        if (!match) {
            this.identifiedElement.set(null);
            return;
        }
        const name = typeof match.source['name'] === 'string' ? match.source['name'] : 'Unnamed';
        this.identifiedElement.set({
            id: typeof match.source['id'] === 'string' ? match.source['id'] : name,
            name,
            type: typeof match.source['type'] === 'string' ? match.source['type'] : 'unknown',
        });
    }

    private async loadOriginal(): Promise<void> {
        if (!this.originalPreview) return;
        try {
            await this.originalPreview.loadTemplate(this.template().id);
            await this.originalPreview.setTime(0);
            this.originalLoading.set(false);
        } catch (error) {
            this.originalError.set(
                error instanceof Error ? error.message : 'Unable to load the original template.',
            );
            this.originalLoading.set(false);
        }
    }

    private async loadPopulated(): Promise<void> {
        if (!this.populatedPreview) return;
        try {
            await this.populatedPreview.loadTemplate(this.template().id);
            await this.populatedPreview.setModifications(this.modifications());
            this.populatedLoading.set(false);
        } catch (error) {
            this.populatedError.set(
                error instanceof Error
                    ? error.message
                    : 'Unable to load the populated Creatomate template.',
            );
            this.populatedLoading.set(false);
        }
    }

    private modifications(): Record<string, string> {
        return Object.fromEntries(this.fields().map((field) => [field.name, field.value]));
    }

    /**
     * Finds the earliest on-timeline "time" among named elements whose "animations"
     * array changed between the previous and new source, so the preview can seek
     * straight to when the edit becomes visible instead of always time 0.
     */
    private changedElementTime(
        previous: Record<string, unknown> | null,
        next: Record<string, unknown>,
    ): number | null {
        const collect = (
            source: Record<string, unknown> | null,
        ): Map<string, { time: number; animations: string }> => {
            const map = new Map<string, { time: number; animations: string }>();
            const walk = (value: unknown): void => {
                if (Array.isArray(value)) {
                    value.forEach(walk);
                    return;
                }
                if (!value || typeof value !== 'object') return;
                const element = value as Record<string, unknown>;
                const name = typeof element['name'] === 'string' ? element['name'] : '';
                if (name) {
                    map.set(name, {
                        time: typeof element['time'] === 'number' ? element['time'] : 0,
                        animations: JSON.stringify(element['animations'] ?? []),
                    });
                }
                Object.values(element).forEach(walk);
            };
            if (source) walk(source);
            return map;
        };
        const before = collect(previous);
        const after = collect(next);
        let earliest: number | null = null;
        for (const [name, info] of after) {
            const prior = before.get(name);
            if (!prior || prior.animations !== info.animations) {
                if (earliest === null || info.time < earliest) earliest = info.time;
            }
        }
        return earliest;
    }

    private extractSourceElements(
        source: Record<string, unknown> | null,
    ): Array<{ name: string; defaultValue: string }> {
        if (!source) return [];
        const elements: Array<{ name: string; defaultValue: string }> = [];
        const seen = new Set<string>();
        const walk = (value: unknown): void => {
            if (Array.isArray(value)) {
                value.forEach(walk);
                return;
            }
            if (!value || typeof value !== 'object') return;
            const element = value as Record<string, unknown>;
            const type = typeof element['type'] === 'string' ? element['type'] : '';
            const name = typeof element['name'] === 'string' ? element['name'] : '';
            if (name && !seen.has(name) && ['text', 'image', 'video'].includes(type)) {
                seen.add(name);
                const defaultValue =
                    type === 'text'
                        ? typeof element['text'] === 'string'
                            ? element['text']
                            : ''
                        : typeof element['source'] === 'string'
                          ? element['source']
                          : '';
                elements.push({ name, defaultValue });
            }
            Object.values(element).forEach(walk);
        };
        walk(source);
        return elements;
    }

    private extractTemplateElements(
        source: Record<string, unknown> | null,
    ): TemplateElementTarget[] {
        if (!source) return [];
        const elements: TemplateElementTarget[] = [];
        const seen = new Set<string>();
        const walk = (value: unknown): void => {
            if (Array.isArray(value)) {
                value.forEach(walk);
                return;
            }
            if (!value || typeof value !== 'object') return;
            const element = value as Record<string, unknown>;
            const name = typeof element['name'] === 'string' ? element['name'] : '';
            const type = typeof element['type'] === 'string' ? element['type'] : '';
            const id = typeof element['id'] === 'string' ? element['id'] : '';
            if (name && type && id && !seen.has(id)) {
                seen.add(id);
                elements.push({ id, name, type });
            }
            Object.values(element).forEach(walk);
        };
        walk(source);
        return elements;
    }
}
