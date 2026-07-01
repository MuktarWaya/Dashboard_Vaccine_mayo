/**
 * Service สำหรับเชื่อมต่อกับ Google Apps Script API
 * ดึงข้อมูลวัคซีนรายเดือนจาก GAS Web App
 */

import React from 'react';
import type {
  PublicDashboardData,
  ExecutiveDashboardData,
  AdminLoginResponse,
  GeneratedUnitTokenResponse,
  ServiceUnitSettingView,
} from '@/types/vaccine';
import { buildNotReadyDashboardData } from './dashboardViewModel';

// TODO: ใส่ GAS Web App URL ของคุณที่นี่
export const GAS_WEB_APP_URL = import.meta.env.VITE_GAS_WEB_APP_URL || 'YOUR_GAS_WEB_APP_URL_HERE';

/**
 * Generic fetch wrapper สำหรับ GAS API
 * Google Apps Script ต้องใช้ mode: 'no-cors' หรือ proxy
 */
async function fetchGAS<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const queryString = new URLSearchParams(params).toString();
  const url = `${GAS_WEB_APP_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

  try {
    // ในการใช้งานจริง อาจต้องใช้ proxy เพื่อ bypass CORS
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors', // หรือใช้ proxy แทน
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('GAS API Error:', error);
    throw error;
  }
}

/**
 * POST helper สำหรับ GAS API
 */
async function postGAS<T>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Build settings payload พร้อม session token
 */
export function buildSettingsPayload(sessionToken: string, payload: Record<string, unknown>): RequestInit {
  return {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, sessionToken }),
  };
}

/**
 * Admin login
 */
export async function adminLogin(password: string): Promise<AdminLoginResponse> {
  return postGAS<AdminLoginResponse>({ action: 'adminLogin', password });
}

/**
 * Get service unit settings
 */
export async function getSettings(sessionToken: string): Promise<ServiceUnitSettingView[]> {
  return postGAS<ServiceUnitSettingView[]>({ action: 'getSettings', sessionToken });
}

/**
 * Save service unit settings
 */
export async function saveSettings(sessionToken: string, settings: ServiceUnitSettingView[]): Promise<{ status: string }> {
  return postGAS<{ status: string }>({ action: 'saveSettings', sessionToken, settings });
}

/**
 * Test unit connection
 */
export async function testUnitConnection(sessionToken: string, serviceUnitCode: string): Promise<{ ok: boolean; message: string }> {
  return postGAS<{ ok: boolean; message: string }>({ action: 'testUnitConnection', sessionToken, serviceUnitCode });
}

/**
 * Generate and persist a new service-unit token hash on Central GAS.
 * The raw token is returned only once for Code.gs installation.
 */
export async function generateUnitToken(sessionToken: string, serviceUnitCode: string): Promise<GeneratedUnitTokenResponse> {
  return postGAS<GeneratedUnitTokenResponse>({ action: 'generateUnitToken', sessionToken, serviceUnitCode });
}

export function generateUnitCodeGsTemplate(input: {
  centralApiUrl: string;
  serviceUnitCode: string;
  serviceUnitName: string;
  sheetName: string;
  token: string;
}): string {
  return `const DASHBOARD_VACCINE_API_URL = ${JSON.stringify(input.centralApiUrl)};
const SERVICE_UNIT_CODE = ${JSON.stringify(input.serviceUnitCode)};
const SERVICE_UNIT_NAME = ${JSON.stringify(input.serviceUnitName)};
const SOURCE_SHEET_NAME = ${JSON.stringify(input.sheetName)};
const UNIT_TOKEN = ${JSON.stringify(input.token)};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Dashboard Vaccine')
    .addItem('ส่งข้อมูลรายเดือน', 'submitCurrentMonthAggregate')
    .addToUi();
}

