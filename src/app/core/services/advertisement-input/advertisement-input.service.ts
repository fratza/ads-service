import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
    AdvertisementImportPreview,
    AdvertisementRequest,
    AdvertisementRequestInput,
} from '@core/models';
import { firstValueFrom } from 'rxjs';

interface ImportResult {
    recordIndex: number;
    success: boolean;
    duplicate?: boolean;
    data?: AdvertisementRequest;
}

export interface GoogleSheetImportPreview {
    previews: AdvertisementImportPreview[];
    spreadsheetId: string;
    gid: string;
}

const HEADER_ALIASES: Record<string, string> = {
    dealer: 'dealerNumber',
    dealernumber: 'dealerNumber',
    dealeremail: 'dealerEmail',
    business: 'businessName',
    businessname: 'businessName',
    adlength: 'generalAdLength',
    generaladlength: 'generalAdLength',
    logo: 'hasLogo',
    haslogo: 'hasLogo',
    website: 'website',
    phone: 'phone',
    address: 'address',
    socialmedia: 'socialMedia',
    highlights: 'highlights',
    filesharelink: 'fileShareLink',
    outsidead: 'generateOutsideAd',
    generateoutsidead: 'generateOutsideAd',
    outsideadlength: 'outsideAdLength',
    outsidemessages: 'outsideMessages',
    insidead: 'generateInsideAd',
    generateinsidead: 'generateInsideAd',
    insideadlength: 'insideAdLength',
    insidemessages: 'insideMessages',
    verticalads: 'generateVerticalAds',
    generateverticalads: 'generateVerticalAds',
    verticalquantity: 'verticalQuantity',
    verticalmessages: 'verticalMessages',
    generateqrcode: 'generateQrCode',
    likescurrentwebsite: 'likesCurrentWebsite',
};

const VERTICAL_SHEET_ALIASES: Record<string, string> = {
    andacronym: 'dealerNumber',
    numberandacronym: 'dealerNumber',
    dealerandacronym: 'dealerNumber',
    franchiseemail: 'dealerEmail',
    dealeremail: 'dealerEmail',
    lengthofad: 'generalAdLength',
    nameofbusiness: 'businessName',
    logo: 'hasLogo',
    phonenumber: 'phone',
    website: 'website',
    wouldyouliketheurldisplayedasaqrcode: 'generateQrCode',
    doesclientliketheirwebsite: 'likesCurrentWebsite',
    messagingmustbeprovided: 'outsideMessages',
    googledrivesharelink: 'fileShareLink',
    pictures: 'highlights',
};

@Injectable({ providedIn: 'root' })
export class AdvertisementInputService {
    private readonly http = inject(HttpClient);

    async previewFile(file: File): Promise<AdvertisementImportPreview[]> {
        const records = this.parseFile(file.name, await file.text());
        return this.previewRecords(records);
    }

    async previewGoogleSheet(url: string): Promise<GoogleSheetImportPreview> {
        const response = await firstValueFrom(
            this.http.post<{
                data: { csv: string; spreadsheetId: string; gid: string };
            }>('/api/advertisement-requests/imports/google-sheet', { url }),
        );
        const records = this.parseCsv(response.data.csv);
        const previews = await this.previewRecords(records);
        return { previews, spreadsheetId: response.data.spreadsheetId, gid: response.data.gid };
    }

    private async previewRecords(records: unknown[]): Promise<AdvertisementImportPreview[]> {
        const response = await firstValueFrom(
            this.http.post<{ data: AdvertisementImportPreview[] }>(
                '/api/advertisement-requests/imports/preview',
                { records },
            ),
        );
        return response.data;
    }

    async import(inputs: AdvertisementRequestInput[], file: File): Promise<ImportResult[]> {
        const idempotencyKeyPrefix = [file.name, file.size, file.lastModified].join(':');
        return this.importRecords(inputs, this.provider(file.name), idempotencyKeyPrefix);
    }

    importGoogleSheet(
        inputs: AdvertisementRequestInput[],
        spreadsheetId: string,
        gid: string,
    ): Promise<ImportResult[]> {
        return this.importRecords(inputs, 'google-sheets', `${spreadsheetId}:${gid}`);
    }

    private async importRecords(
        inputs: AdvertisementRequestInput[],
        provider: string,
        idempotencyKeyPrefix: string,
    ): Promise<ImportResult[]> {
        const response = await firstValueFrom(
            this.http.post<{ data: ImportResult[] }>('/api/advertisement-requests/imports', {
                records: inputs,
                provider,
                idempotencyKeyPrefix,
            }),
        );
        return response.data;
    }

