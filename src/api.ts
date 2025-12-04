// API Service untuk berinteraksi dengan FastAPI Backend
// Base URL untuk API endpoints (dokumentasi Swagger ada di /docs)
const API_BASE_URL = "https://be-lecturer-recomendation-system.vercel.app";
// Set API_PREFIX ke "/api/v1" sesuai dokumentasi API
const API_PREFIX = "/api/v1";

// Import auth functions
import { getToken } from "./auth";
import type { LoginResponse, User } from "./auth";

// Types untuk API responses
export interface Lecturer {
  id?: number;
  name: string;
  expertise?: string;
  email?: string;
  department?: string;
  bidang_penelitian?: string[];
  publikasi?: Publication[];
  phone?: string;
  [key: string]: any;
}

export interface Publication {
  id?: number;
  title: string;
  journal?: string;
  year?: number;
  author?: string;
  doi?: string;
  [key: string]: any;
}

export interface TopicRequest {
  id?: number;
  dosen_id?: number;
  student_id?: string;
  topic?: string;
  status?: string;
  message?: string;
  [key: string]: any;
}

export interface RecommendationRequest {
  student_id?: string;
  student_name?: string;
  research_topic?: string;
  interests?: string[];
  [key: string]: any;
}

export interface RecommendationResponse {
  recommendations?: Lecturer[];
  message?: string;
  [key: string]: any;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterMahasiswaRequest {
  email: string;
  password: string;
  name: string;
  nim: string; // Required sesuai API
  major: string; // Required sesuai API
  noHp: string; // Required sesuai API, camelCase dengan H kecil
  [key: string]: any;
}

export interface RegisterDosenRequest {
  email: string;
  password: string;
  name: string;
  nidn: string; // Required
  noHP: string; // Required, dengan H besar sesuai API endpoint
  major: string; // Required
  [key: string]: any;
}

// Error handling class
export class ApiError extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth: boolean = false
): Promise<T> {
  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Add authorization token if required
  if (requireAuth) {
    const token = getToken();
    if (token) {
      defaultHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail ||
          errorData.message ||
          `HTTP error! status: ${response.status}`,
        response.status,
        errorData
      );
    }

    // Handle empty responses
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    return {} as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle CORS and network errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    if (
      errorMessage.includes("CORS") ||
      errorMessage.includes("Failed to fetch")
    ) {
      throw new ApiError(
        "CORS Error: Backend tidak mengizinkan request dari origin ini. Pastikan backend sudah dikonfigurasi untuk mengizinkan origin 'http://localhost:5173'.",
        undefined,
        error
      );
    }

    throw new ApiError(`Network error: ${errorMessage}`, undefined, error);
  }
}

