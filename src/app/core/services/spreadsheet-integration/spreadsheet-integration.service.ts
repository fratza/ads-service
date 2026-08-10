import { Injectable } from '@angular/core';

export const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/13CCZ6uYFReMrqBpyn_FtcyNQF0G7liafXsb1fbIbCbc/edit?usp=sharing';

export interface SpreadsheetMockRecord {
    dealerNumber: string; dealerEmail: string; generalAdLength: number; businessName: string; hasLogo: boolean;
    website: string; phone: string; address: string; generateQrCode: boolean; likesCurrentWebsite: boolean;
    generateOutsideAd: boolean; outsideAdLength: number; outsideMessages: { headline: string }[];
    generateInsideAd: boolean; insideAdLength: number; insideMessages: { headline: string }[];
    generateVerticalAds: boolean; verticalQuantity: number; verticalMessages: { headline: string }[];
}

@Injectable({ providedIn: 'root' })
export class SpreadsheetIntegrationService {
    readonly spreadsheetUrl = SPREADSHEET_URL;

    importMockRecord(): SpreadsheetMockRecord {
        // TODO: Replace this mock with Google Sheets API integration in the backend phase.
        return {
            dealerNumber: '515SSD', dealerEmail: 'lydia@sunscreendigital.com', generalAdLength: 20,
            businessName: 'The Distinguished Beast', hasLogo: true, website: 'https://thedistinguishedbeast.com',
            phone: '(+63) 912 345 6789', address: 'HM Tower, IT Park, Cebu City, Philippines', generateQrCode: true,
            likesCurrentWebsite: true, generateOutsideAd: true, outsideAdLength: 15,
            outsideMessages: ["Houston's Tex-Mex Favorite Awaits", 'Family Recipes. Fresh Flavor.', 'Happy Hour Starts Here.'].map((headline) => ({ headline })),
            generateInsideAd: true, insideAdLength: 30,
            insideMessages: ['Add Queso to every order.', 'Try a House Margarita today.', 'Upgrade to a Jumbo Rita.'].map((headline) => ({ headline })),
            generateVerticalAds: true, verticalQuantity: 1, verticalMessages: [{ headline: 'Happy Hour Starts Here' }],
        };
    }
}