    private parseFile(fileName: string, contents: string): unknown[] {
        if (/\.json$/i.test(fileName)) {
            const parsed = JSON.parse(contents) as unknown;
            if (Array.isArray(parsed)) return parsed;
            if (
                parsed &&
                typeof parsed === 'object' &&
                Array.isArray((parsed as { records?: unknown[] }).records)
            ) {
                return (parsed as { records: unknown[] }).records;
            }
            return [parsed];
        }
        if (!/\.csv$/i.test(fileName)) {
            throw new Error('UNSUPPORTED_IMPORT_FORMAT');
        }
        return this.parseCsv(contents);
    }

    private parseCsv(contents: string): Record<string, unknown>[] {
        const rows: string[][] = [];
        let row: string[] = [];
        let cell = '';
        let quoted = false;

        for (let index = 0; index < contents.length; index += 1) {
            const character = contents[index];
            const next = contents[index + 1];
            if (character === '"' && quoted && next === '"') {
                cell += '"';
                index += 1;
            } else if (character === '"') {
                quoted = !quoted;
            } else if (character === ',' && !quoted) {
                row.push(cell);
                cell = '';
            } else if ((character === '\n' || character === '\r') && !quoted) {
                if (character === '\r' && next === '\n') index += 1;
                row.push(cell);
                if (row.some((value) => value.trim())) rows.push(row);
                row = [];
                cell = '';
            } else {
                cell += character;
            }
        }
        row.push(cell);
        if (row.some((value) => value.trim())) rows.push(row);
        if (rows.length < 2) return [];

        const vertical = this.verticalRecord(rows);
        if (vertical) return [vertical];

        const headers = rows[0].map((header) => this.headerKey(header));
        return rows
            .slice(1)
            .map((values) =>
                Object.fromEntries(
                    headers.map((header, index) => [header, this.cellValue(values[index] ?? '')]),
                ),
            );
    }

    private verticalRecord(rows: string[][]): Record<string, unknown> | null {
        const pairs = rows
            .map(([label = '', value = '']) => ({ key: this.compact(label), label, value }))
            .filter(({ key }) => VERTICAL_SHEET_ALIASES[key]);
        if (pairs.length < 3) return null;

        const record: Record<string, unknown> = {};
        const notes: string[] = [];
        for (const pair of pairs) {
            const key = VERTICAL_SHEET_ALIASES[pair.key];
            if (key === 'highlights') {
                if (pair.value.trim()) notes.push(`Pictures: ${this.cleanSlideText(pair.value)}`);
                continue;
            }
            if (key === 'outsideMessages') {
                record[key] = this.cleanSlideText(pair.value);
                continue;
            }
            if (key === 'generalAdLength') {
                const seconds = pair.value.match(/\d+(?:\.\d+)?/)?.[0];
                record[key] = seconds ? Number(seconds) : pair.value;
                record['outsideAdLength'] = record[key];
                continue;
            }
            if (key === 'website') {
                const website = pair.value.trim();
                record[key] =
                    website && !/^https?:\/\//i.test(website) ? `https://${website}` : website;
                continue;
            }
            record[key] = this.cellValue(pair.value);
        }
        if (notes.length) record['highlights'] = notes.join('\n');
        const externalId = rows.find((row) => row[0]?.trim() && !row[1]?.trim())?.[0]?.trim();
        if (externalId) record['externalId'] = externalId;
        return record;
    }

    private cleanSlideText(value: string): string {
        return value
            .split(/\r?\n/)
            .map((line) => line.trim().replace(/^slide\s*\d+\s*[-:–—]\s*/i, ''))
            .filter(Boolean)
            .join('|');
    }

    private headerKey(header: string): string {
        const compact = this.compact(header);
        return HEADER_ALIASES[compact] ?? header.trim();
    }

    private compact(value: string): string {
        return value
            .trim()
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase();
    }

    private cellValue(raw: string): unknown {
        const value = raw.trim();
        if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
        if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
        if (
            (value.startsWith('[') && value.endsWith(']')) ||
            (value.startsWith('{') && value.endsWith('}'))
        ) {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        return value;
    }

    private provider(fileName: string): string {
        return /\.csv$/i.test(fileName) ? 'csv' : 'json';
    }
}
