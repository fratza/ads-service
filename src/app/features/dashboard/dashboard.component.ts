/** Angular Imports */
import { Component } from '@angular/core';

/** Third Party Imports */
import { Button, Card } from '@ntv360/component-pantry';

@Component({
    selector: 'app-dashboard',
    imports: [Button, Card],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
    standalone: true,
})
export class DashboardComponent {
    onButtonClick(event: Event): void {
        console.log('Button clicked!', event);
    }
}