function submitCurrentMonthAggregate() {
  const reportMonth = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM');
  const payload = buildMonthlyAggregate(reportMonth);
  const response = UrlFetchApp.fetch(DASHBOARD_VACCINE_API_URL + '?action=submitUnitMonthly', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  SpreadsheetApp.getUi().alert(response.getContentText());
}

function buildMonthlyAggregate(reportMonth) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SOURCE_SHEET_NAME);
  if (!sheet) throw new Error('ไม่พบชีต ' + SOURCE_SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const rows = values.slice(1);
  const statusIndex = headers.indexOf('สถานะวัคซีน');
  if (statusIndex === -1) throw new Error('ไม่พบคอลัมน์ สถานะวัคซีน');

  const counts = {
    totalChildren: rows.filter(function(row) { return row.join('').trim() !== ''; }).length,
    onSchedule: 0,
    delayed: 0,
    refused: 0,
    postponed: 0,
    notFound: 0,
    followedUp: 0,
  };

  rows.forEach(function(row) {
    const status = String(row[statusIndex] || '').trim();
    if (status === 'ตามกำหนด') counts.onSchedule += 1;
    else if (status === 'ล่าช้า') counts.delayed += 1;
    else if (status === 'ปฏิเสธ') counts.refused += 1;
    else if (status === 'เลื่อนนัด') counts.postponed += 1;
    else if (status === 'ไม่พบ') counts.notFound += 1;
    else if (status) counts.followedUp += 1;
  });

  return {
    serviceUnitCode: SERVICE_UNIT_CODE,
    reportMonth: reportMonth,
    totalChildren: counts.totalChildren,
    onSchedule: counts.onSchedule,
    delayed: counts.delayed,
    refused: counts.refused,
    postponed: counts.postponed,
    notFound: counts.notFound,
    followedUp: counts.followedUp,
    submittedAt: new Date().toISOString(),
    token: UNIT_TOKEN,
  };
}
`;
}

/**
 * ดึงข้อมูล Public Dashboard
 */
export async function fetchPublicDashboard(month?: string): Promise<PublicDashboardData> {
  return fetchGAS<PublicDashboardData>('', {
    format: 'json',
    action: 'publicDashboard',
    month: month || new Date().toISOString().slice(0, 7),
  });
}

/**
 * ดึงข้อมูล Executive Dashboard (ต้อง authentication)
 */
export async function fetchExecutiveDashboard(month?: string): Promise<ExecutiveDashboardData> {
  return fetchGAS<ExecutiveDashboardData>('', {
    format: 'json',
    action: 'fetch',
    admin: 'true',
    month: month || new Date().toISOString().slice(0, 7),
  });
}

/**
 * Service สำหรับ Mock Data (ใช้สำหรับ development/testing)
 */
export const mockDataService = {
  getPublicDashboard: (month?: string): PublicDashboardData => ({
    lastUpdatedAt: new Date().toISOString(),
    reportMonth: month || new Date().toISOString().slice(0, 7),
    vaccineProgress: {
      state: 'READY',
      district: {
        name: 'อำเภอมายอ',
        totalChildren: 1856,
        coverage: 94.8,
        onSchedule: 1680,
        delayed: 132,
        refused: 44,
        needFollowUp: 176,
      },
      serviceUnits: [
        {
          serviceUnitCode: '09947',
          serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลปะโด',
          reportStatus: 'ส่งครบ',
          coverage: 98.5,
          totalChildren: 145,
          needFollowUp: 2,
          lastUpdated: new Date().toISOString(),
        },
        {
          serviceUnitCode: '09944',
          serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลลางา',
          reportStatus: 'ส่งครบ',
          coverage: 97.2,
          totalChildren: 132,
          needFollowUp: 4,
          lastUpdated: new Date().toISOString(),
        },
        {
          serviceUnitCode: '09951',
          serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลปานัน',
          reportStatus: 'ส่งแต่ยังติดตาม',
          coverage: 89.2,
          totalChildren: 120,
          needFollowUp: 13,
          lastUpdated: new Date().toISOString(),
        },
      ],
    },
    dataQuality: {
      unitsReported: 14,
      totalUnits: 14,
      unitsCompleted: 12,
      unitsNeedFollowUp: 2,
      serviceUnits: [],
    },
  }),

  getExecutiveDashboard: (month?: string): ExecutiveDashboardData => {
    const base = mockDataService.getPublicDashboard(month);
    return {
      ...base,
      executiveView: {
        kpiScores: {
          district: 94.8,
          bestUnit: { code: '09947', name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลปะโด', score: 98.5 },
          needsAttention: { code: '09951', name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลปานัน', score: 89.2 },
        },
        trends: {
          monthOverMonth: 2.3,
          comparedToLastMonth: 42,
        },
        rankings: [
          {
            serviceUnitCode: '09947',
            serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลปะโด',
            reportStatus: 'ส่งครบ',
            coverage: 98.5,
            totalChildren: 145,
            needFollowUp: 2,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09944',
            serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลลางา',
            reportStatus: 'ส่งครบ',
            coverage: 97.2,
            totalChildren: 132,
            needFollowUp: 4,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09949',
            serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลสาคอใต้',
            reportStatus: 'ส่งครบ',
            coverage: 96.8,
            totalChildren: 128,
            needFollowUp: 4,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09943',
            serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลลุโบะยิไร',
            reportStatus: 'ส่งครบ',
            coverage: 96.1,
            totalChildren: 142,
            needFollowUp: 6,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09942',
            serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลกระหวะ',
            reportStatus: 'ส่งครบ',
            coverage: 95.4,
            totalChildren: 138,
            needFollowUp: 6,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09948',
            serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลสาคอบน',
            reportStatus: 'ส่งครบ',
            coverage: 95.1,
            totalChildren: 125,
            needFollowUp: 6,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09945',
            serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลกระเสาะ',
            reportStatus: 'ส่งแต่ยังติดตาม',
            coverage: 94.8,
            totalChildren: 135,
            needFollowUp: 7,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09946',
            serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลเกาะจัน',
            reportStatus: 'ส่งครบ',
            coverage: 94.2,
            totalChildren: 129,
            needFollowUp: 8,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09950',
            serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลสะกำ',
            reportStatus: 'ส่งครบ',
            coverage: 93.7,
            totalChildren: 131,
            needFollowUp: 8,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09941',
            serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลตรัง',
            reportStatus: 'ส่งแต่ยังติดตาม',
            coverage: 92.9,
            totalChildren: 140,
            needFollowUp: 10,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '41083',
            serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านน้ำใส',
            reportStatus: 'ส่งครบ',
            coverage: 91.8,
            totalChildren: 127,
            needFollowUp: 10,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '77483',
            serviceUnitName: 'ศูนย์สุขภาพชุมชนตำบลมายอ',
            reportStatus: 'ส่งครบ',
            coverage: 91.2,
            totalChildren: 124,
            needFollowUp: 11,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09940',
            serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลถนน',
            reportStatus: 'ส่งแต่ยังติดตาม',
            coverage: 90.5,
            totalChildren: 130,
            needFollowUp: 12,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09951',
            serviceUnitName: 'โรงพยาบาลส่งเสริมสุขภาพตำบลปานัน',
            reportStatus: 'ส่งแต่ยังติดตาม',
            coverage: 89.2,
            totalChildren: 120,
            needFollowUp: 13,
            lastUpdated: new Date().toISOString(),
          },
        ],
      },
    };
  },
};

/**
 * Hook สำหรับใช้ GAS API พร้อม fallback mock data
 */
export const useVaccineData = (useMock = true) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const getPublicDashboard = React.useCallback(async (month?: string): Promise<PublicDashboardData> => {
    setLoading(true);
    setError(null);

    try {
      if (useMock) {
        // Fallback to mock data
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockDataService.getPublicDashboard(month);
      }

      if (GAS_WEB_APP_URL.includes('YOUR_GAS_WEB_APP_URL')) {
        return buildNotReadyDashboardData('ยังไม่ได้ตั้งค่าแหล่งข้อมูล Google Apps Script');
      }

      return await fetchPublicDashboard(month);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลได้';
      setError(errorMsg);

      console.warn('API Error, showing not-ready dashboard:', errorMsg);
      return buildNotReadyDashboardData('ไม่สามารถดึงข้อมูลรายเดือนได้');
    } finally {
      setLoading(false);
    }
  }, [useMock]);

  const getExecutiveDashboard = React.useCallback(async (month?: string): Promise<ExecutiveDashboardData> => {
    setLoading(true);
    setError(null);

    try {
      if (useMock || GAS_WEB_APP_URL.includes('YOUR_GAS_WEB_APP_URL')) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockDataService.getExecutiveDashboard(month);
      }

      return await fetchExecutiveDashboard(month);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลได้';
      setError(errorMsg);

      console.warn('API Error, using mock data:', errorMsg);
      return mockDataService.getExecutiveDashboard(month);
    } finally {
      setLoading(false);
    }
  }, [useMock]);

  return {
    loading,
    error,
    getPublicDashboard,
    getExecutiveDashboard,
  };
};
