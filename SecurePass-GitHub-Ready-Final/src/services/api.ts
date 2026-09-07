const API_BASE = '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  [key: string]: any;
}

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('securepass_token');
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({
      success: false,
      message: 'Failed to parse server response.',
    }));

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/verify-mfa')) {
        // Token is invalid or expired
        localStorage.removeItem('securepass_token');
        localStorage.removeItem('securepass_user');
        window.dispatchEvent(new Event('securepass_auth_expired'));
      }
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  }

  // Auth endpoints
  async register(body: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async login(body: any) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async verifyMfa(body: any) {
    return this.request('/auth/verify-mfa', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyRecovery(body: any) {
    return this.request('/auth/verify-recovery', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async resetPassword(body: any) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Vault endpoints
  async getVaultItems() {
    return this.request('/vault');
  }

  async getVaultItem(id: string) {
    return this.request(`/vault/${id}`);
  }

  async createVaultItem(body: any) {
    return this.request('/vault', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateVaultItem(id: string, body: any) {
    return this.request(`/vault/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async deleteVaultItem(id: string) {
    return this.request(`/vault/${id}`, {
      method: 'DELETE',
    });
  }

  async getVaultAnalysis() {
    return this.request('/vault/analysis');
  }

  // Password utilities
  async checkStrength(password: string) {
    return this.request('/password/check-strength', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async generatePassword(options: any = {}) {
    return this.request('/password/generate', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // MFA endpoints
  async setupMfa() {
    return this.request('/mfa/setup', {
      method: 'POST',
    });
  }

  async verifyAndEnableMfa(token: string) {
    return this.request('/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async disableMfa(passwordConfirm: string) {
    return this.request('/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ passwordConfirm }),
    });
  }

  async testMfa(code: string, isRecoveryCode: boolean = false) {
    return this.request('/mfa/test', {
      method: 'POST',
      body: JSON.stringify({ code, isRecoveryCode }),
    });
  }

  // Security & Recovery endpoints
  async getRecoveryCodesCount() {
    return this.request('/security/recovery-codes');
  }

  async regenerateRecoveryCodes(passwordConfirm: string) {
    return this.request('/security/recovery-codes/regenerate', {
      method: 'POST',
      body: JSON.stringify({ passwordConfirm }),
    });
  }

  async getSecurityEvents() {
    return this.request('/security/events');
  }

  async getActiveSessions() {
    return this.request('/security/sessions');
  }

  async logoutAllDevices() {
    return this.request('/security/logout-all', {
      method: 'POST',
    });
  }

  async changePassword(body: any) {
    return this.request('/security/change-password', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async deleteAccount(passwordConfirm: string) {
    return this.request('/security/account', {
      method: 'DELETE',
      body: JSON.stringify({ passwordConfirm }),
    });
  }
}

export const api = new ApiService();
