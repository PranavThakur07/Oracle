import axios from 'axios';

const getApiBaseUrl = () => {
  return localStorage.getItem('oracle_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
};

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request interceptor to add JWT token to headers and set dynamic baseURL
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem('oracle_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle unauthorized access
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('oracle_token');
      // Redirect to login only if not already there to prevent infinite loops
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// --- API Service Envelopes ---

export interface DecisionContext {
  age?: string;
  current_salary?: string;
  budget?: string;
  country?: string;
  career_goals?: string;
  risk_appetite?: string;
  time_horizon?: string;
}

export interface ScenarioMilestone {
  year: string;
  title: string;
  description: string;
}

export interface Scenario {
  id: string;
  title: string;
  summary: string;
  timeline: ScenarioMilestone[];
  pros: string[];
  cons: string[];
  risks: string[];
  estimated_costs: string;
  expected_benefits: string;
  skills_required: string[];
  opportunity_cost: string;
  confidence_level: number;
  reasoning: string;
  next_steps: string[];
}

export interface SimulationResponse {
  scenarios: Scenario[];
  assumptions: string[];
  disclaimer: string;
  recommendations: Record<string, string>;
  comparison_metrics: Record<string, Record<string, number>>;
}

export interface Decision {
  id: number;
  query: string;
  context: DecisionContext;
  response_json: SimulationResponse;
  is_favorite: boolean;
  created_at: string;
}

export interface FollowUpResponse {
  response_text: string;
  updated_scenarios?: Scenario[] | null;
  updated_comparison_metrics?: Record<string, Record<string, number>> | null;
  updated_recommendations?: Record<string, string> | null;
}

export interface FollowUp {
  id: number;
  query: string;
  response_json: FollowUpResponse;
  created_at: string;
}

export interface DecisionDetails extends Decision {
  follow_ups: FollowUp[];
}

export const authService = {
  async register(email: string, password: string, name?: string) {
    const response = await api.post<{ access_token: string; token_type: string }>('/auth/register', { email, password, name });
    localStorage.setItem('oracle_token', response.data.access_token);
    return response.data;
  },

  async login(email: string, password: string) {
    const response = await api.post<{ access_token: string; token_type: string }>('/auth/login', { email, password });
    localStorage.setItem('oracle_token', response.data.access_token);
    return response.data;
  },

  async googleLogin(token: string) {
    const response = await api.post<{ access_token: string; token_type: string }>('/auth/google', { token });
    localStorage.setItem('oracle_token', response.data.access_token);
    return response.data;
  },

  async getMe() {
    const response = await api.get<{ id: number; email: string; name?: string; created_at: string }>('/auth/me');
    return response.data;
  },

  async getConfig() {
    const response = await api.get<{ google_client_id: string | null }>('/auth/config');
    return response.data;
  },

  logout() {
    localStorage.removeItem('oracle_token');
  },

  isAuthenticated() {
    return !!localStorage.getItem('oracle_token');
  }
};

export const decisionService = {
  async analyze(query: string, context: DecisionContext) {
    const response = await api.post<Decision>('/analyze', { query, context });
    return response.data;
  },

  async getHistory(search?: string, favorite?: boolean) {
    const params: Record<string, any> = {};
    if (search) params.search = search;
    if (favorite !== undefined) params.favorite = favorite;
    const response = await api.get<Decision[]>('/history', { params });
    return response.data;
  },

  async getDetails(id: number) {
    const response = await api.get<DecisionDetails>(`/history/${id}`);
    return response.data;
  },

  async toggleFavorite(id: number) {
    const response = await api.put<Decision>(`/history/${id}/favorite`);
    return response.data;
  },

  async deleteDecision(id: number) {
    await api.delete(`/history/${id}`);
  },

  async addFollowUp(id: number, query: string) {
    const response = await api.post<FollowUp>(`/history/${id}/followup`, { query });
    return response.data;
  },

  getExportPdfUrl(id: number) {
    const token = localStorage.getItem('oracle_token');
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/history/${id}/export?token=${token}`;
  },

  async downloadPdfDirect(id: number, filename = 'oracle_report.pdf') {
    const response = await api.get(`/history/${id}/export`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(link.href);
  }
};
