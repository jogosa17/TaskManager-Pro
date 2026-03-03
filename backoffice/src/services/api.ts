import axios from 'axios';

const API_BASE_URL = '/api';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Tipos TypeScript
export interface User {
  id: number;
  name: string;
  email: string;
  dni: string;
  username: string;
  password: string;
  role: 'DIOS' | 'ENCARGADO' | 'TRABAJADOR';
  active: boolean;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'PENDIENTE' | 'EN_PROGRESO' | 'FINALIZADA';
  priority: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  due_date?: string;
  assigned_to?: number;
  created_by: number;
  project_name?: string;
  location?: string;
  assigned_name?: string;
  created_name?: string;
  created_at: string;
}

export interface Budget {
  id: number;
  title: string;
  client_name: string;
  client_dni?: string;
  project_description?: string;
  subtotal: number;
  iva_rate: number;
  iva_amount: number;
  irpf_rate: number;
  irpf_amount: number;
  total: number;
  status: 'BORRADOR' | 'ENVIADO' | 'ACEPTADO' | 'RECHAZADO';
  created_by: number;
  created_name?: string;
  items?: BudgetItem[];
  created_at: string;
}

export interface BudgetItem {
  id: number;
  budget_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Photo {
  id: number;
  url: string;
  task_id?: number;
  budget_id?: number;
  description?: string;
  uploaded_by: number;
  uploaded_name?: string;
  file_size: number;
  created_at: string;
}

// Servicios de autenticación
export const authService = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  refreshToken: async (): Promise<{ token: string }> => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },
};

// Servicios de usuarios
export const userService = {
  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
  },
  
  getUser: async (id: number): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  createUser: async (userData: {
    name: string;
    email: string;
    dni: string;
    role: 'ENCARGADO' | 'TRABAJADOR';
  }): Promise<User & { password: string; message: string }> => {
    return api.post('/users', userData);
  },
  
  updateUser: async (id: number, userData: Partial<User>): Promise<{ message: string }> => {
    return api.put(`/users/${id}`, userData);
  },
  
  deleteUser: async (id: number): Promise<{ message: string }> => {
    return api.delete(`/users/${id}`);
  },
};

// Servicios de tareas
export const taskService = {
  getTasks: async (filters?: {
    status?: string;
    assigned_to?: number;
    project_name?: string;
    limit?: number;
    offset?: number;
  }): Promise<Task[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    const response = await api.get(`/tasks?${params}`);
    return response.data;
  },
  
  getTask: async (id: number): Promise<Task> => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },
  
  createTask: async (taskData: {
    title: string;
    description?: string;
    priority?: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
    due_date?: string;
    assigned_to?: number;
    project_name?: string;
    location?: string;
  }): Promise<Task & { message: string }> => {
    return api.post('/tasks', taskData);
  },
  
  updateTask: async (id: number, taskData: Partial<Task>): Promise<{ message: string }> => {
    return api.put(`/tasks/${id}`, taskData);
  },
  
  deleteTask: async (id: number): Promise<{ message: string }> => {
    return api.delete(`/tasks/${id}`);
  },
};

// Servicios de presupuestos
export const budgetService = {
  getBudgets: async (filters?: {
    status?: string;
    client_name?: string;
    limit?: number;
    offset?: number;
  }): Promise<Budget[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    const response = await api.get(`/budgets?${params}`);
    return response.data;
  },
  
  getBudget: async (id: number): Promise<Budget> => {
    const response = await api.get(`/budgets/${id}`);
    return response.data;
  },
  
  createBudget: async (budgetData: {
    title: string;
    client_name: string;
    client_dni?: string;
    project_description?: string;
    iva_rate?: number;
    irpf_rate?: number;
    items?: Array<{
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }): Promise<Budget & { message: string }> => {
    return api.post('/budgets', budgetData);
  },
  
  updateBudget: async (id: number, budgetData: Partial<Budget>): Promise<{ message: string }> => {
    return api.put(`/budgets/${id}`, budgetData);
  },
  
  deleteBudget: async (id: number): Promise<{ message: string }> => {
    return api.delete(`/budgets/${id}`);
  },
  
  addBudgetItem: async (budgetId: number, itemData: {
    description: string;
    quantity: number;
    unit_price: number;
  }): Promise<BudgetItem & { message: string }> => {
    return api.post(`/budgets/${budgetId}/items`, itemData);
  },
};

// Servicios de fotos
export const photoService = {
  getPhotos: async (filters?: {
    task_id?: number;
    budget_id?: number;
    uploaded_by?: number;
    limit?: number;
    offset?: number;
  }): Promise<Photo[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    const response = await api.get(`/photos?${params}`);
    return response.data;
  },
  
  getPhoto: async (id: number): Promise<Photo> => {
    const response = await api.get(`/photos/${id}`);
    return response.data;
  },
  
  uploadPhoto: async (formData: FormData): Promise<Photo & { message: string }> => {
    return api.post('/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  deletePhoto: async (id: number): Promise<{ message: string }> => {
    return api.delete(`/photos/${id}`);
  },
  
  getTaskPhotos: async (taskId: number): Promise<Photo[]> => {
    const response = await api.get(`/photos/task/${taskId}`);
    return response.data;
  },
  
  getBudgetPhotos: async (budgetId: number): Promise<Photo[]> => {
    const response = await api.get(`/photos/budget/${budgetId}`);
    return response.data;
  },
};

export default api;
