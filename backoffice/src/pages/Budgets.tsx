import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { budgetService, Budget, BudgetItem } from '../services/api';
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  FileText,
  Calculator,
  TrendingUp,
  Eye,
  Download,
  Send
} from 'lucide-react';

const BudgetsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadBudgets();
  }, [statusFilter]);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const budgetsData = await budgetService.getBudgets(statusFilter ? { status: statusFilter } : {});
      setBudgets(budgetsData);
    } catch (error) {
      console.error('Error loading budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async (budgetData: {
    title: string;
    client_name: string;
    client_dni?: string;
    project_description?: string;
    items: Array<{
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }) => {
    try {
      await budgetService.createBudget(budgetData);
      await loadBudgets();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating budget:', error);
    }
  };

  const handleUpdateBudget = async (id: number, budgetData: Partial<Budget>) => {
    try {
      await budgetService.updateBudget(id, budgetData);
      await loadBudgets();
    } catch (error) {
      console.error('Error updating budget:', error);
    }
  };

  const handleDeleteBudget = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) {
      try {
        await budgetService.deleteBudget(id);
        await loadBudgets();
      } catch (error) {
        console.error('Error deleting budget:', error);
      }
    }
  };

  const filteredBudgets = budgets.filter(budget =>
    budget.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    budget.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    budget.project_description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'BORRADOR':
        return <FileText className="w-4 h-4 text-gray-500" />;
      case 'ENVIADO':
        return <Send className="w-4 h-4 text-blue-500" />;
      case 'ACEPTADO':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'RECHAZADO':
        return <FileText className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BORRADOR':
        return 'bg-gray-100 text-gray-700';
      case 'ENVIADO':
        return 'bg-blue-100 text-blue-700';
      case 'ACEPTADO':
        return 'bg-green-100 text-green-700';
      case 'RECHAZADO':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Presupuestos</h1>
          <p className="text-gray-600 mt-1">Gestión de presupuestos y cotizaciones</p>
        </div>
        {(currentUser?.role === 'DIOS' || currentUser?.role === 'ENCARGADO') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo Presupuesto
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar presupuestos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="BORRADOR">Borrador</option>
            <option value="ENVIADO">Enviado</option>
            <option value="ACEPTADO">Aceptado</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
        </div>
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBudgets.map((budget) => (
          <div key={budget.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(budget.status)}
                <h3 className="font-semibold text-gray-900">{budget.title}</h3>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(budget.status)}`}>
                {budget.status}
              </div>
            </div>

            {/* Client Info */}
            <div className="space-y-2 mb-4">
              <div className="text-sm">
                <span className="text-gray-500">Cliente:</span>
                <span className="ml-2 font-medium text-gray-900">{budget.client_name}</span>
              </div>
              {budget.client_dni && (
                <div className="text-sm">
                  <span className="text-gray-500">DNI:</span>
                  <span className="ml-2 text-gray-900">{budget.client_dni}</span>
                </div>
              )}
              {budget.project_description && (
                <div className="text-sm text-gray-600 line-clamp-2">
                  {budget.project_description}
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="border-t border-gray-200 pt-4 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(budget.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">IVA ({budget.iva_rate}%):</span>
                  <span className="font-medium">{formatCurrency(budget.iva_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">IRPF ({budget.irpf_rate}%):</span>
                  <span className="font-medium">-{formatCurrency(budget.irpf_amount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatCurrency(budget.total)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedBudget(budget);
                  setShowDetailsModal(true);
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
              >
                <Eye className="w-4 h-4" />
                Ver detalles
              </button>
              
              {(currentUser?.role === 'DIOS' || currentUser?.role === 'ENCARGADO') && (
                <div className="flex items-center gap-2">
                  {budget.status === 'BORRADOR' && (
                    <button
                      onClick={() => handleUpdateBudget(budget.id, { status: 'ENVIADO' })}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Enviar
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteBudget(budget.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredBudgets.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay presupuestos</h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter ? 'No hay presupuestos que coincidan con los filtros' : 'Crea tu primer presupuesto para comenzar'}
          </p>
        </div>
      )}

      {/* Create Budget Modal */}
      {showCreateModal && (
        <CreateBudgetModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateBudget}
        />
      )}

      {/* Budget Details Modal */}
      {showDetailsModal && selectedBudget && (
        <BudgetDetailsModal
          budget={selectedBudget}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </div>
  );
};

// Create Budget Modal Component
interface CreateBudgetModalProps {
  onClose: () => void;
  onCreate: (budgetData: {
    title: string;
    client_name: string;
    client_dni?: string;
    project_description?: string;
    items: Array<{
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }) => void;
}

const CreateBudgetModal: React.FC<CreateBudgetModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    title: '',
    client_name: '',
    client_dni: '',
    project_description: '',
    items: [{ description: '', quantity: 1, unit_price: 0 }]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit_price: 0 }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, items: updatedItems });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onCreate(formData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear presupuesto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Crear Nuevo Presupuesto</h2>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título del presupuesto *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del cliente *
              </label>
              <input
                type="text"
                required
                value={formData.client_name}
                onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DNI del cliente
              </label>
              <input
                type="text"
                value={formData.client_dni}
                onChange={(e) => setFormData({...formData, client_dni: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtotal
              </label>
              <input
                type="text"
                value={new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(calculateSubtotal())}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción del proyecto
            </label>
            <textarea
              rows={3}
              value={formData.project_description}
              onChange={(e) => setFormData({...formData, project_description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Conceptos del presupuesto
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Añadir concepto
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Descripción"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      placeholder="Cantidad"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      placeholder="Precio"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Presupuesto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Budget Details Modal Component
interface BudgetDetailsModalProps {
  budget: Budget;
  onClose: () => void;
}

const BudgetDetailsModal: React.FC<BudgetDetailsModalProps> = ({ budget, onClose }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Detalles del Presupuesto</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">{budget.title}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Cliente:</span>
                <span className="ml-2 font-medium">{budget.client_name}</span>
              </div>
              <div>
                <span className="text-gray-500">Estado:</span>
                <span className="ml-2 font-medium">{budget.status}</span>
              </div>
              {budget.client_dni && (
                <div>
                  <span className="text-gray-500">DNI:</span>
                  <span className="ml-2">{budget.client_dni}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Creado por:</span>
                <span className="ml-2">{budget.created_name || 'N/A'}</span>
              </div>
            </div>
          </div>

          {budget.project_description && (
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Descripción del proyecto</h4>
              <p className="text-gray-600">{budget.project_description}</p>
            </div>
          )}

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Resumen financiero</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal:</span>
                <span className="font-medium">{formatCurrency(budget.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IVA ({budget.iva_rate}%):</span>
                <span className="font-medium">{formatCurrency(budget.iva_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IRPF ({budget.irpf_rate}%):</span>
                <span className="font-medium">-{formatCurrency(budget.irpf_amount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                <span>Total:</span>
                <span>{formatCurrency(budget.total)}</span>
              </div>
            </div>
          </div>

          {budget.items && budget.items.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Conceptos</h4>
              <div className="space-y-2">
                {budget.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{item.description}</div>
                      <div className="text-sm text-gray-500">
                        {item.quantity} × {formatCurrency(item.unit_price)}
                      </div>
                    </div>
                    <div className="font-medium">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetsPage;
