import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import ar from '../../../messages/ar.json';

describe('Bilingual EN/AR Translation Key Integrity Regression', () => {
  it('defines all unit availability, property status, and video status keys in EN and AR', () => {
    const requiredAvailabilities = [
      'available',
      'reserved',
      'under_offer',
      'coming_soon',
      'sold',
    ] as const;
    const requiredStatuses = [
      'ready',
      'off_plan',
      'rent',
      'reserved',
      'sold',
    ] as const;
    const requiredVideoStatuses = [
      'draft',
      'uploading',
      'processing',
      'in_review',
      'ready',
      'failed',
    ] as const;

    for (const key of requiredAvailabilities) {
      expect(en.availabilities[key]).toBeTruthy();
      expect(ar.availabilities[key]).toBeTruthy();
    }
    for (const key of requiredStatuses) {
      expect(en.statuses[key]).toBeTruthy();
      expect(ar.statuses[key]).toBeTruthy();
    }
    for (const key of requiredVideoStatuses) {
      expect(en.videoStatus[key]).toBeTruthy();
      expect(ar.videoStatus[key]).toBeTruthy();
    }
    expect(en.proximity.onSite).toBeTruthy();
    expect(ar.proximity.onSite).toBeTruthy();
    expect(en.calculator.title).toBeTruthy();
    expect(ar.calculator.title).toBeTruthy();
    expect(en.teleprompter.step1).toBeTruthy();
    expect(ar.teleprompter.step1).toBeTruthy();
    expect(en.floorplan.title).toBeTruthy();
    expect(ar.floorplan.title).toBeTruthy();
    expect(en.aiStudio.title).toBeTruthy();
    expect(ar.aiStudio.title).toBeTruthy();
    expect(en.presentation.floorplanView).toBeTruthy();
    expect(ar.presentation.floorplanView).toBeTruthy();
  });
});