// API Functions
export const api = {
  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Endpoint login sesuai dokumentasi: POST /api/v1/user/login
    const loginEndpoint = `${API_PREFIX}/user/login`;

    // FastAPI OAuth2 biasanya menggunakan FormData, bukan JSON
    const formData = new FormData();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);
    // OAuth2 password flow biasanya memerlukan grant_type
    formData.append("grant_type", "password");

    const response = await fetch(`${API_BASE_URL}${loginEndpoint}`, {
      method: "POST",
      body: formData,
      // Jangan set Content-Type header untuk FormData, browser akan set otomatis dengan boundary
    });

    if (!response.ok) {
      let errorData: any = {};
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        errorData = await response.json();

        // Handle berbagai format error response
        if (typeof errorData === "string") {
          errorMessage = errorData;
        } else if (errorData.detail) {
          // FastAPI biasanya mengembalikan {detail: "message"} atau {detail: [{msg: "..."}]}
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail
              .map((err: any) => err.msg || err.message || JSON.stringify(err))
              .join(", ");
          } else if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage =
            typeof errorData.error === "string"
              ? errorData.error
              : JSON.stringify(errorData.error);
        } else if (Object.keys(errorData).length > 0) {
          errorMessage = JSON.stringify(errorData);
        }

        if (response.status === 404) {
          errorMessage = `Endpoint tidak ditemukan. Endpoint yang dicoba: ${loginEndpoint}`;
        }
      } catch (parseError) {
        // Jika response bukan JSON, gunakan status text
        errorMessage = `HTTP ${response.status}: ${
          response.statusText || "Unknown error"
        }`;
      }

      throw new ApiError(errorMessage, response.status, errorData);
    }

    const responseData = await response.json();

    // Debug: log response untuk melihat strukturnya
    console.log("Login response:", responseData);

    return responseData;
  },

  async logout(): Promise<void> {
    return apiRequest<void>(
      "/auth/logout",
      {
        method: "POST",
      },
      true
    );
  },

  // Registration
  async registerMahasiswa(
    data: RegisterMahasiswaRequest
  ): Promise<LoginResponse> {
    const registerEndpoint = `${API_PREFIX}/user/mahasiswa/register`;

    const response = await fetch(`${API_BASE_URL}${registerEndpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorData: any = {};
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        errorData = await response.json();

        if (typeof errorData === "string") {
          errorMessage = errorData;
        } else if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail
              .map((err: any) => err.msg || err.message || JSON.stringify(err))
              .join(", ");
          } else if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage =
            typeof errorData.error === "string"
              ? errorData.error
              : JSON.stringify(errorData.error);
        } else if (Object.keys(errorData).length > 0) {
          errorMessage = JSON.stringify(errorData);
        }
      } catch (parseError) {
        errorMessage = `HTTP ${response.status}: ${
          response.statusText || "Unknown error"
        }`;
      }

      throw new ApiError(errorMessage, response.status, errorData);
    }

    const responseData = await response.json();

    // Debug: log response untuk melihat strukturnya
    console.log("Register mahasiswa response:", responseData);

    return responseData;
  },

  async registerDosen(data: RegisterDosenRequest): Promise<LoginResponse> {
    // Endpoint dosen register: POST /api/v1/user/dosen/register/2H2H/univ
    // Perlu konfirmasi path yang benar, mungkin ada parameter di path
    const registerEndpoint = `${API_PREFIX}/user/dosen/register/2H2H/univ`;

    const response = await fetch(`${API_BASE_URL}${registerEndpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorData: any = {};
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        errorData = await response.json();

        if (typeof errorData === "string") {
          errorMessage = errorData;
        } else if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail
              .map((err: any) => err.msg || err.message || JSON.stringify(err))
              .join(", ");
          } else if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage =
            typeof errorData.error === "string"
              ? errorData.error
              : JSON.stringify(errorData.error);
        } else if (Object.keys(errorData).length > 0) {
          errorMessage = JSON.stringify(errorData);
        }
      } catch (parseError) {
        errorMessage = `HTTP ${response.status}: ${
          response.statusText || "Unknown error"
        }`;
      }

      throw new ApiError(errorMessage, response.status, errorData);
    }

    const responseData = await response.json();

    // Debug: log response untuk melihat strukturnya
    console.log("Register dosen response:", responseData);

    return responseData;
  },

  async getCurrentUser(): Promise<User> {
    return apiRequest<User>("/auth/me", {}, true);
  },

  // Get all lecturers
  async getLecturers(): Promise<Lecturer[]> {
    return apiRequest<Lecturer[]>("/lecturers", {}, true);
  },

  // Get lecturer by ID
  async getLecturerById(id: number): Promise<Lecturer> {
    return apiRequest<Lecturer>(`/lecturers/${id}`, {}, true);
  },

  // Get recommendations
  async getRecommendations(
    data: RecommendationRequest
  ): Promise<RecommendationResponse> {
    return apiRequest<RecommendationResponse>(
      "/recommendations",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      true
    );
  },

  // Search lecturers
  async searchLecturers(query: string): Promise<Lecturer[]> {
    return apiRequest<Lecturer[]>(
      `/lecturers/search?q=${encodeURIComponent(query)}`,
      {},
      true
    );
  },

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return apiRequest<{ status: string }>("/health");
  },

  // Publication endpoints
  async addPublication(data: Partial<Publication>): Promise<Publication> {
    return apiRequest<Publication>(
      "/user/publication/add",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      true
    );
  },

  async getMyPublications(): Promise<Publication[]> {
    return apiRequest<Publication[]>("/user/publication/me", {}, true);
  },

  async getAllPublications(): Promise<Publication[]> {
    return apiRequest<Publication[]>("/user/publication", {}, true);
  },

  async updatePublication(
    publicationId: number,
    data: Partial<Publication>
  ): Promise<Publication> {
    return apiRequest<Publication>(
      `/user/publication/${publicationId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      true
    );
  },

  async deletePublication(publicationId: number): Promise<void> {
    return apiRequest<void>(
      `/user/publication/${publicationId}`,
      {
        method: "DELETE",
      },
      true
    );
  },

  // Topic endpoints
  async getTopicRecommendations(): Promise<Lecturer[]> {
    return apiRequest<Lecturer[]>("/topic/recomendation", {}, true);
  },

  async requestTopic(
    dosenId: number,
    data: { topic?: string; message?: string }
  ): Promise<TopicRequest> {
    return apiRequest<TopicRequest>(
      `/topic/${dosenId}/request`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      true
    );
  },

  async getMyTopicRequests(): Promise<TopicRequest[]> {
    return apiRequest<TopicRequest[]>("/topic/request/me", {}, true);
  },

  async acceptTopicRequest(requestId: number): Promise<TopicRequest> {
    return apiRequest<TopicRequest>(
      `/topic/request/${requestId}/accept`,
      {
        method: "POST",
      },
      true
    );
  },

  async rejectTopicRequest(requestId: number): Promise<TopicRequest> {
    return apiRequest<TopicRequest>(
      `/topic/request/${requestId}/reject`,
      {
        method: "POST",
      },
      true
    );
  },
};
