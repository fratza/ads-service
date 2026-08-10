import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
    selector: 'app-client-request-complete',
    standalone: true,
    imports: [RouterLink],
    template: `
        <main class="complete-page">
            <section>
                <div class="brand"><span>N</span><strong>NTV360</strong></div>
                <div class="check">✓</div>
                <span class="eyebrow">CREATIVE BRIEF RECEIVED</span>
                <h1>Thank you for sharing your advertisement details.</h1>
                <p>Your brief has been prepared for review. An NTV360 representative will check the content and assets before anything is mapped or sent to Creatomate.</p>
                <div class="reference"><span>Request link reference</span><strong>{{ token }}</strong></div>
                <a [routerLink]="['/client/request', token]">Review your answers</a>
                <small>Your submission is now available to the NTV360 team in the shared dashboard.</small>
            </section>
        </main>
    `,
    styles: [`
        :host { display:block; min-height:100vh; }
        .complete-page { min-height:100vh; display:grid; place-items:center; padding:28px; background:radial-gradient(circle at top,#eef3ff,#f6f7fb 48%); }
        section { width:min(660px,100%); padding:46px; border:1px solid #e1e6ee; border-radius:20px; background:#fff; box-shadow:0 20px 55px rgba(9,22,53,.1); text-align:center; }
        .brand { display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:32px; color:#101c38; font-size:20px; }
        .brand span { display:grid; place-items:center; width:42px; height:42px; border-radius:11px; background:#0b1835; color:#8dcb2c; font-weight:900; }
        .check { display:grid; place-items:center; width:68px; height:68px; margin:0 auto 20px; border-radius:50%; background:#edf7dc; color:#6e9e21; font-size:30px; font-weight:900; }
        .eyebrow { color:#6e9e21; font-size:12px; font-weight:900; letter-spacing:1.2px; }
        h1 { margin:10px 0 14px; color:#18233d; font-size:32px; line-height:1.2; }
        p { margin:0 auto; color:#667286; font-size:15px; line-height:1.7; }
        .reference { display:flex; justify-content:space-between; gap:16px; padding:16px 18px; margin:26px 0; border-radius:10px; background:#f5f7fa; color:#697487; font-size:13px; }
        .reference strong { color:#26334d; }
        a { display:inline-flex; min-height:44px; align-items:center; padding:0 18px; border-radius:8px; background:#4064b4; color:#fff; font-size:14px; font-weight:800; text-decoration:none; }
        small { display:block; margin-top:22px; color:#8b94a3; font-size:12px; }
        @media(max-width:600px){section{padding:32px 22px}h1{font-size:26px}.reference{flex-direction:column}}
    `],
})
export class ClientRequestCompleteComponent {
    private readonly route = inject(ActivatedRoute);
    readonly token = this.route.snapshot.paramMap.get('token') ?? 'unknown';
}
