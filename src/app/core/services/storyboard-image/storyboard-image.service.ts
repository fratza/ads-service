import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type StoryboardImageOutput = 'outside' | 'inside' | 'vertical';

interface StoryboardImageResponse {
    model: string;
    dataUrl: string;
}

@Injectable({ providedIn: 'root' })
export class StoryboardImageService {
    private readonly http = inject(HttpClient);

    async generate(prompt: string, output: StoryboardImageOutput): Promise<StoryboardImageResponse> {
        return firstValueFrom(
            this.http.post<StoryboardImageResponse>('/api/storyboard-images/generate', {
                prompt,
                output,
            }),
        );
    }
}
