import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { taskService, userService, budgetService, photoService } from '../services/api';
import { Task, User, Budget, Photo } from '../services/api';
import { 
  CheckSquare, 
  Users, 
  FileText, 
  Camera, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface DashboardStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  totalUsers: number;
  totalBudgets: number;
  totalPhotos: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    totalUsers: 0,
    totalBudgets: 0,
    totalPhotos: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // Cargar estadísticas
        const [tasks, users, budgets, photos] = await Promise.all([
          taskService.getTasks({ limit: 1000 }),
          user?.role === 'DIOS' ? userService.getUsers() : [],
          user?.role === 'DIOS' ? budgetService.getBudgets({ limit: 1000 }) : [],
          photoService.getPhotos({ limit: 1000 })
        ]);

        // Calcular estadísticas de tareas
        const taskStats = tasks.reduce((acc, task) => {
          acc.totalTasks++;
          switch (task.status) {
            case 'PENDIENTE':
              acc.pendingTasks++;
              break;
            case 'EN_PROGRESO':
              acc.inProgressTasks++;
              break;
            case 'FINALIZADA':
              acc.completedTasks++;
              break;
          }
          return acc;
        }, {
          totalTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          completedTasks: 0,
        });

        setStats({
          ...taskStats,
          totalUsers: users.length,
          totalBudgets: budgets.length,
          totalPhotos: photos.length,
        });

        // Cargar tareas recientes
        setRecentTasks(tasks.slice(0, 5));

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    bgColor: string;
  }> = ({ title, value, icon: Icon, color, bgColor }) => (
    <div className={`${bgColor} rounded-xl p-6 border border-gray-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const getStatusIcon = () => {
      switch (task.status) {
        case 'PENDIENTE':
          return <Clock className="w-4 h-4 text-yellow-500" />;
        case 'EN_PROGRESO':
          return <AlertCircle className="w-4 h-4 text-blue-500" />;
        case 'FINALIZADA':
          return <CheckCircle className="w-4 h-4 text-green-500" />;
      }
    };

    const getPriorityColor = () => {
      switch (task.priority) {
        case 'BAJA':
          return 'bg-gray-100 text-gray-700';
        case 'MEDIA':
          return 'bg-blue-100 text-blue-700';
        case 'ALTA':
          return 'bg-orange-100 text-orange-700';
        case 'URGENTE':
          return 'bg-red-100 text-red-700';
      }
    };

    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon()}
              <h3 className="font-medium text-gray-900">{task.title}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-1 rounded-full ${getPriorityColor()}`}>
                {task.priority}
              </span>
              <span className="text-gray-500">
                {task.assigned_name || 'Sin asignar'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Bienvenido, {user?.name}. Aquí tienes un resumen de tu actividad.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tareas"
          value={stats.totalTasks}
          icon={CheckSquare}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Pendientes"
          value={stats.pendingTasks}
          icon={Clock}
          color="text-yellow-600"
          bgColor="bg-yellow-50"
        />
        <StatCard
          title="En Progreso"
          value={stats.inProgressTasks}
          icon={TrendingUp}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Completadas"
          value={stats.completedTasks}
          icon={CheckCircle}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        
        {user?.role === 'DIOS' && (
          <>
            <StatCard
              title="Usuarios"
              value={stats.totalUsers}
              icon={Users}
              color="text-purple-600"
              bgColor="bg-purple-50"
            />
            <StatCard
              title="Presupuestos"
              value={stats.totalBudgets}
              icon={FileText}
              color="text-indigo-600"
              bgColor="bg-indigo-50"
            />
          </>
        )}
        
        <StatCard
          title="Fotos"
          value={stats.totalPhotos}
          icon={Camera}
          color="text-pink-600"
          bgColor="bg-pink-50"
        />
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tareas Recientes</h2>
        </div>
        <div className="p-6">
          {recentTasks.length > 0 ? (
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay tareas recientes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
