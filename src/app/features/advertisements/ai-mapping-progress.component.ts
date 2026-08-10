import { Component, OnDestroy, computed, signal } from '@angular/core';

@Component({
    selector: 'app-ai-mapping-progress',
    standalone: true,
    template: `
        <div class="overlay" role="status" aria-live="polite">
            <section aria-label="AI suggestion progress">
                <div class="spinner" aria-hidden="true"><i></i><span>AI</span></div>
                <span class="eyebrow">AI TEMPLATE MAPPING</span>
                <h2>Injecting AI suggestions</h2>
                <p>{{ stages[step()] }}</p>
                <div
                    class="track"
                    role="progressbar"
                    aria-label="AI suggestion progress"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    [attr.aria-valuenow]="percent()">
                    <span [style.width.%]="percent()"></span>
                </div>
                <ol>
                    @for (stage of stages; track stage; let index = $index) {
                        <li [class.complete]="step() > index" [class.active]="step() === index">
                            <i>{{ step() > index ? '✓' : index + 1 }}</i
                            ><span>{{ stage }}</span>
                        </li>
                    }
                </ol>
                <small>Please keep this window open. This may take a few seconds.</small>
            </section>
        </div>
    `,
    styles: `
        .overlay {
            position: fixed;
            z-index: 1000;
            inset: 0;
            display: grid;
            place-items: center;
            padding: 20px;
            pointer-events: auto;
            background: rgba(5, 13, 31, 0.78);
            backdrop-filter: blur(5px);
        }
        section {
            box-sizing: border-box;
            width: min(440px, 100%);
            padding: 32px;
            border: 1px solid rgba(255, 255, 255, 0.7);
            border-radius: 16px;
            background: #fff;
            box-shadow: 0 28px 80px rgba(0, 0, 0, 0.42);
            text-align: center;
        }
        .spinner {
            position: relative;
            width: 64px;
            height: 64px;
            display: grid;
            place-items: center;
            margin: 0 auto 18px;
        }
        .spinner i {
            position: absolute;
            inset: 0;
            border: 4px solid #e5ecd9;
            border-top-color: #6c9824;
            border-radius: 50%;
            animation: spin 0.9s linear infinite;
        }
        .spinner span {
            color: #5f8b1d;
            font-size: 13px;
            font-weight: 950;
        }
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
        .eyebrow {
            color: #6c9824;
            font-size: 10px;
            font-weight: 950;
            letter-spacing: 1.2px;
        }
        h2 {
            margin: 7px 0 6px;
            color: #273149;
            font-size: 22px;
        }
        section > p {
            min-height: 20px;
            margin: 0 0 20px;
            color: #6f798a;
            font-size: 13px;
        }
        .track {
            height: 7px;
            overflow: hidden;
            border-radius: 999px;
            background: #e9edf2;
        }
        .track span {
            display: block;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, #77a92b, #9bd538);
            transition: width 0.45s ease;
        }
        ol {
            display: grid;
            gap: 11px;
            margin: 22px 0 20px;
            padding: 0;
            list-style: none;
            text-align: left;
        }
        li {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #9aa2af;
            font-size: 12px;
            font-weight: 800;
        }
        li i {
            width: 24px;
            height: 24px;
            flex: 0 0 auto;
            display: grid;
            place-items: center;
            border: 1px solid #dce1e8;
            border-radius: 50%;
            background: #f7f8fa;
            font-style: normal;
            font-size: 10px;
        }
        li.active {
            color: #39445a;
        }
        li.active i {
            border-color: #8fbd4a;
            background: #eff7e4;
            color: #5f8b1d;
            box-shadow: 0 0 0 4px rgba(108, 152, 36, 0.1);
        }
        li.complete {
            color: #5f8b1d;
        }
        li.complete i {
            border-color: #6c9824;
            background: #6c9824;
            color: #fff;
        }
        small {
            color: #8a93a2;
            font-size: 11px;
        }
    `,
})
export class AiMappingProgressComponent implements OnDestroy {
    readonly stages = [
        'Analyzing template fields',
        'Matching imported content and assets',
        'Validating layout and preparing the preview',
    ] as const;
    readonly step = signal(0);
    readonly percent = computed(() => [28, 62, 88][this.step()]);
    private readonly timer = setInterval(() => {
        this.step.update((step) => Math.min(step + 1, 2));
    }, 2_200);

    ngOnDestroy(): void {
        clearInterval(this.timer);
    }
}
