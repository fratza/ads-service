import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface AdvertisementIdeaScene {
    purpose: string;
    duration: number;
    headline: string;
    supportingText: string;
    footage: string;
    overlays: string;
    typography: string;
    prompt: string;
}

export interface AdvertisementIdea {
    conceptTitle: string;
    hook: string;
    footageDirection: string;
    graphicsDirection: string;
    typographyDirection: string;
    editDirection: string;
    scenes: AdvertisementIdeaScene[];
}

@Injectable({ providedIn: 'root' })
export class AdvertisementIdeaService {
    private readonly http = inject(HttpClient);

    async generate(context: string): Promise<AdvertisementIdea> {
        return firstValueFrom(
            this.http.post<AdvertisementIdea>('/api/advertisement-ideas/generate', { context }),
        );
    }
}
