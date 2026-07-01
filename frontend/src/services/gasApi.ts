/**
 * Service สำหรับเชื่อมต่อกับ Google Apps Script API
 * ดึงข้อมูลวัคซีนรายเดือนจาก GAS Web App
 */

import React from 'react';
import type { PublicDashboardData, ExecutiveDashboardData, AdminLoginResponse, ServiceUnitSettingView } from '@/types/vaccine';
import { buildNotReadyDashboardData } from './dashboardViewModel';

// TODO: ใส่ GAS Web App URL ของคุณที่นี่
const GAS_WEB_APP_URL = import.meta.env.VITE_GAS_WEB_APP_URL || 'YOUR_GAS_WEB_APP_URL_HERE';

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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
 * ดึงข้อมูล Public Dashboard
 */
export async function fetchPublicDashboard(month?: string): Promise<PublicDashboardData> {
  return fetchGAS<PublicDashboardData>('', {
    format: 'json',
    action: 'fetch',
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
          serviceUnitName: 'รพ.สต.มายอ',
          reportStatus: 'ส่งครบ',
          coverage: 98.5,
          totalChildren: 145,
          needFollowUp: 2,
          lastUpdated: new Date().toISOString(),
        },
        {
          serviceUnitCode: '09944',
          serviceUnitName: 'รพ.สต.ท่าแพะ',
          reportStatus: 'ส่งครบ',
          coverage: 97.2,
          totalChildren: 132,
          needFollowUp: 4,
          lastUpdated: new Date().toISOString(),
        },
        {
          serviceUnitCode: '09951',
          serviceUnitName: 'รพ.สต.ป่าโนน',
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
          bestUnit: { code: '09947', name: 'รพ.สต.มายอ', score: 98.5 },
          needsAttention: { code: '09951', name: 'รพ.สต.ป่าโนน', score: 89.2 },
        },
        trends: {
          monthOverMonth: 2.3,
          comparedToLastMonth: 42,
        },
        rankings: [
          {
            serviceUnitCode: '09947',
            serviceUnitName: 'รพ.สต.มายอ',
            reportStatus: 'ส่งครบ',
            coverage: 98.5,
            totalChildren: 145,
            needFollowUp: 2,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09944',
            serviceUnitName: 'รพ.สต.ท่าแพะ',
            reportStatus: 'ส่งครบ',
            coverage: 97.2,
            totalChildren: 132,
            needFollowUp: 4,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09949',
            serviceUnitName: 'รพ.สต.บาตอง',
            reportStatus: 'ส่งครบ',
            coverage: 96.8,
            totalChildren: 128,
            needFollowUp: 4,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09943',
            serviceUnitName: 'รพ.สต.ตะโกะ',
            reportStatus: 'ส่งครบ',
            coverage: 96.1,
            totalChildren: 142,
            needFollowUp: 6,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09942',
            serviceUnitName: 'รพ.สต.ทับปุด',
            reportStatus: 'ส่งครบ',
            coverage: 95.4,
            totalChildren: 138,
            needFollowUp: 6,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09948',
            serviceUnitName: 'รพ.สต.ตะเคิด',
            reportStatus: 'ส่งครบ',
            coverage: 95.1,
            totalChildren: 125,
            needFollowUp: 6,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09945',
            serviceUnitName: 'รพ.สต.ปาโจะ',
            reportStatus: 'ส่งแต่ยังติดตาม',
            coverage: 94.8,
            totalChildren: 135,
            needFollowUp: 7,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09946',
            serviceUnitName: 'รพ.สต.ป่าไก่',
            reportStatus: 'ส่งครบ',
            coverage: 94.2,
            totalChildren: 129,
            needFollowUp: 8,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09950',
            serviceUnitName: 'รพ.สต.ไหล่ป่า',
            reportStatus: 'ส่งครบ',
            coverage: 93.7,
            totalChildren: 131,
            needFollowUp: 8,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09941',
            serviceUnitName: 'รพ.สต.บาตัง',
            reportStatus: 'ส่งแต่ยังติดตาม',
            coverage: 92.9,
            totalChildren: 140,
            needFollowUp: 10,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09952',
            serviceUnitName: 'รพ.สต.ห้วยลาด',
            reportStatus: 'ส่งครบ',
            coverage: 91.8,
            totalChildren: 127,
            needFollowUp: 10,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09954',
            serviceUnitName: 'รพ.สต.โคกโต๊ะ',
            reportStatus: 'ส่งครบ',
            coverage: 91.2,
            totalChildren: 124,
            needFollowUp: 11,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09953',
            serviceUnitName: 'รพ.สต.ท่าลาด',
            reportStatus: 'ส่งแต่ยังติดตาม',
            coverage: 90.5,
            totalChildren: 130,
            needFollowUp: 12,
            lastUpdated: new Date().toISOString(),
          },
          {
            serviceUnitCode: '09951',
            serviceUnitName: 'รพ.สต.ป่าโนน',
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
